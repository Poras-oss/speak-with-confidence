import { useState } from "react";
import { testApiKey } from "@/hooks/useNvidiaAI";

interface Props {
  onSaved: (key: string) => void;
}

export function SetupScreen({ onSaved }: Props) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [errMsg, setErrMsg] = useState("");

  const verify = async () => {
    if (!key.trim()) return;
    setStatus("testing");
    setErrMsg("");
    const result = await testApiKey(key.trim());
    if (result.ok) {
      setStatus("ok");
      setTimeout(() => onSaved(key.trim()), 500);
    } else {
      setStatus("fail");
      setErrMsg(result.error || "That key didn't work. Double-check and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
      <div className="w-full max-w-xl animate-fade-up">
        <div className="text-warm-muted text-sm tracking-[0.2em] uppercase mb-3">VoxMind</div>
        <h1 className="text-3xl md:text-4xl font-semibold text-warm mb-3">
          Before we begin.
        </h1>
        <p className="text-warm-muted leading-relaxed mb-8">
          VoxMind uses NVIDIA NIM to generate questions and feedback. You'll need a free
          API key — it stays on your device.
        </p>

        <ol className="space-y-3 mb-8 text-sm">
          <li className="flex gap-3">
            <span className="text-warm-muted">1.</span>
            <span className="text-warm-muted">
              Visit{" "}
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-warm underline underline-offset-4 decoration-border hover:decoration-warm transition"
              >
                build.nvidia.com
              </a>{" "}
              and sign in.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-warm-muted">2.</span>
            <span className="text-warm-muted">
              Open any model (e.g. <span className="text-warm">meta/llama-3.3-70b-instruct</span>) and click "Get API Key".
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-warm-muted">3.</span>
            <span className="text-warm-muted">Paste it below.</span>
          </li>
        </ol>

        <div className="space-y-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="nvapi-..."
            className="w-full bg-input/60 border border-border rounded-xl px-4 py-3.5 text-warm placeholder:text-warm-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition"
          />
          <button
            onClick={verify}
            disabled={!key.trim() || status === "testing"}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium hover:opacity-90 disabled:opacity-40 transition"
          >
            {status === "testing"
              ? "Verifying your key…"
              : status === "ok"
              ? "All set — taking you in…"
              : "Verify & Continue"}
          </button>
          {status === "fail" && (
            <p className="text-destructive text-sm">{errMsg}</p>
          )}
        </div>

        <p className="text-xs text-warm-muted/60 mt-8 leading-relaxed">
          Built on graduated exposure therapy, CBT principles, and deliberate practice.
          Every session is a rep.
        </p>
      </div>
    </div>
  );
}
