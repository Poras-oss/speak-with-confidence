import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://xyzcompany.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  user_id: string;
  plan: "free" | "premium";
  extempore_count: number;
  last_extempore_date: string;
}

// In-memory fallback for local testing when Supabase credentials aren't set
const mockProfiles: Record<string, UserProfile> = {};

const isMock = !import.meta.env.VITE_SUPABASE_URL;

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const today = new Date().toISOString().split("T")[0];

  if (isMock) {
    if (!mockProfiles[userId]) {
      mockProfiles[userId] = {
        user_id: userId,
        plan: "free",
        extempore_count: 0,
        last_extempore_date: today,
      };
    }
    const profile = mockProfiles[userId];
    if (profile.last_extempore_date !== today) {
      profile.extempore_count = 0;
      profile.last_extempore_date = today;
    }
    return { ...profile };
  }

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      // Create new profile
      const newProfile: UserProfile = {
        user_id: userId,
        plan: "free",
        extempore_count: 0,
        last_extempore_date: today,
      };
      await supabase.from("user_profiles").insert([newProfile]);
      return newProfile;
    }

    let profile: UserProfile = data;
    if (profile.last_extempore_date !== today) {
      profile.extempore_count = 0;
      profile.last_extempore_date = today;
      await supabase
        .from("user_profiles")
        .update({ extempore_count: 0, last_extempore_date: today })
        .eq("user_id", userId);
    }

    return profile;
  } catch (err) {
    console.error("[Supabase] Error fetching profile:", err);
    // Return fallback profile so app doesn't break
    return {
      user_id: userId,
      plan: "free",
      extempore_count: 0,
      last_extempore_date: today,
    };
  }
}

export async function incrementExtemporeCount(userId: string): Promise<UserProfile> {
  const profile = await getUserProfile(userId);
  const newCount = profile.extempore_count + 1;
  
  if (isMock) {
    mockProfiles[userId] = { ...profile, extempore_count: newCount };
  }
  
  // Note: The actual database update is now securely handled on the backend
  // inside the Groq server functions. This just updates the UI optimistically.
  return { ...profile, extempore_count: newCount };
}


export async function createRazorpayOrderEdge(userId: string): Promise<{ orderId: string; amount: number; currency: string }> {
  if (isMock) {
    return {
      orderId: "order_mock_" + Date.now(),
      amount: 9900,
      currency: "INR",
    };
  }

  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    body: { userId },
  });

  if (error || !data) {
    throw new Error(error?.message || "Failed to create Razorpay order");
  }

  return data;
}
