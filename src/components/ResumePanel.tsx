import { useRef, useState } from "react";
import { extractResumeText } from "@/utils/resumeParser";
import type { ResumeState } from "@/hooks/useSessionStore";

interface Props {
  resume: ResumeState | null;
  onChange: (r: ResumeState | null) => void;
}

export function ResumePanel({ resume, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const text = await extractResumeText(file);
      if (!text || text.length < 30) {
        throw new Error("Couldn't read meaningful text from that file.");
      }
      onChange({ text, fileName: file.name, updatedAt: Date.now() });
    } catch (e: any) {
      setError(e?.message || "Failed to read resume.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-5xl mt-8 bg-card/50 border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm text-warm font-medium">Resume-aware Technical mode</div>
          <div className="text-xs text-warm-muted mt-1">
            {resume
              ? `Loaded: ${resume.fileName} — questions will probe your actual experience.`
              : "Upload your resume (PDF or TXT) and Technical questions will dig into your real projects."}
          </div>
          {error && <div className="text-xs text-destructive mt-2">{error}</div>}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? "Reading…" : resume ? "Replace" : "Upload resume"}
          </button>
          {resume && (
            <button
              onClick={() => onChange(null)}
              className="text-xs px-3 py-2 rounded-lg bg-secondary text-warm-muted hover:text-warm transition"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
