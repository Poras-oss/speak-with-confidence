import { useMemo } from "react";
import type { SessionRecord } from "@/hooks/useSessionStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  open: boolean;
  sessions: SessionRecord[];
  onClose: () => void;
}

export function ProgressDrawer({ open, sessions, onClose }: Props) {
  if (!open) return null;

  // We need to reverse sessions so they are chronological (oldest first)
  const chronologicalSessions = useMemo(() => [...sessions].reverse(), [sessions]);

  // Baseline vs Recent
  const baselineCount = Math.min(3, chronologicalSessions.length);
  const baselineSessions = chronologicalSessions.slice(0, baselineCount);
  const recentSessions = chronologicalSessions.slice(-baselineCount);

  const calcAvg = (sessionList: SessionRecord[], key: keyof SessionRecord["feedback"]["scores"]) => {
    if (!sessionList.length) return 0;
    const sum = sessionList.reduce((acc, s) => acc + s.feedback.scores[key], 0);
    return sum / sessionList.length;
  };

  const calcOverall = (sessionList: SessionRecord[]) => {
    if (!sessionList.length) return 0;
    const sum = sessionList.reduce((acc, s) => {
      const { structure, clarity, completeness, confidence_estimate } = s.feedback.scores;
      return acc + (structure + clarity + completeness + confidence_estimate) / 4;
    }, 0);
    return sum / sessionList.length;
  };

  const getDeltaText = (baseline: number, recent: number) => {
    if (baseline === 0) return "";
    const diff = recent - baseline;
    const pct = (diff / baseline) * 100;
    if (pct > 0) return `+${pct.toFixed(1)}%`;
    if (pct < 0) return `${pct.toFixed(1)}%`;
    return "0%";
  };

  const getDeltaColor = (baseline: number, recent: number) => {
    if (baseline === 0 || recent === baseline) return "var(--color-warm-muted)";
    return recent > baseline ? "var(--color-success)" : "var(--color-destructive)";
  };

  // Chart Data
  const chartData = useMemo(() => {
    return chronologicalSessions.map((s, index) => {
      const { structure, clarity, completeness, confidence_estimate } = s.feedback.scores;
      return {
        name: `Rep ${index + 1}`,
        Structure: structure,
        Clarity: clarity,
        Completeness: completeness,
        Confidence: confidence_estimate,
        Overall: (structure + clarity + completeness + confidence_estimate) / 4,
      };
    });
  }, [chronologicalSessions]);

  const metrics = [
    { key: "structure" as const, label: "Structure" },
    { key: "clarity" as const, label: "Clarity" },
    { key: "completeness" as const, label: "Completeness" },
    { key: "confidence_estimate" as const, label: "Confidence" },
  ];

  const overallBaseline = calcOverall(baselineSessions);
  const overallRecent = calcOverall(recentSessions);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl h-full bg-card border-l border-border overflow-y-auto"
        style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-warm text-lg font-medium">Performance Report</h2>
          <button onClick={onClose} className="text-warm-muted hover:text-warm transition text-xl">×</button>
        </div>

        <div className="p-6">
          {sessions.length < 2 ? (
            <div className="text-center py-20">
              <p className="text-warm-muted text-sm italic mb-2">Not enough data to generate a report.</p>
              <p className="text-warm-muted/70 text-xs">Complete at least 2 sessions to see your progress.</p>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="mb-8">
                <h3 className="text-sm uppercase tracking-widest text-warm-muted mb-4">Overall Trajectory</h3>
                <div className="bg-secondary/30 border border-border rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-warm-muted uppercase tracking-wider mb-1">Baseline (First {baselineCount})</div>
                    <div className="text-3xl font-light text-warm">{overallBaseline.toFixed(1)}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] text-warm-muted uppercase tracking-widest mb-1">Improvement</span>
                    <span 
                      className="text-xl font-medium px-3 py-1 rounded-md"
                      style={{ 
                        color: getDeltaColor(overallBaseline, overallRecent),
                        background: `color-mix(in oklab, ${getDeltaColor(overallBaseline, overallRecent)} 15%, transparent)`
                      }}
                    >
                      {getDeltaText(overallBaseline, overallRecent)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-warm-muted uppercase tracking-wider mb-1">Recent (Last {baselineCount})</div>
                    <div className="text-3xl font-light text-warm">{overallRecent.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="mb-10">
                <h3 className="text-sm uppercase tracking-widest text-warm-muted mb-4">Metrics Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {metrics.map(({ key, label }) => {
                    const base = calcAvg(baselineSessions, key);
                    const recent = calcAvg(recentSessions, key);
                    return (
                      <div key={key} className="bg-card border border-border rounded-xl p-4 flex flex-col">
                        <div className="text-xs text-warm-muted uppercase tracking-wider mb-3">{label}</div>
                        <div className="flex items-end justify-between mt-auto">
                          <div>
                            <div className="text-[10px] text-warm-muted/60 mb-0.5">Now</div>
                            <div className="text-xl text-warm font-medium">{recent.toFixed(1)}</div>
                          </div>
                          <div 
                            className="text-sm font-medium"
                            style={{ color: getDeltaColor(base, recent) }}
                          >
                            {getDeltaText(base, recent)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart */}
              <div>
                <h3 className="text-sm uppercase tracking-widest text-warm-muted mb-4">Performance Over Time</h3>
                <div className="bg-card border border-border rounded-xl p-5 h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                      <XAxis dataKey="name" stroke="var(--color-warm-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                      <YAxis domain={[0, 10]} stroke="var(--color-warm-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "var(--color-card)", 
                          borderColor: "var(--color-border)",
                          borderRadius: "12px",
                          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)"
                        }}
                        itemStyle={{ color: "var(--color-warm)" }}
                        labelStyle={{ color: "var(--color-warm-muted)", marginBottom: "4px" }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px", fontSize: "12px", color: "var(--color-warm-muted)" }} />
                      <Line type="monotone" dataKey="Overall" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Structure" stroke="#8b5cf6" strokeWidth={2} strokeOpacity={0.6} dot={false} />
                      <Line type="monotone" dataKey="Clarity" stroke="#3b82f6" strokeWidth={2} strokeOpacity={0.6} dot={false} />
                      <Line type="monotone" dataKey="Completeness" stroke="#10b981" strokeWidth={2} strokeOpacity={0.6} dot={false} />
                      <Line type="monotone" dataKey="Confidence" stroke="#f59e0b" strokeWidth={2} strokeOpacity={0.6} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
