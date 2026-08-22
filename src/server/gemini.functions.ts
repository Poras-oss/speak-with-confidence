import { createServerFn } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-3.5-flash-lite";

// Helper to check and enforce limits on the server
async function enforceServerLimits(): Promise<{ ok: boolean; error?: string }> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    console.debug("[Gemini Server] Clerk auth() not available server-side. Skipping limit check.");
    return { ok: true };
  }

  if (!userId) {
    return { ok: true };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { ok: true };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date().toISOString().split("T")[0];

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !profile) {
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

    let currentCount = profile.extempore_count;
    if (profile.last_extempore_date !== today) {
      currentCount = 0;
    }

    if (currentCount >= 5) {
      return { ok: false, error: "Daily free limit reached. Upgrade to Premium or use your own API key." };
    }

    await supabase
      .from("user_profiles")
      .update({ extempore_count: currentCount + 1, last_extempore_date: today })
      .eq("user_id", userId);

    return { ok: true };
  } catch (err: any) {
    console.error("[Gemini Server] Supabase limit check error:", err);
    return { ok: true };
  }
}

interface ChatInput {
  prompt?: string;
  messages?: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  apiKeyOverride?: string;
}

export const geminiChat = createServerFn({ method: "POST" })
  .inputValidator((input: ChatInput) => {
    if (!input || (!input.prompt && !input.messages)) {
      throw new Error("prompt or messages is required");
    }
    return {
      prompt: input.prompt,
      messages: input.messages,
      temperature: typeof input.temperature === "number" ? input.temperature : 0.7,
      max_tokens: typeof input.max_tokens === "number" ? input.max_tokens : 1024,
      apiKeyOverride: typeof input.apiKeyOverride === "string" ? input.apiKeyOverride : undefined,
    };
  })
  .handler(async ({ data }) => {
    let apiKey = data.apiKeyOverride;
    
    if (!apiKey) {
      const limitCheck = await enforceServerLimits();
      if (!limitCheck.ok) {
        return { ok: false as const, error: limitCheck.error || "Limit exceeded", content: "" };
      }
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    }

    if (!apiKey) {
      return { ok: false as const, error: "GEMINI_API_KEY not configured on server.", content: "" };
    }

    try {
      const contents = data.messages
        ? data.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }))
        : [{ role: "user", parts: [{ text: data.prompt }] }];

      const res = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: data.temperature,
            maxOutputTokens: data.max_tokens,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false as const, error: `Gemini API ${res.status}: ${text.slice(0, 200)}`, content: "" };
      }

      const json: any = await res.json();
      const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        console.warn("[Gemini Server] Empty content", { json });
        return { ok: false as const, error: "Empty response from Gemini API.", content: "" };
      }

      return { ok: true as const, content: content.trim(), error: null };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Request failed", content: "" };
    }
  });
