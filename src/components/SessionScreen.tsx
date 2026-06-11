import { useCallback, useEffect, useRef, useState } from "react";
import { useTranscriber } from "@/hooks/useTranscriber";
import { TranscriptionDisplay } from "./TranscriptionDisplay";
import { MicLevelMeter } from "./MicLevelMeter";
import type { ModeConfig } from "@/config/modes";

interface Props {
  mode: ModeConfig;
  difficultyLabel?: string;
  topicLabel?: string;
  question: string;
  questionLoading: boolean;
  questionError?: string | null;
  durationSec: number;
  onFinish: (transcript: string, durationSec: number) => void;
  onSkip: () => void;
  onExit: () => void;
}

export function SessionScreen({
  mode,
  difficultyLabel,
  topicLabel,
  question,
  questionLoading,
  questionError,
  durationSec,
  onFinish,
  onSkip,
  onExit,
}: Props) {
  const sr = useTranscriber();
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const finishedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    if (!started && sr.supported && question && !questionLoading) {
      setStarted(true);
      startedAtRef.current = Date.now();
      sr.start();
    }
  }, [started, sr, question, questionLoading]);

  const latestTranscriptRef = useRef("");
  const latestInterimRef = useRef("");
  const latestDurationRef = useRef(durationSec);
  
  useEffect(() => {
    latestTranscriptRef.current = sr.transcript;
    latestInterimRef.current = sr.interim;
  }, [sr.transcript, sr.interim]);

  useEffect(() => {
    latestDurationRef.current = durationSec;
  }, [durationSec]);

  const handleFinish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    const elapsedSec = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : elapsed;
    
    let finalTxStr = "";
    try {
      finalTxStr = (await sr.stop()) || "";
    } catch {
      // ignore
    }
    
    const finalTx = finalTxStr || [latestTranscriptRef.current, latestInterimRef.current].filter(Boolean).join(" ");
    onFinish(finalTx, elapsedSec);
  }, [sr, elapsed, onFinish]);

  const handleFinishRef = useRef(handleFinish);
  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  const [timeUp, setTimeUp] = useState(false);

  // Timer
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= latestDurationRef.current && !finishedRef.current) {
          setTimeUp(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started]);

  // Auto finish when time is up AND they stop speaking
  useEffect(() => {
    if (timeUp && !finishedRef.current && !sr.isVoiceActive) {
      handleFinishRef.current();
    }
  }, [timeUp, sr.isVoiceActive]);

  // Spacebar shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !finishedRef.current && started) {
        e.preventDefault();
        handleFinishRef.current();
      }
      if (e.code === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, onExit]);

  const remaining = Math.max(0, durationSec - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-canvas)]" style={{ background: "#080808" }}>
      {/* Top — Question */}
      <div className="pt-10 pb-4 px-6 md:px-10 min-h-[26vh] flex flex-col items-center justify-center">
        <div className="flex items-center gap-2 mb-5 animate-fade-in">
          <Badge>{mode.name}</Badge>
          {difficultyLabel && <Badge>{difficultyLabel}</Badge>}
          {topicLabel && <Badge>{topicLabel}</Badge>}
          <div className="flex items-center gap-1.5 ml-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${sr.listening ? "animate-pulse-soft" : "opacity-30"}`}
              style={{ background: "var(--color-listening)" }}
            />
            <span className="text-[10px] uppercase tracking-widest text-warm-muted">
              {sr.engine === "whisper" && sr.loadStatus?.status === "downloading"
                ? `Whisper · ${Math.round((sr.loadStatus.progress || 0) * 100)}%`
                : sr.listening
                ? `Listening · ${sr.engine === "whisper" ? "Whisper" : "Browser"}`
                : "Idle"}
            </span>
          </div>
        </div>

        {questionLoading ? (
          <p className="text-warm-muted text-lg italic animate-pulse">Generating your question…</p>
        ) : questionError ? (
          <p className="text-destructive text-base text-center max-w-2xl">{questionError}</p>
        ) : (
          <h2
            className="text-center text-[26px] md:text-[32px] leading-snug font-light max-w-3xl animate-fade-up tracking-tight"
            style={{ color: "#f5f0e8" }}
          >
            {question}
          </h2>
        )}
      </div>

      {/* Middle — Transcription */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <TranscriptionDisplay transcript={sr.transcript} interim={sr.interim} chunks={sr.chunks} listening={sr.listening} />
        </div>
        {sr.error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-sm text-destructive bg-card border border-border rounded-lg px-4 py-2">
            {sr.error}
          </div>
        )}
      </div>

      {/* Bottom — Controls */}
      <div className="px-6 md:px-10 pt-6 pb-8 border-t border-border/40">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-sm text-warm-muted">
            <div className="tabular-nums text-warm font-medium text-base">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <div className={sr.isVoiceActive ? "mic-active-pulse" : ""}>
              <MicLevelMeter level={sr.level} active={sr.isVoiceActive || sr.listening} />
            </div>
            <span className="text-xs opacity-60">Press Space to stop</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={onSkip}
              className="text-sm text-warm-muted hover:text-warm transition px-4 py-2 rounded-lg hover:bg-accent/40"
            >
              Skip / New question
            </button>
            {!started ? (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse">Click below to start your timer</span>
                <button
                  onClick={startRecording}
                  disabled={questionLoading || !question}
                  className="px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)] hover:-translate-y-1 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  style={{
                    background: "linear-gradient(135deg, var(--color-primary), #9333ea)",
                    color: "white",
                  }}
                >
                  BEGIN SPEAKING
                </button>
              </div>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!started || finishing}
                className="px-8 py-3.5 rounded-xl font-medium text-base transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: "color-mix(in oklab, var(--color-destructive) 85%, black)",
                  color: "var(--color-destructive-foreground)",
                  boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-destructive) 50%, transparent), 0 8px 32px -12px color-mix(in oklab, var(--color-destructive) 60%, transparent)",
                }}
              >
                {finishing ? "FINISHING..." : timeUp ? "FINISHING SENTENCE..." : "STOP & GET FEEDBACK"}
              </button>
            )}
            <button
              onClick={onExit}
              className="text-sm text-warm-muted hover:text-warm transition px-4 py-2 rounded-lg hover:bg-accent/40"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md bg-secondary/80 text-warm-muted border border-border/60">
      {children}
    </span>
  );
}
