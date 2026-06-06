import { useCallback, useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { useWebLLM } from "./useWebLLM";
import { useApiKey } from "./useSessionStore";
import { groqTranscribe } from "@/server/groq.functions";
import type { WhisperLoadProgress, UseWhisperResult } from "./useWhisperSTT";
import type { TranscriptChunk } from "./useTranscriber";

function float32ToWavBase64(audio: Float32Array, sampleRate = 16000): string {
  const buffer = new ArrayBuffer(44 + audio.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + audio.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true); // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16)
  writeString(36, 'data');
  view.setUint32(40, audio.length * 2, true);

  let offset = 44;
  for (let i = 0; i < audio.length; i++) {
    let s = Math.max(-1, Math.min(1, audio[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useGroqSTT(): UseWhisperResult {
  const { apiKey } = useApiKey();
  const apiKeyRef = useRef(apiKey);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

  const llm = useWebLLM();
  const llmRef = useRef(llm);
  useEffect(() => { llmRef.current = llm; }, [llm]);

  const [listening, setListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const chunksRef = useRef<TranscriptChunk[]>([]);

  const updateTranscript = useCallback((text: string) => {
    setTranscript((prev) => {
      const next = prev ? prev + " " + text : text;
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const updateChunk = useCallback((id: string, updates: Partial<TranscriptChunk>) => {
    setChunks((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      chunksRef.current = next;
      return next;
    });
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [loadStatus, setLoadStatus] = useState<WhisperLoadProgress>({
    status: "ready",
    progress: 1,
    message: "Groq API Ready",
  });

  const vadRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunkQueueRef = useRef<{ audio: Float32Array; chunkId: string }[]>([]);
  const processingRef = useRef(false);
  const stoppedRef = useRef(false);
  const activeGhostIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeGhostIdRef = useRef<string | null>(null);
  const isSpeakingRealtimeRef = useRef(false);

  const supported = typeof window !== "undefined" && !!window.MediaRecorder && !!navigator.mediaDevices;

  const tickLevel = useCallback(() => {
    const a = analyserRef.current;
    if (!a) return;
    const data = new Uint8Array(a.frequencyBinCount);
    a.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3));
    rafRef.current = requestAnimationFrame(tickLevel);
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (chunkQueueRef.current.length > 0) {
        const { audio, chunkId } = chunkQueueRef.current.shift()!;
        try {
          if (audio.length < 16000 * 0.8) {
            console.log("[Groq STT] Chunk too short, skipping:", audio.length, "samples");
            setChunks((prev) => {
              const next = prev.filter(c => c.id !== chunkId);
              chunksRef.current = next;
              return next;
            });
            continue;
          }
          console.log("[Groq STT] Transcribing chunk:", audio.length, "samples (~" + (audio.length / 16000).toFixed(1) + "s)");
          const base64 = float32ToWavBase64(audio);
          const out = await groqTranscribe({
            data: {
              audioBase64: base64,
              apiKeyOverride: apiKeyRef.current || undefined,
            },
          });
          if (!out.ok) {
            console.error("[Groq STT] API Error:", out.error);
            setChunks((prev) => {
              const next = prev.filter(c => c.id !== chunkId);
              chunksRef.current = next;
              return next;
            });
            continue;
          }
          let text = (out.text || "").trim();
          console.log("[Groq STT] Result:", JSON.stringify(text));
          if (text) {
             if (llmRef.current.isReady) {
               text = await llmRef.current.fixTranscript(text);
             }
             
             const words = text.split(/\s+/);
             updateChunk(chunkId, {
               status: 'arriving',
               words,
               arrivedAt: Date.now()
             });
             
             setTimeout(() => {
               updateChunk(chunkId, { status: 'confirmed' });
             }, words.length * 60);

             updateTranscript(text);
          } else {
             updateChunk(chunkId, { status: 'confirmed', words: [] });
          }
        } catch (e: any) {
          console.error("[Groq STT] Transcription error:", e?.message || e);
        }
      }
    } finally {
      processingRef.current = false;
      if (chunkQueueRef.current.length > 0) {
        processQueue();
      }
    }
  }, []);

  const preload = useCallback(async () => {
    setLoadStatus({ status: "ready", progress: 1, message: "Groq API Ready" });
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    stoppedRef.current = true;
    
    // Give VAD a short grace period to detect end of speech if user just stopped talking
    await new Promise((r) => setTimeout(r, 600));

    // Wait for ongoing transcription to finish
    while (processingRef.current || chunkQueueRef.current.length > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }

    try { vadRef.current?.pause(); vadRef.current?.destroy(); } catch {}
    vadRef.current = null;
    if (activeGhostIntervalRef.current) clearInterval(activeGhostIntervalRef.current);
    activeGhostIntervalRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setIsVoiceActive(false);
    setLevel(0);
    
    return transcriptRef.current;
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Audio recording isn't supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    setChunks([]);
    chunksRef.current = [];
    stoppedRef.current = false;
    if (activeGhostIntervalRef.current) clearInterval(activeGhostIntervalRef.current);
    activeGhostIntervalRef.current = null;
    activeGhostIdRef.current = null;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Microphone access was blocked. Allow it in your browser to begin.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("No microphone found. Please connect a microphone and try again.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Microphone is already in use by another application or cannot be accessed.");
      } else {
        setError("Microphone error: " + (err?.message || err?.name || "unknown error"));
      }
      return;
    }
    streamRef.current = stream;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    analyserRef.current = analyser;
    rafRef.current = requestAnimationFrame(tickLevel);

    try {
      const vad = await MicVAD.new({
        stream,
        modelURL: "/silero_vad_legacy.onnx",
        workletURL: "/vad.worklet.bundle.min.js",
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.1/dist/",
        onFrameProcessed: (probs: any) => {
          isSpeakingRealtimeRef.current = probs.isSpeech > 0.5;
        },
        onSpeechStart: () => {
          setIsVoiceActive(true);
          isSpeakingRealtimeRef.current = true;
          
          const chunkId = crypto.randomUUID();
          activeGhostIdRef.current = chunkId;
          
          const newChunk: TranscriptChunk = {
            id: chunkId,
            status: 'ghost',
            ghostText: '█'.repeat(Math.floor(Math.random() * 4) + 3),
            words: [],
            createdAt: Date.now()
          };
          
          setChunks((prev) => {
            const next = [...prev, newChunk];
            chunksRef.current = next;
            return next;
          });

          // Grow the ghost block while they are speaking (approx 2.5 words/sec -> 1 word every 400ms)
          if (activeGhostIntervalRef.current) clearInterval(activeGhostIntervalRef.current);
          activeGhostIntervalRef.current = setInterval(() => {
            if (!isSpeakingRealtimeRef.current) return; // Pause growth if they pause speaking
            
            setChunks(prev => {
              const next = [...prev];
              const idx = next.findIndex(c => c.id === chunkId);
              if (idx !== -1) {
                 const word = '█'.repeat(Math.floor(Math.random() * 4) + 3);
                 next[idx] = { ...next[idx], ghostText: next[idx].ghostText + ' ' + word };
                 chunksRef.current = next;
              }
              return next;
            });
          }, 400);
        },
        onSpeechEnd: (audio: Float32Array) => {
          setIsVoiceActive(false);
          if (activeGhostIntervalRef.current) {
            clearInterval(activeGhostIntervalRef.current);
            activeGhostIntervalRef.current = null;
          }
          if (stoppedRef.current) return;
          
          const chunkId = activeGhostIdRef.current;
          activeGhostIdRef.current = null;
          
          const durationSec = audio.length / 16000;
          const estimatedWords = Math.max(3, Math.min(Math.round(durationSec * 2.4), 22));
          const finalGhostText = Array.from({ length: estimatedWords }, () =>
            '█'.repeat(Math.floor(Math.random() * 4) + 3)
          ).join(' ');

          if (chunkId) {
            updateChunk(chunkId, { ghostText: finalGhostText });
            
            setTimeout(() => {
              const currentChunk = chunksRef.current.find(c => c.id === chunkId);
              if (currentChunk && currentChunk.status === 'ghost') {
                updateChunk(chunkId, { status: 'stale-ghost' });
              }
            }, 4000);

            chunkQueueRef.current.push({ audio, chunkId });
          }
          processQueue();
        },
      });
      vad.start();
      vadRef.current = vad;
      setListening(true);
    } catch (e: any) {
      setError("VAD initialization failed: " + (e?.message || "unknown error"));
    }
  }, [supported, tickLevel, processQueue]);

  const reset = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
    setChunks([]);
    chunksRef.current = [];
  }, []);

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    listening,
    transcript,
    interim: "",
    error,
    level,
    loadStatus,
    start,
    stop,
    reset,
    preload,
    chunks,
    isVoiceActive,
  };
}
