import { nvidiaChat } from "@/server/nvidia.functions";

export interface FeedbackPayload {
  scores: {
    structure: number;
    clarity: number;
    completeness: number;
    confidence_estimate: number;
  };
  nailed: string[];
  improve: string[];
  ideal_framework: string[];
  reframe: string;
}

async function chat(apiKey: string, prompt: string, opts?: { temperature?: number; max_tokens?: number }) {
  const result = await nvidiaChat({
    data: {
      prompt,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.max_tokens ?? 800,
      apiKeyOverride: apiKey || undefined,
    },
  });
  if (!result.ok) {
    throw new Error(result.error || "NVIDIA request failed");
  }
  return result.content;
}

export async function generateText(apiKey: string, prompt: string) {
  const out = await chat(apiKey, prompt, { temperature: 0.85, max_tokens: 200 });
  return out.replace(/^["']|["']$/g, "").trim();
}

export async function generateFeedback(apiKey: string, prompt: string): Promise<FeedbackPayload> {
  try {
    const out = await chat(apiKey, prompt, { temperature: 0.4, max_tokens: 900 });
    const json = extractJson(out);
    return normalizeFeedback(json);
  } catch (e) {
    // Fallback only when the main call fails
    return fallbackFeedback();
  }
}

export async function testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await nvidiaChat({
      data: {
        prompt: "Say hi",
        temperature: 0,
        max_tokens: 10,
        apiKeyOverride: apiKey || undefined,
      },
    });
    if (result.ok && result.content) return { ok: true };
    return { ok: false, error: result.error || "Empty response from NVIDIA API." };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Request failed." };
  }
}

/** True if the server has a configured NVIDIA_API_KEY (no client key needed). */
export async function serverKeyAvailable(): Promise<boolean> {
  try {
    const result = await nvidiaChat({
      data: { prompt: "ping", temperature: 0, max_tokens: 1 },
    });
    // ok=true means it worked. ok=false with "not configured" means no env key.
    if (result.ok) return true;
    if (result.error && result.error.includes("not configured")) return false;
    // Other errors (e.g. rate limit) still mean a key is configured.
    return true;
  } catch {
    return false;
  }
}

function extractJson(s: string): any {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in feedback response");
  const slice = candidate.slice(start, end + 1);
  return JSON.parse(slice);
}

function clamp(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function normalizeFeedback(obj: any): FeedbackPayload {
  return {
    scores: {
      structure: clamp(obj?.scores?.structure),
      clarity: clamp(obj?.scores?.clarity),
      completeness: clamp(obj?.scores?.completeness),
      confidence_estimate: clamp(obj?.scores?.confidence_estimate),
    },
    nailed: Array.isArray(obj?.nailed) ? obj.nailed.slice(0, 4).map(String) : [],
    improve: Array.isArray(obj?.improve) ? obj.improve.slice(0, 4).map(String) : [],
    ideal_framework: Array.isArray(obj?.ideal_framework) ? obj.ideal_framework.slice(0, 8).map(String) : [],
    reframe: typeof obj?.reframe === "string" ? obj.reframe : "Every rep counts. Try again.",
  };
}

function fallbackFeedback(): FeedbackPayload {
  return {
    scores: { structure: 5, clarity: 5, completeness: 5, confidence_estimate: 5 },
    nailed: ["You showed up and spoke — that's the rep that matters."],
    improve: ["Feedback service was unreachable. Try again in a moment."],
    ideal_framework: [
      "Open with a one-line summary of your point.",
      "Give 2–3 supporting reasons or examples.",
      "Close with the takeaway or a confident summary.",
    ],
    reframe: "The model hiccuped — your effort still counts. Try once more.",
  };
}
