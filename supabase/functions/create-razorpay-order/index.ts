import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_mock_key";
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "rzp_test_mock_secret";

    // Call Razorpay API to create an order
    const amount = 9900; // 99 INR in paise
    const currency = "INR";

    const auth = btoa(`${keyId}:${keySecret}`);
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: `rcpt_${userId.substring(userId.length - 8)}_${Date.now().toString(36)}`,
        notes: {
          userId,
          plan: "premium",
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.description || "Razorpay order creation failed");
    }

    return new Response(
      JSON.stringify({
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
