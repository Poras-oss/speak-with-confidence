import { useMemo } from "react";
import type { FeedbackPayload } from "@/hooks/useGroqAI";
import { ScoreCircle } from "./ScoreCircle";
import { countFillers, highlightFillers } from "@/utils/fillerWords";

interface Props {
  question: string;
  transcript: string;
  feedback: FeedbackPayload | null;
  loading: boolean;
  error?: string | null;
  showFillers: boolean;
  onTryAgain: () => void;
  onNext: () => void;
  onEnd: () => void;
  onRetry: () => void;
  mode?: string;
}

export function FeedbackScreen({
  question,
  transcript,
  feedback,
  loading,
  error,
  showFillers,
  onTryAgain,
  onNext,
  onEnd,
  onRetry,
  mode,
}: Props) {
  const fillerCount = useMemo(() => countFillers(transcript), [transcript]);
  const tokens = useMemo(() => highlightFillers(transcript), [transcript]);

  const labels = useMemo(() => {
    if (mode === "story") {
      return {
        structure: "Narrative Arc",
        clarity: "Engagement",
        completeness: "Pacing",
        confidence: "Delivery",
      };
    }
    if (mode === "devsim") {
      return {
        structure: "Structure",
        clarity: "Tech Clarity",
        completeness: "Coverage",
        confidence: "Collaboration",
      };
    }
    if (mode === "pitch") {
      return {
        structure: "Pitch Flow",
        clarity: "Persuasion",
        completeness: "Objection Handling",
        confidence: "Delivery",
      };
    }
    return {
      structure: "Structure",
      clarity: "Clarity",
      completeness: "Completeness",
      confidence: "Confidence",
    };
  }, [mode]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="px-6 md:px-10 py-5 border-b border-border/40 flex items-center justify-between">
        <div className="text-warm-muted text-sm tracking-[0.25em] uppercase">Feedback</div>
        <button
          onClick={onEnd}
          className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40"
        >
          End session
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 md:p-10 max-w-7xl mx-auto">
        {/* Left — transcript */}
        <div className="lg:col-span-5 animate-fade-up">
          <div className="text-xs uppercase tracking-widest text-warm-muted mb-2">Question</div>
          <p className="text-warm/90 text-base mb-8 leading-relaxed">{question}</p>

          <div className="text-xs uppercase tracking-widest text-warm-muted mb-2">Your answer</div>
          <div className="bg-card border border-border rounded-xl p-5 leading-relaxed text-[15px]">
            {transcript ? (
              <p className="text-warm">
                {tokens.map((t, i) =>
                  t.filler && showFillers ? (
                    <span
                      key={i}
                      className="rounded px-1"
                      style={{ background: "color-mix(in oklab, var(--color-amber-soft) 25%, transparent)", color: "var(--color-amber-soft)" }}
                    >
                      {t.text}
                    </span>
                  ) : (
                    <span key={i}>{t.text}</span>
                  )
                )}
              </p>
            ) : (
              <p className="text-warm-muted italic">No words were captured this round.</p>
            )}
          </div>
          {showFillers && (
            <p className="text-xs text-warm-muted mt-3">
              Filler words detected: <span className="text-warm font-medium">{fillerCount}</span>
            </p>
          )}
        </div>

        {/* Right — feedback */}
        <div className="lg:col-span-7">
          {loading && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center animate-fade-in">
              <div className="text-warm text-lg mb-2">Reading your answer…</div>
              <div className="text-warm-muted text-sm">Building feedback for you.</div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-card border border-destructive/40 rounded-2xl p-8 animate-fade-in">
              <div className="text-warm mb-3">Something went sideways.</div>
              <p className="text-warm-muted text-sm mb-5">{error}</p>
              <button
                onClick={onRetry}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
              >
                Try again
              </button>
            </div>
          )}

          {feedback && !loading && (
            <div className="space-y-6 animate-fade-up">
              <div className="bg-card border border-border rounded-2xl p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ScoreCircle value={feedback.scores.structure} label={labels.structure} delay={0} />
                  <ScoreCircle value={feedback.scores.clarity} label={labels.clarity} delay={120} />
                  <ScoreCircle value={feedback.scores.completeness} label={labels.completeness} delay={240} />
                  <ScoreCircle value={feedback.scores.confidence_estimate} label={labels.confidence} delay={360} />
                </div>
              </div>

              <Section title="What you nailed" tone="success">
                <ul className="space-y-2">
                  {feedback.nailed.map((p, i) => (
                    <li key={i} className="flex gap-3 text-warm">
                      <span className="text-success mt-1">✓</span>
                      <span className="text-[15px] leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="What to improve" tone="amber">
                <ul className="space-y-2">
                  {feedback.improve.map((p, i) => (
                    <li key={i} className="flex gap-3 text-warm">
                      <span className="text-amber-soft mt-1">→</span>
                      <span className="text-[15px] leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Ideal Answer Framework">
                <ol className="space-y-2">
                  {feedback.ideal_framework.map((p, i) => (
                    <li key={i} className="flex gap-3 text-warm">
                      <span className="text-warm-muted text-xs mt-1.5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[15px] leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              <Section title="Improved Version" tone="success">
                <div className="bg-card/50 p-4 rounded-xl border border-border/50">
                  <p className="text-[15px] leading-relaxed text-warm italic">
                    "{feedback.improved_response}"
                  </p>
                </div>
              </Section>

              <Section title="Resources to Learn More">
                <div className="space-y-3">
                  {feedback.resources?.map((r, i) => (
                    <div key={i} className="flex flex-col gap-1 border-l-2 border-primary/30 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-warm font-medium">{r.title}</span>
                        <span className="text-xs text-warm-muted uppercase tracking-wider">{r.type}</span>
                      </div>
                      <p className="text-[14px] text-warm/80 leading-relaxed">{r.description}</p>
                    </div>
                  ))}
                  {(!feedback.resources || feedback.resources.length === 0) && (
                    <p className="text-warm-muted text-sm italic">No specific resources recommended this time.</p>
                  )}
                </div>
              </Section>

              <div
                className="rounded-2xl p-6 border"
                style={{
                  background: "color-mix(in oklab, var(--color-warm) 6%, transparent)",
                  borderColor: "color-mix(in oklab, var(--color-warm) 18%, transparent)",
                }}
              >
                <div className="text-xs uppercase tracking-widest text-warm-muted mb-2">
                  Internalize
                </div>
                <p className="text-warm text-lg leading-snug font-light">
                  "{feedback.reframe}"
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={onTryAgain}
                  className="px-5 py-3 rounded-xl bg-secondary text-warm font-medium hover:bg-accent transition"
                >
                  Try again (same question)
                </button>
                <button
                  onClick={onNext}
                  className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
                >
                  Next question
                </button>
                <button
                  onClick={onEnd}
                  className="px-5 py-3 rounded-xl text-warm-muted hover:text-warm transition"
                >
                  End session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "success" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div
        className="text-xs uppercase tracking-widest mb-3"
        style={{
          color:
            tone === "success"
              ? "var(--color-success)"
              : tone === "amber"
              ? "var(--color-amber-soft)"
              : "var(--color-warm-muted)",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
