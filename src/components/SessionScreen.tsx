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
  const finishedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  // Auto-start once question is loaded
  useEffect(() => {
    if (!questionLoading && question && !started && sr.supported) {
      setStarted(true);
      startedAtRef.current = Date.now();
      sr.start();
    }
  }, [questionLoading, question, started, sr]);

  // Timer
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= durationSec && !finishedRef.current) {
          finishedRef.current = true;
          handleFinish();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, durationSec]);

  const handleFinish = useCallback(() => {
    finishedRef.current = true;
    const elapsedSec = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current) / 1000)
      : elapsed;
    sr.stop();
    onFinish(sr.transcript || sr.interim || "", elapsedSec);
  }, [sr, elapsed, onFinish]);

  // Spacebar shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !finishedRef.current && started) {
        e.preventDefault();
        handleFinish();
      }
      if (e.code === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, handleFinish, onExit]);

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
          <TranscriptionDisplay transcript={sr.transcript} interim={sr.interim} />
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
            <MicLevelMeter level={sr.level} active={sr.listening} />
            <span className="text-xs opacity-60">Press Space to stop</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={onSkip}
              className="text-sm text-warm-muted hover:text-warm transition px-4 py-2 rounded-lg hover:bg-accent/40"
            >
              Skip / New question
            </button>
            <button
              onClick={handleFinish}
              disabled={!started}
              className="px-8 py-3.5 rounded-xl font-medium text-base transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{
                background: "color-mix(in oklab, var(--color-destructive) 85%, black)",
                color: "var(--color-destructive-foreground)",
                boxShadow: "0 0 0 1px color-mix(in oklab, var(--color-destructive) 50%, transparent), 0 8px 32px -12px color-mix(in oklab, var(--color-destructive) 60%, transparent)",
              }}
            >
              STOP & GET FEEDBACK
            </button>
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
