const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "meta/llama-3.3-70b-instruct";

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
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.max_tokens ?? 800,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NVIDIA API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

export async function generateText(apiKey: string, prompt: string) {
  const out = await chat(apiKey, prompt, { temperature: 0.85, max_tokens: 200 });
  // Strip surrounding quotes if any
  return out.replace(/^["']|["']$/g, "").trim();
}

export async function generateFeedback(apiKey: string, prompt: string): Promise<FeedbackPayload> {
  const out = await chat(apiKey, prompt, { temperature: 0.4, max_tokens: 900 });
  const json = extractJson(out);
  return normalizeFeedback(json);
}

export async function testApiKey(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const out = await chat(apiKey, "Say hi", { temperature: 0, max_tokens: 10 });
    if (out && out.length > 0) return { ok: true };
    return { ok: false, error: "Empty response from NVIDIA API." };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Request failed (network or CORS)." };
  }
}

function extractJson(s: string): any {
  // Try to extract first JSON object
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
