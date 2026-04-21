import { useState } from "react";
import { DOMAINS, DURATIONS, type Domain, type Difficulty } from "@/config/modes";
import { useApiKey, useSettings, useSessions, type WhisperModelId } from "@/hooks/useSessionStore";
import { testApiKey } from "@/hooks/useNvidiaAI";
import { loadWhisper, type WhisperLoadProgress } from "@/hooks/useWhisperSTT";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: Props) {
  const { apiKey, setApiKey } = useApiKey();
  const { settings, setSettings } = useSettings();
  const { sessions, clearSessions } = useSessions();
  const [draftKey, setDraftKey] = useState(apiKey);
  const [testing, setTesting] = useState<"idle" | "ok" | "fail" | "loading">("idle");
  const [whisperLoad, setWhisperLoad] = useState<WhisperLoadProgress>({ status: "idle", progress: 0, message: "" });

  const test = async () => {
    setTesting("loading");
    const result = await testApiKey(draftKey || apiKey);
    setTesting(result.ok ? "ok" : "fail");
  };

  const downloadWhisper = async () => {
    try {
      await loadWhisper(settings.whisperModel, setWhisperLoad);
    } catch (e: any) {
      setWhisperLoad({ status: "error", progress: 0, message: e?.message || "Failed" });
    }
  };

  const save = () => {
    setApiKey(draftKey.trim());
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voxmind-sessions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-full bg-card border-l border-border overflow-y-auto"
        style={{ animation: "fade-up 0.4s cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-warm text-lg font-medium">Settings</h2>
          <button onClick={onClose} className="text-warm-muted hover:text-warm transition text-xl">×</button>
        </div>

        <div className="p-6 space-y-8">
          {/* API key */}
          <Section title="NVIDIA NIM API Key">
            <input
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder="nvapi-..."
              className="w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 text-sm text-warm placeholder:text-warm-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={save} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 transition">
                Save
              </button>
              <button onClick={test} disabled={testing === "loading"} className="px-3 bg-secondary text-warm rounded-lg py-2 text-sm hover:bg-accent transition">
                {testing === "loading" ? "Testing…" : testing === "ok" ? "✓ Working" : testing === "fail" ? "✗ Invalid" : "Test"}
              </button>
            </div>
          </Section>

          <Section title="Default difficulty">
            <Segmented
              value={settings.difficulty}
              options={["Beginner", "Intermediate", "Advanced"]}
              onChange={(v) => setSettings({ difficulty: v as Difficulty })}
            />
          </Section>

          <Section title="Technical domain">
            <select
              value={settings.domain}
              onChange={(e) => setSettings({ domain: e.target.value as Domain })}
              className="w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 text-sm text-warm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Section>

          <Section title="Session length">
            <Segmented
              value={String(settings.duration)}
              options={DURATIONS.map((d) => String(d))}
              labels={DURATIONS.map((d) => (d >= 60 ? `${d / 60} min` : `${d}s`))}
              onChange={(v) => setSettings({ duration: Number(v) })}
            />
          </Section>

          <Section title="Preferences">
            <Toggle label="Auto-advance after feedback" value={settings.autoAdvance} onChange={(v) => setSettings({ autoAdvance: v })} />
            <Toggle label="Highlight filler words" value={settings.showFillers} onChange={(v) => setSettings({ showFillers: v })} />
            <Toggle label="Reveal Ideal Answer" value={settings.revealIdeal} onChange={(v) => setSettings({ revealIdeal: v })} />
          </Section>

          <Section title="Data">
            <button onClick={exportData} className="w-full text-left bg-secondary text-warm rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition mb-2">
              Export sessions ({sessions.length}) as JSON
            </button>
            <button
              onClick={() => {
                if (confirm("Delete all session history?")) clearSessions();
              }}
              className="w-full text-left bg-destructive/20 text-destructive rounded-lg px-3 py-2.5 text-sm hover:bg-destructive/30 transition"
            >
              Clear all data
            </button>
          </Section>

          <div className="border-t border-border pt-6">
            <div className="text-xs uppercase tracking-widest text-warm-muted mb-2">About</div>
            <p className="text-sm text-warm-muted leading-relaxed">
              VoxMind is built on graduated exposure therapy, CBT principles, and deliberate
              practice research. Every session is a rep. Reps build the neural pathways. Keep
              going.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-warm-muted mb-3">{title}</div>
      {children}
    </div>
  );
}

function Segmented({
  value,
  options,
  labels,
  onChange,
}: {
  value: string;
  options: string[];
  labels?: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex bg-input/40 rounded-lg p-1 border border-border">
      {options.map((o, i) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`flex-1 py-2 text-xs rounded-md transition ${
            value === o ? "bg-primary text-primary-foreground font-medium" : "text-warm-muted hover:text-warm"
          }`}
        >
          {labels?.[i] ?? o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-2.5 text-sm text-warm hover:text-warm transition"
    >
      <span>{label}</span>
      <span
        className={`relative w-10 h-5 rounded-full transition ${value ? "bg-primary" : "bg-input"}`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-warm transition-transform"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}
