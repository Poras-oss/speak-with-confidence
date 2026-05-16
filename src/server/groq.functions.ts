import { createServerFn } from "@tanstack/react-start";

const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.3-70b-versatile";

interface ChatInput {
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  apiKeyOverride?: string;
}

export const groqChat = createServerFn({ method: "POST" })
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
    const apiKey = data.apiKeyOverride || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "GROQ_API_KEY not configured on server.", content: "" };
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
        return { ok: false as const, error: `Groq API ${res.status}: ${text.slice(0, 200)}`, content: "" };
      }
      const json: any = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      return { ok: true as const, content: content.trim(), error: null };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Request failed", content: "" };
    }
  });

interface TranscribeInput {
  audioBase64: string;
  apiKeyOverride?: string;
}

export const groqTranscribe = createServerFn({ method: "POST" })
  .inputValidator((input: TranscribeInput) => {
    if (!input || typeof input.audioBase64 !== "string" || input.audioBase64.length === 0) {
      throw new Error("audioBase64 is required");
    }
    return {
      audioBase64: input.audioBase64,
      apiKeyOverride: typeof input.apiKeyOverride === "string" ? input.apiKeyOverride : undefined,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = data.apiKeyOverride || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "GROQ_API_KEY not configured on server.", text: "" };
    }
    try {
      const buffer = Buffer.from(data.audioBase64, "base64");
      const blob = new Blob([buffer], { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", blob, "audio.wav");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("response_format", "json");
      formData.append("language", "en");

      const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false as const, error: `Groq STT API ${res.status}: ${text.slice(0, 200)}`, text: "" };
      }

      const json: any = await res.json();
      const text: string = json?.text ?? "";
      return { ok: true as const, text: text.trim(), error: null };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Request failed", text: "" };
    }
  });
