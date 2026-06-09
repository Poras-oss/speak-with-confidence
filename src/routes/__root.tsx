import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";

import appCss from "../styles.css?url";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VoxMind — Public Speaking Trainer" },
      {
        name: "description",
        content:
          "Rebuild your voice. A research-backed trainer for people recovering from presentation anxiety.",
      },
      { name: "author", content: "VoxMind" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://voxmind.space" },
      { property: "og:image", content: "https://voxmind.space/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://voxmind.space/og-image.png" },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "canonical",
        href: "https://voxmind.space",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "VoxMind",
              operatingSystem: "Web",
              applicationCategory: "EducationalApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description: "A research-backed public speaking trainer for people recovering from presentation anxiety.",
            }),
          }}
        />
      </head>
      <body className="dark">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // If no Clerk key is configured, render the app without auth (graceful fallback).
  if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY.includes("REPLACE_ME")) {
    if (typeof window !== "undefined") {
      console.warn("[Clerk] VITE_CLERK_PUBLISHABLE_KEY is not set. Auth UI is disabled.");
    }
    return <Outlet />;
  }
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <Outlet />
    </ClerkProvider>
  );
}
