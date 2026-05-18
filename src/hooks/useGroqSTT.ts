import { useCallback, useEffect, useRef, useState } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { useWebLLM } from "./useWebLLM";
import { useApiKey } from "./useSessionStore";
import { groqTranscribe } from "@/server/groq.functions";
import type { WhisperLoadProgress, UseWhisperResult } from "./useWhisperSTT";

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
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");
  
  const updateTranscript = useCallback((text: string) => {
    setTranscript((prev) => {
      const next = prev ? prev + " " + text : text;
      transcriptRef.current = next;
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
  const chunkQueueRef = useRef<Float32Array[]>([]);
  const processingRef = useRef(false);
  const stoppedRef = useRef(false);

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
        const audio = chunkQueueRef.current.shift()!;
        try {
          if (audio.length < 16000 * 0.8) {
            console.log("[Groq STT] Chunk too short, skipping:", audio.length, "samples");
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
            continue;
          }
          let text = (out.text || "").trim();
          console.log("[Groq STT] Result:", JSON.stringify(text));
          if (text) {
             if (llmRef.current.isReady) {
               text = await llmRef.current.fixTranscript(text);
             }
             updateTranscript(text);
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
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
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
    stoppedRef.current = false;

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
    } catch {
      setError("Microphone access was blocked. Allow it in your browser to begin.");
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
        onSpeechEnd: (audio: Float32Array) => {
          if (stoppedRef.current) return;
          chunkQueueRef.current.push(audio);
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
  };
}
