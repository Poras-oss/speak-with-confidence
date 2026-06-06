import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ─── Auth helper ────────────────────────────────────────────────────────────
function isAuthorized(req: Request): boolean {
  const adminKey = Deno.env.get("ADMIN_API_KEY");
  if (!adminKey) return false; // no key configured → deny everything
  const incoming = req.headers.get("x-admin-key") || "";
  return incoming === adminKey;
}

// ─── Supabase admin client (service role) ────────────────────────────────────
function getSupabase() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ─── Response helpers ────────────────────────────────────────────────────────
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Route handlers ──────────────────────────────────────────────────────────

/** GET /admin?action=list-users
 *  Returns all rows in user_profiles ordered by created_at desc */
async function listUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, plan, extempore_count, last_extempore_date")
    .order("last_extempore_date", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json({ users: data });
}

/** POST /admin?action=set-premium
 *  Body: { userId: string, plan: "free" | "premium" }
 *  Updates plan for the given user */
async function setPremium(req: Request) {
  let body: { userId?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { userId, plan } = body;
  if (!userId || typeof userId !== "string") {
    return json({ error: "userId is required" }, 400);
  }
  if (plan !== "free" && plan !== "premium") {
    return json({ error: 'plan must be "free" or "premium"' }, 400);
  }

  const supabase = getSupabase();

  // Upsert — so it works even if the user profile doesn't exist yet
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        plan,
        extempore_count: 0,
        last_extempore_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id" }
    )
    .select("user_id, plan")
    .single();

  if (error) return json({ error: error.message }, 500);
  return json({ success: true, user: data });
}

/** POST /admin?action=reset-count
 *  Body: { userId: string }
 *  Resets extempore_count to 0 for the given user */
async function resetCount(req: Request) {
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { userId } = body;
  if (!userId || typeof userId !== "string") {
    return json({ error: "userId is required" }, 400);
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("user_profiles")
    .update({
      extempore_count: 0,
      last_extempore_date: new Date().toISOString().split("T")[0],
    })
    .eq("user_id", userId);

  if (error) return json({ error: error.message }, 500);
  return json({ success: true });
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth check
  if (!isAuthorized(req)) {
    return json({ error: "Unauthorized — provide a valid x-admin-key header" }, 401);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "list-users":
        return await listUsers();

      case "set-premium":
        if (req.method !== "POST") return json({ error: "Use POST for this action" }, 405);
        return await setPremium(req);

      case "reset-count":
        if (req.method !== "POST") return json({ error: "Use POST for this action" }, 405);
        return await resetCount(req);

      default:
        return json(
          {
            error: "Unknown action. Valid actions: list-users | set-premium | reset-count",
            usage: {
              "list-users": "GET ?action=list-users",
              "set-premium": 'POST ?action=set-premium  body: { userId, plan: "free"|"premium" }',
              "reset-count": "POST ?action=reset-count  body: { userId }",
            },
          },
          400
        );
    }
  } catch (err: any) {
    return json({ error: err?.message || "Internal server error" }, 500);
  }
});
