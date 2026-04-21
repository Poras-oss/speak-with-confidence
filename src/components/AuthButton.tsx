import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkEnabled = !!CLERK_KEY && !CLERK_KEY.includes("REPLACE_ME");

/**
 * Renders Clerk auth controls when Clerk is configured.
 * Returns null gracefully if no key is set, so the app stays usable.
 */
export function AuthButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!clerkEnabled || !mounted) return null;

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className="ml-1 flex items-center">
          <UserButton
            appearance={{
              elements: { avatarBox: "h-7 w-7" },
            }}
          />
        </div>
      </SignedIn>
    </>
  );
}
