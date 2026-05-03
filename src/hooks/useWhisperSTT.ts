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
  tiny: "Xenova/whisper-tiny.en",
  base: "Xenova/whisper-base.en",
  "distil-small": "distil-whisper/distil-small.en",
};

export interface WhisperLoadProgress {
  status: "idle" | "downloading" | "ready" | "error";
  progress: number; // 0..1 best-effort
  message: string;
}

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

    let device: any = "wasm";
    let dtype: any = "fp32";
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = "webgpu";
          dtype = "fp16";
        }
      } catch (e) {
        console.warn("WebGPU not available, falling back to WASM");
      }
    }

    const p = await pipeline("automatic-speech-recognition", repo, {
      dtype,
      device,
      progress_callback: (info: any) => {
        if (info?.status === "progress") {
          onProgress?.({
            status: "downloading",
            progress: typeof info.progress === "number" ? info.progress / 100 : 0,
            message: `Downloading ${info.file ?? "model"}…`,
          });
        } else if (info?.status === "done" || info?.status === "ready") {
          onProgress?.({ status: "ready", progress: 1, message: "Ready" });
        }
      },
    } as any);
    cachedPipeline = { id: modelId, p };
    onProgress?.({ status: "ready", progress: 1, message: "Ready" });
    return p;
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
  stop: () => void;
  reset: () => void;
  preload: () => Promise<void>;
}

export function useWhisperSTT(modelId: WhisperModelId): UseWhisperResult {
  const llm = useWebLLM();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
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
      if (!pipe) return;
      while (chunkQueueRef.current.length > 0) {
        const audio = chunkQueueRef.current.shift()!;
        try {
          if (audio.length < 16000 * 0.3) continue; // <0.3s, skip silence
          const out: any = await pipe(audio, { language: "english", task: "transcribe" });
          let text = (out?.text || "").trim();
          if (text) {
             if (llm.isReady) {
               text = await llm.fixTranscript(text);
             }
             setTranscript((prev) => (prev ? prev + " " + text : text));
          }
        } catch (e) {
          // swallow per-chunk errors
        }
      }
    } finally {
      processingRef.current = false;
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

  const stop = useCallback(() => {
    stoppedRef.current = true;
    try { vadRef.current?.pause(); } catch {}
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
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Audio recording isn't supported in this browser.");
      return;
    }
    setError(null);
    setTranscript("");
    stoppedRef.current = false;

    try {
      await loadWhisper(modelId, setLoadStatus);
      if (!llm.isReady) {
        setLoadStatus({ status: "downloading", progress: 0.5, message: "Loading WebLLM..." });
        await llm.load();
        setLoadStatus({ status: "ready", progress: 1, message: "Ready" });
      }
    } catch (e: any) {
      setError("Whisper model failed to load: " + (e?.message || "unknown error"));
      return;
    }

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
      vadRef.current = await MicVAD.start({
        stream,
        onSpeechEnd: (audio: Float32Array) => {
          if (stoppedRef.current) return;
          chunkQueueRef.current.push(audio);
          processQueue();
        },
      });
      setListening(true);
    } catch (e: any) {
      setError("VAD initialization failed: " + (e?.message || "unknown error"));
    }
  }, [supported, modelId, tickLevel, processQueue]);

  const reset = useCallback(() => setTranscript(""), []);

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
