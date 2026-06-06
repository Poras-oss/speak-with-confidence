import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  interim: string;
  error: string | null;
  level: number; // 0..1 mic level
  start: () => Promise<void>;
  stop: () => Promise<string>;
  reset: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const SRClass =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const supported = !!SRClass;

  const recognitionRef = useRef<SR | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const restartRef = useRef(false);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  
  const updateTranscript = useCallback((final: string) => {
    setTranscript((prev) => {
      const next = (prev ? prev + " " : "") + final;
      transcriptRef.current = next;
      return next;
    });
    setInterim("");
    interimRef.current = "";
  }, []);

  const updateInterim = useCallback((text: string) => {
    setInterim(text);
    interimRef.current = text;
  }, []);

  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const tickLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setLevel(Math.min(1, rms * 3));
    rafRef.current = requestAnimationFrame(tickLevel);
  }, []);

  const stop = useCallback(async (): Promise<string> => {
    restartRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setLevel(0);
    
    // Give browser speech API a tiny bit of time to fire a final onresult if it wants to
    await new Promise((r) => setTimeout(r, 100));
    
    return [transcriptRef.current, interimRef.current].filter(Boolean).join(" ");
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    setError(null);
    setTranscript("");
    transcriptRef.current = "";
    setInterim("");
    interimRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      rafRef.current = requestAnimationFrame(tickLevel);
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

    const rec: SR = new SRClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) {
        updateTranscript(finalChunk.trim());
      } else {
        updateInterim(interimChunk);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setError(`Recognition error: ${e.error}`);
    };
    rec.onend = () => {
      if (restartRef.current) {
        try { rec.start(); } catch {}
      } else {
        setListening(false);
      }
    };

    restartRef.current = true;
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      // already started
      setListening(true);
    }
  }, [SRClass, supported, tickLevel]);

  const reset = useCallback(() => {
    setTranscript("");
    transcriptRef.current = "";
    setInterim("");
    interimRef.current = "";
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, transcript, interim, error, level, start, stop, reset };
}
