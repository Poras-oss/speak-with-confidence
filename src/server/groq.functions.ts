import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.3-70b-versatile";

// Helper to check and enforce limits on the server
async function enforceServerLimits(): Promise<{ ok: boolean; error?: string }> {
  // Try to get the authenticated user. If Clerk middleware is not wired up on
  // the server (no clerkMiddleware in the Nitro entry), auth() may throw or
  // return null — in that case we skip limit enforcement so questions still load.
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    // Clerk not configured server-side — allow the request through.
    console.warn("[Groq Server] auth() failed — Clerk middleware may not be configured. Skipping limit check.");
    return { ok: true };
  }

  if (!userId) {
    // Not signed in — allow if the server has a GROQ key configured.
    // We rely on the caller to gate access at the UI level.
    return { ok: true };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // If Supabase isn't fully configured, allow it (mock / dev mode)
    return { ok: true };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split("T")[0];

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
      // If profile doesn't exist, create it and allow this use
      await supabase.from("user_profiles").insert([{
        user_id: userId,
        plan: "free",
        extempore_count: 1,
        last_extempore_date: today,
      }]);
      return { ok: true };
    }

    if (profile.plan === "premium") {
      return { ok: true };
    }

    // Reset daily count if it's a new day
    let currentCount = profile.extempore_count;
    if (profile.last_extempore_date !== today) {
      currentCount = 0;
    }

    if (currentCount >= 5) {
      return { ok: false, error: "Daily free limit reached. Upgrade to Premium or use your own API key." };
    }

    // Increment count
    await supabase
      .from("user_profiles")
      .update({ extempore_count: currentCount + 1, last_extempore_date: today })
      .eq("user_id", userId);

    return { ok: true };
  } catch (err: any) {
    console.error("[Groq Server] Supabase limit check error:", err);
    // Don't block the user if the DB check fails — just let it through
    return { ok: true };
  }
}

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
    let apiKey = data.apiKeyOverride;
    
    if (!apiKey) {
      // If no override, check server limits and use server key
      const limitCheck = await enforceServerLimits();
      if (!limitCheck.ok) {
        return { ok: false as const, error: limitCheck.error || "Limit exceeded", content: "" };
      }
      apiKey = process.env.GROQ_API_KEY;
    }

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
    let apiKey = data.apiKeyOverride;
    
    if (!apiKey) {
      // If no override, check server limits and use server key
      const limitCheck = await enforceServerLimits();
      if (!limitCheck.ok) {
        return { ok: false as const, error: limitCheck.error || "Limit exceeded", text: "" };
      }
      apiKey = process.env.GROQ_API_KEY;
    }

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
