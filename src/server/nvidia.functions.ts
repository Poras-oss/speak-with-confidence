import { createServerFn } from "@tanstack/react-start";

const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "meta/llama-3.3-70b-instruct";

interface ChatInput {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  apiKeyOverride?: string;
}

export const nvidiaChat = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || typeof input.prompt !== "string" || input.prompt.length === 0) {
      throw new Error("prompt is required");
    }
    if (input.prompt.length > 8000) throw new Error("prompt too long");
    return {
      prompt: input.prompt,
      temperature: typeof input.temperature === "number" ? input.temperature : 0.7,
      max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : 800,
      apiKeyOverride: typeof input.apiKeyOverride === "string" ? input.apiKeyOverride : undefined,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = data.apiKeyOverride || process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "NVIDIA_API_KEY not configured on server.", content: "" };
    }
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: data.prompt }],
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          stream: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false as const, error: `NVIDIA API ${res.status}: ${text.slice(0, 200)}`, content: "" };
      }
      const json: any = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, content: content.trim(), error: null };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Request failed", content: "" };
    }
  });
