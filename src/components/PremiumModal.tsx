import { useState } from "react";
import { createRazorpayOrderEdge, upgradeToPremium } from "@/utils/supabase";
import { useRazorpay } from "react-razorpay";

interface Props {
  open: boolean;
  onClose: () => void;
  userId?: string;
  onSuccess?: () => void;
}

export function PremiumModal({ open, onClose, userId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safely hook into react-razorpay
  const { Razorpay: RazorpayHook, isLoading: isLoaded } = useRazorpay();

  if (!open) return null;

  const handlePayment = async () => {
    if (!userId) {
      setError("Please sign in first to upgrade to premium.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create order via Supabase Edge Function
      const order = await createRazorpayOrderEdge(userId);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_mock_key",
        amount: order.amount,
        currency: order.currency as any,
        name: "VoxMind Premium",
        description: "30 Days Unlimited Access",
        order_id: order.orderId,
        handler: async (response: any) => {
          console.log("[Razorpay] Payment success:", response);
          // Update profile locally/Supabase
          await upgradeToPremium(userId);
          onSuccess?.();
          onClose();
        },
        prefill: {
          name: "VoxMind Speaker",
          email: "speaker@voxmind.app",
        },
        theme: {
          color: "#E2E8F0", // matches warm/dark theme
        },
      };

      // 2. Open Razorpay Checkout
      if (typeof window !== "undefined") {
        if (RazorpayHook) {
          const rzp = new RazorpayHook(options);
          rzp.open();
        } else if ((window as any).Razorpay) {
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          // Load script dynamically as fallback
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => {
            const rzp = new (window as any).Razorpay(options);
            rzp.open();
          };
          document.body.appendChild(script);
        }
      }
    } catch (err: any) {
      console.error("[PremiumModal] Payment error:", err);
      setError(err.message || "Failed to initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
        style={{ animation: "fade-up 0.3s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* Top Gradient Banner */}
        <div className="h-24 bg-gradient-to-r from-primary via-purple-500 to-pink-500 flex items-center justify-center p-6 relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition"
            >
              ×
            </button>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight shadow-sm">
            VoxMind Premium
          </h2>
        </div>

        <div className="p-8 space-y-6 flex-1">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-warm">
              ₹99 <span className="text-sm font-normal text-warm-muted">/ 30 Days</span>
            </div>
            <p className="text-sm text-warm-muted">
              One-time payment. No automatic renewal.
            </p>
          </div>

          <div className="space-y-4 border-t border-b border-border py-6">
            <FeatureItem
              title="Unlimited Extempore Practice"
              description="Practice as much as you want. Bypass the 5 daily free limit."
            />
            <FeatureItem
              title="Unlock Resume Questions"
              description="Upload your resume. AI generates personalized technical interview questions probing your real experience."
            />
            <FeatureItem
              title="No API Key Required"
              description="Use our enterprise cloud AI infrastructure powered by Groq Whisper and Llama 3."
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-semibold text-lg shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Securely Initializing...</span>
              ) : (
                <span>Upgrade Now for ₹99</span>
              )}
            </button>
            <div className="text-center mt-3 text-xs text-warm-muted flex items-center justify-center gap-1">
              <span>🔒 Secured by Razorpay & Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
        ✓
      </div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-warm">{title}</div>
        <div className="text-xs text-warm-muted leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
