// Whisper STT via @huggingface/transformers (WASM/WebGPU). Streams audio chunks
// from MediaRecorder, transcribes with onnxruntime-web. First run downloads the
// model (~40-80MB) and caches it in the browser via the Cache API.
import { useCallback, useEffect, useRef, useState } from "react";
import type { WhisperModelId } from "./useSessionStore";
import { MicVAD } from "@ricky0123/vad-web";
import { useWebLLM } from "./useWebLLM";

type Pipeline = any;

let cachedPipeline: { id: WhisperModelId; p: Pipeline } | null = null;
let loadingPromise: Promise<Pipeline> | null = null;

const MODEL_MAP: Record<WhisperModelId, string> = {
  tiny: "Xenova/whisper-base.en",
  base: "Xenova/whisper-base.en",
  "distil-small": "Xenova/whisper-base.en", // distil-small has ONNX compat issues; base is similar size and reliable
};

export interface WhisperLoadProgress {
  status: "idle" | "downloading" | "ready" | "error";
  progress: number; // 0..1 best-effort
  message: string;
}

const progressCallback = (onProgress?: (p: WhisperLoadProgress) => void) => (info: any) => {
  if (info?.status === "progress") {
    onProgress?.({
      status: "downloading",
      progress: typeof info.progress === "number" ? info.progress / 100 : 0,
      message: `Downloading ${info.file ?? "model"}…`,
    });
  } else if (info?.status === "done" || info?.status === "ready") {
    onProgress?.({ status: "ready", progress: 1, message: "Ready" });
  }
};

export async function loadWhisper(
  modelId: WhisperModelId,
  onProgress?: (p: WhisperLoadProgress) => void,
): Promise<Pipeline> {
  if (cachedPipeline && cachedPipeline.id === modelId) return cachedPipeline.p;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    onProgress?.({ status: "downloading", progress: 0, message: "Loading runtime…" });
    const { pipeline, env } = await import("@huggingface/transformers");
    // Allow remote model download, disable local file lookups (we're in-browser)
    env.allowLocalModels = false;
    env.allowRemoteModels = true;

    const repo = MODEL_MAP[modelId];

    // Try WebGPU with q4f16 first (smallest + GPU-accelerated), then WASM with quantized
    let device: any = "wasm";
    let dtype: any = "q8";

    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = "webgpu";
          // q4f16 is specifically exported for WebGPU in Xenova repos (Transformers.js v3)
          // and avoids the merged decoder subgraph validation bug in onnxruntime-web
          dtype = "q4f16";
        }
      } catch (e) {
        console.warn("WebGPU not available, falling back to WASM");
      }
    }

    try {
      const p = await pipeline("automatic-speech-recognition", repo, {
        dtype,
        device,
        progress_callback: progressCallback(onProgress),
      } as any);
      cachedPipeline = { id: modelId, p };
      onProgress?.({ status: "ready", progress: 1, message: "Ready" });
      return p;
    } catch (e: any) {
      console.warn(`Whisper load failed with ${device}/${dtype}, trying WASM/q8 fallback`, e);
      // Fallback: WASM + quantized (most compatible, works everywhere)
      onProgress?.({ status: "downloading", progress: 0, message: "Falling back to CPU mode…" });
      const p = await pipeline("automatic-speech-recognition", repo, {
        dtype: "q8",
        device: "wasm",
        progress_callback: progressCallback(onProgress),
      } as any);
      cachedPipeline = { id: modelId, p };
      onProgress?.({ status: "ready", progress: 1, message: "Ready" });
      return p;
    }
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

export interface UseWhisperResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interim: string; // unused for whisper but kept for API parity
  error: string | null;
  level: number;
  loadStatus: WhisperLoadProgress;
  start: () => Promise<void>;
  stop: () => Promise<string>;
  reset: () => void;
  preload: () => Promise<void>;
}

export function useWhisperSTT(modelId: WhisperModelId): UseWhisperResult {
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
    status: cachedPipeline?.id === modelId ? "ready" : "idle",
    progress: cachedPipeline?.id === modelId ? 1 : 0,
    message: cachedPipeline?.id === modelId ? "Ready" : "",
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
      const pipe = cachedPipeline?.p;
      if (!pipe) {
        console.warn("[Whisper] Pipeline not available, skipping chunk");
        return;
      }
      while (chunkQueueRef.current.length > 0) {
        const audio = chunkQueueRef.current.shift()!;
        try {
          if (audio.length < 16000 * 0.8) {
            console.log("[Whisper] Chunk too short, skipping:", audio.length, "samples");
            continue;
          }
          console.log("[Whisper] Transcribing chunk:", audio.length, "samples (~" + (audio.length / 16000).toFixed(1) + "s)");
          const out: any = await pipe(audio, {
            sampling_rate: 16000,
            language: "english",
            task: "transcribe",
          });
          let text = (out?.text || "").trim();
          console.log("[Whisper] Result:", JSON.stringify(text));
          if (text) {
             if (llmRef.current.isReady) {
               text = await llmRef.current.fixTranscript(text);
             }
             updateTranscript(text);
          }
        } catch (e: any) {
          console.error("[Whisper] Transcription error:", e?.message || e);
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
    try {
      await loadWhisper(modelId, setLoadStatus);
    } catch (e: any) {
      setLoadStatus({ status: "error", progress: 0, message: e?.message || "Failed to load model" });
      throw e;
    }
  }, [modelId]);

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

    // Whisper should already be preloaded from the home screen.
    // This call returns instantly if cached, or loads if somehow missed.
    try {
      await loadWhisper(modelId, setLoadStatus);
    } catch (e: any) {
      setError("Whisper model failed to load: " + (e?.message || "unknown error"));
      return;
    }

    // WebLLM transcript cleanup is optional — never block session start for it.
    // If it's already loaded, processQueue will use it. Otherwise, raw transcripts are fine.

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

    // Mic level meter
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
        // Load VAD assets from public/ directory (copied from node_modules)
        modelURL: "/silero_vad_legacy.onnx",
        workletURL: "/vad.worklet.bundle.min.js",
        // Load ONNX runtime WASM from CDN to avoid Vite bundling issues
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
  }, [supported, modelId, tickLevel, processQueue]);

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
