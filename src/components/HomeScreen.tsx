import { useEffect, useState } from "react";
import { MODES, type ModeConfig, type ModeId } from "@/config/modes";
import type { ResumeState, StreakState } from "@/hooks/useSessionStore";
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
  streak: StreakState;
  totalSessions: number;
  resume: ResumeState | null;
  onResumeChange: (r: ResumeState | null) => void;
}

export function HomeScreen({ onPick, onOpenSettings, onOpenHistory, streak, totalSessions, resume, onResumeChange }: Props) {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14 w-full max-w-5xl">
          {MODES.filter((m) => !m.comingSoon).map((m, i) => (
            <ModeCard key={m.id} mode={m} onClick={() => onPick(m.id as ModeId)} delay={i * 80} />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 w-full max-w-5xl">
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

function ModeCard({ mode, onClick, delay }: { mode: ModeConfig; onClick: () => void; delay: number }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-card border border-border rounded-2xl p-6 hover:border-warm/30 hover:bg-card/80 transition-all duration-300 animate-fade-up hover:-translate-y-0.5"
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
