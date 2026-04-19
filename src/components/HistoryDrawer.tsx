import type { SessionRecord } from "@/hooks/useSessionStore";

interface Props {
  open: boolean;
  sessions: SessionRecord[];
  onClose: () => void;
}

export function HistoryDrawer({ open, sessions, onClose }: Props) {
  if (!open) return null;

  const avg = (k: keyof SessionRecord["feedback"]["scores"]) => {
    if (!sessions.length) return 0;
    const sum = sessions.reduce((acc, s) => acc + s.feedback.scores[k], 0);
    return (sum / sessions.length).toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl h-full bg-card border-l border-border overflow-y-auto"
        style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-warm text-lg font-medium">Your sessions</h2>
          <button onClick={onClose} className="text-warm-muted hover:text-warm transition text-xl">×</button>
        </div>

        <div className="p-6">
          {sessions.length === 0 ? (
            <p className="text-warm-muted text-sm italic">No sessions yet. Start your first rep.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-6">
                <Stat label="Sessions" value={sessions.length} />
                <Stat label="Structure" value={avg("structure")} />
                <Stat label="Clarity" value={avg("clarity")} />
                <Stat label="Confidence" value={avg("confidence_estimate")} />
              </div>

              <div className="space-y-3">
                {sessions.map((s) => {
                  const avgScore =
                    (s.feedback.scores.structure +
                      s.feedback.scores.clarity +
                      s.feedback.scores.completeness +
                      s.feedback.scores.confidence_estimate) /
                    4;
                  return (
                    <div key={s.id} className="border border-border rounded-xl p-4 hover:border-warm/30 transition">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="text-[10px] uppercase tracking-widest text-warm-muted">
                          {new Date(s.date).toLocaleString()} · {s.mode}
                        </div>
                        <div
                          className="text-sm tabular-nums font-medium px-2 py-0.5 rounded"
                          style={{
                            color: avgScore >= 7 ? "var(--color-success)" : avgScore >= 5 ? "var(--color-amber-soft)" : "var(--color-destructive)",
                            background: "color-mix(in oklab, currentColor 12%, transparent)",
                          }}
                        >
                          {avgScore.toFixed(1)}
                        </div>
                      </div>
                      <p className="text-warm text-sm leading-snug">{s.question}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3 text-center">
      <div className="text-warm text-lg font-medium tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-warm-muted mt-1">{label}</div>
    </div>
  );
}
