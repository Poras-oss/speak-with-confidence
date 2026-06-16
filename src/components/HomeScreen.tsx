import { useEffect, useState } from "react";
import { MODES, type ModeConfig, type ModeId } from "@/config/modes";
import type { ResumeState, StreakState } from "@/hooks/useSessionStore";
import type { WhisperLoadProgress } from "@/hooks/useWhisperSTT";
import { ResumePanel } from "./ResumePanel";
import { AuthButton } from "./AuthButton";

const MOTIVATIONS = [
  "Your ideas are worth saying out loud.",
  "Every rep is rewiring your brain.",
  "The blank mind is just the start — keep going.",
  "Discomfort is the price of fluency.",
  "You don't need to be perfect. You need to begin.",
  "One sentence at a time. That's the work.",
];

interface Props {
  onPick: (mode: ModeId) => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenProgress: () => void;
  streak: StreakState;
  totalSessions: number;
  resume: ResumeState | null;
  onResumeChange: (r: ResumeState | null) => void;
  modelReady: boolean;
  modelStatus: WhisperLoadProgress;
}

export function HomeScreen({ onPick, onOpenSettings, onOpenHistory, onOpenProgress, streak, totalSessions, resume, onResumeChange, modelReady, modelStatus }: Props) {
  const [motiv, setMotiv] = useState(MOTIVATIONS[0]);
  useEffect(() => {
    setMotiv(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 md:px-10 py-6">
        <div className="text-warm-muted text-sm tracking-[0.25em] uppercase">VoxMind</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProgress}
            className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40"
          >
            Progress
          </button>
          <button
            onClick={onOpenHistory}
            className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40"
          >
            History
          </button>
          <button
            onClick={onOpenSettings}
            className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40"
          >
            Settings
          </button>
          <AuthButton />
        </div>
      </header>

      {/* Center */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 md:px-10 -mt-6">
        <p className="text-center text-2xl md:text-4xl text-warm font-light leading-snug max-w-2xl animate-fade-up tracking-tight">
          {motiv}
        </p>

        <div className="w-full max-w-5xl mt-14 space-y-10">
          {/* Core Practice Section */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-warm-muted/70 mb-4 px-1">Core Practice</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {MODES.filter((m) => !m.comingSoon && ["extempore", "technical", "conversation", "story"].includes(m.id)).map((m, i) => (
                <ModeCard key={m.id} mode={m} onClick={() => onPick(m.id as ModeId)} delay={i * 70} disabled={!modelReady} />
              ))}
            </div>
          </div>

          {/* Advanced Simulations Section */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-warm-muted/70 mb-4 px-1">Advanced Simulations</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {MODES.filter((m) => !m.comingSoon && ["devsim", "pitch"].includes(m.id)).map((m, i) => (
                <ModeCard key={m.id} mode={m} onClick={() => onPick(m.id as ModeId)} delay={i * 70 + 280} disabled={!modelReady} />
              ))}
            </div>
          </div>
        </div>

        {/* Model download progress */}
        {!modelReady && (
          <div className="mt-6 w-full max-w-md animate-fade-in">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                {modelStatus.status === "error" ? (
                  <span className="text-destructive text-sm">⚠ {modelStatus.message}</span>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-warm text-sm">
                      {modelStatus.status === "idle"
                        ? "Preparing speech recognition…"
                        : modelStatus.message || "Downloading model…"}
                    </span>
                  </>
                )}
              </div>
              <div className="h-1.5 bg-input rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((modelStatus.progress || 0) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-warm-muted/60 mt-2">
                One-time download · cached for future sessions
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 w-full max-w-5xl">
          {MODES.filter((m) => m.comingSoon).map((m) => (
            <div
              key={m.id}
              className="border border-dashed border-border/60 rounded-xl px-4 py-3 text-center"
            >
              <div className="text-xs text-warm-muted/70">{m.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-warm-muted/40 mt-0.5">
                Coming Soon
              </div>
            </div>
          ))}
        </div>

        <ResumePanel resume={resume} onChange={onResumeChange} />
      </main>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 text-sm text-warm-muted">
          <span className="flex items-center gap-1.5">
            <span className="text-base">🔥</span>
            <span className="text-warm font-medium tabular-nums">{streak.count}</span>
            <span>day streak</span>
          </span>
          <span className="opacity-50">•</span>
          <span>
            <span className="text-warm font-medium tabular-nums">{totalSessions}</span> sessions
          </span>
        </div>
        <a
          href="#how"
          onClick={(e) => {
            e.preventDefault();
            alert(
              "VoxMind uses three approaches:\n\n• Graduated Exposure Therapy — start small, build up.\n• CBT — reframe 'failure' as data.\n• Deliberate Practice — volume + feedback builds the skill.\n\nEvery rep counts."
            );
          }}
          className="text-xs text-warm-muted/70 hover:text-warm transition"
        >
          How this works
        </a>
      </footer>
    </div>
  );
}

function ModeCard({ mode, onClick, delay, disabled }: { mode: ModeConfig; onClick: () => void; delay: number; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group text-left bg-card border border-border rounded-2xl p-6 transition-all duration-300 animate-fade-up ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:border-warm/30 hover:bg-card/80 hover:-translate-y-0.5"
      }`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl text-warm-muted group-hover:text-warm transition">{mode.icon}</span>
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-secondary text-warm-muted">
          {mode.difficulty}
        </span>
      </div>
      <h3 className="text-xl text-warm font-medium mb-1">{mode.name}</h3>
      <p className="text-xs text-warm-muted/80 mb-3">{mode.short}</p>
      <p className="text-sm text-warm-muted leading-relaxed">{mode.description}</p>
    </button>
  );
}
