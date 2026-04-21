// Whisper STT via @huggingface/transformers (WASM/WebGPU). Streams audio chunks
// from MediaRecorder, transcribes with onnxruntime-web. First run downloads the
// model (~40-80MB) and caches it in the browser via the Cache API.
import { useCallback, useEffect, useRef, useState } from "react";
import type { WhisperModelId } from "./useSessionStore";

type Pipeline = any;

let cachedPipeline: { id: WhisperModelId; p: Pipeline } | null = null;
let loadingPromise: Promise<Pipeline> | null = null;

const MODEL_MAP: Record<WhisperModelId, string> = {
  tiny: "Xenova/whisper-tiny.en",
  base: "Xenova/whisper-base.en",
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
    const p = await pipeline("automatic-speech-recognition", repo, {
      // dtype/quantization keeps it small & fast in browser
      dtype: "q8" as any,
      device: "wasm" as any,
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

// Decode a Blob (any browser-supported audio container) to mono Float32 @ 16kHz
async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer();
  const AC = (window.AudioContext || (window as any).webkitAudioContext);
  // Use 16k sample rate context where supported, otherwise resample manually.
  let ctx: AudioContext;
  try {
    ctx = new AC({ sampleRate: 16000 });
  } catch {
    ctx = new AC();
  }
  const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
  let mono: Float32Array;
  if (decoded.numberOfChannels === 1) {
    mono = decoded.getChannelData(0);
  } else {
    const l = decoded.getChannelData(0);
    const r = decoded.getChannelData(1);
    mono = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) mono[i] = (l[i] + r[i]) / 2;
  }
  // Resample if context didn't honor 16kHz
  if (decoded.sampleRate !== 16000) {
    const ratio = decoded.sampleRate / 16000;
    const outLen = Math.floor(mono.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const i1 = Math.min(mono.length - 1, i0 + 1);
      const frac = src - i0;
      out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
    }
    mono = out;
  }
  ctx.close().catch(() => {});
  return mono;
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
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [loadStatus, setLoadStatus] = useState<WhisperLoadProgress>({
    status: cachedPipeline?.id === modelId ? "ready" : "idle",
    progress: cachedPipeline?.id === modelId ? 1 : 0,
    message: cachedPipeline?.id === modelId ? "Ready" : "",
  });

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
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
        const blob = chunkQueueRef.current.shift()!;
        try {
          const audio = await decodeToMono16k(blob);
          if (audio.length < 16000 * 0.3) continue; // <0.3s, skip silence
          const out: any = await pipe(audio, { language: "english", task: "transcribe" });
          const text = (out?.text || "").trim();
          if (text) setTranscript((prev) => (prev ? prev + " " + text : text));
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
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
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
    } catch (e: any) {
      setError("Whisper model failed to load: " + (e?.message || "unknown error"));
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    // Pick a supported mime
    const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mime = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) || "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunkQueueRef.current.push(e.data);
        processQueue();
      }
    };
    rec.onerror = (e: any) => setError("Recorder error: " + (e?.error?.message || "unknown"));
    rec.onstop = () => {
      // Drain any remaining
      processQueue();
    };
    // 4s chunks — balances latency vs. accuracy
    rec.start(4000);
    setListening(true);
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
