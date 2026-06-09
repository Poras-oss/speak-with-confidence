import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkEnabled = !!CLERK_KEY && !CLERK_KEY.includes("REPLACE_ME");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoxMind — Free AI Speech Practice App | Speak Confidently & Effectively" },
      {
        name: "description",
        content:
          "The ultimate AI speech practice tool. Master impromptu speaking, nail presentations, and prepare for exams like ACT English Practice with structured feedback.",
      },
      { property: "og:title", content: "VoxMind — AI Speech Practice App" },
      {
        property: "og:description",
        content:
          "An AI speech practice app that listens, transcribes, and gives honest feedback. Rebuild speaking confidence and master impromptu speaking one rep at a time.",
      },
    ],
  }),
  component: Landing,
});

/* ---------- Primary CTA: opens sign-in modal for guests, navigates to /app for signed-in users ---------- */
function StartCTA({
  children,
  className = "",
  size = "md",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[0_8px_30px_-10px_rgba(124,58,237,0.6)]";
  const sizes = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm";
  const cls = `${base} ${sizes} bg-[#7C3AED] hover:bg-[#6d28d9] text-white ${className}`;

  if (!clerkEnabled) {
    return (
      <Link to="/app" className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <>
      <SignedIn>
        <Link to="/app" className={cls}>
          {children}
        </Link>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/app">
          <button className={cls}>{children}</button>
        </SignInButton>
      </SignedOut>
    </>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F0E8] font-display antialiased selection:bg-[#7C3AED]/40">
      <Nav />
      <Hero />
      <FounderStory />
      <Problem />
      <HowItWorks />
      <Modes />
      <Science />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* ---------- Sticky Nav ---------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-[#080808]/80 border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-[#7C3AED] text-xl">◈</span>
          <span className="text-[#F5F0E8] font-semibold tracking-tight text-lg">VoxMind</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-[#a0a0a0]">
          <a href="#how" className="hover:text-[#F5F0E8] transition">How it works</a>
          <a href="#modes" className="hover:text-[#F5F0E8] transition">Modes</a>
          <a href="#science" className="hover:text-[#F5F0E8] transition">Science</a>
        </nav>
        <div className="flex items-center gap-2">
          {clerkEnabled && (
            <SignedIn>
              <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
            </SignedIn>
          )}
          <StartCTA>Start Free</StartCTA>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  const headline = "Your mind went blank. Train it not to.";
  const words = headline.split(" ");
  return (
    <section className="relative overflow-hidden">
      {/* Ambient violet glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(124,58,237,0.18), transparent 70%)",
        }}
      />
      {/* Subtle waveform */}
      <Waveform />

      <div className="relative max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-32 md:pt-36 md:pb-44 text-center">
        <h1 className="sr-only">VoxMind - Free AI Speech Practice App for Impromptu Speaking, Presentations, and ACT English Practice</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-xs text-[#a0a0a0] mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] animate-pulse-soft" />
          The #1 Free AI Speech Practice App
        </div>

        <h1 className="text-[44px] sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-[-0.02em] text-[#F5F0E8]">
          {words.map((w, i) => (
            <span
              key={i}
              className="inline-block mr-[0.25em] animate-fade-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
            >
              {w}
            </span>
          ))}
        </h1>

        <p
          className="mt-8 text-[17px] md:text-lg text-[#a0a0a0] leading-relaxed max-w-xl mx-auto animate-fade-up"
          style={{ animationDelay: "700ms", animationFillMode: "backwards" }}
        >
          VoxMind is an AI speech practice tool that listens to you speak, transcribes your words, and gives you honest, structured feedback. Whether you are aiming for speaking confidently and effectively in meetings, mastering impromptu speaking, or even doing ACT English practice, VoxMind prepares you.
        </p>

        <div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-up"
          style={{ animationDelay: "850ms", animationFillMode: "backwards" }}
        >
          <StartCTA size="lg">Start Practicing Free →</StartCTA>
          <a
            href="#how"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/15 hover:border-white/30 hover:bg-white/[0.03] text-[#F5F0E8] text-base font-medium transition"
          >
            See How It Works
          </a>
        </div>

        <p
          className="mt-8 text-xs text-[#7a7a7a] animate-fade-in"
          style={{ animationDelay: "1100ms", animationFillMode: "backwards" }}
        >
          Built for students, professionals, and anyone who's ever frozen mid-sentence.
        </p>
      </div>
    </section>
  );
}

function Waveform() {
  // Decorative animated bars
  const bars = Array.from({ length: 60 });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 flex items-end justify-center gap-[3px] opacity-[0.18]"
    >
      {bars.map((_, i) => (
        <span
          key={i}
          className="w-[3px] bg-gradient-to-t from-[#7C3AED] to-transparent rounded-full animate-pulse-soft"
          style={{
            height: `${20 + Math.abs(Math.sin(i * 0.5)) * 80}%`,
            animationDelay: `${i * 60}ms`,
            animationDuration: `${1800 + (i % 5) * 200}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Founder Story ---------- */
function FounderStory() {
  return (
    <section className="bg-[#111111] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        <div className="border-l-2 border-[#7C3AED] pl-6 md:pl-10">
          <p className="text-3xl md:text-5xl font-bold italic text-[#7C3AED] leading-[1.15] tracking-tight">
            "My eyes went dark. I started to faint. The room was watching."
          </p>
        </div>
        <div className="space-y-5 text-[17px] leading-[1.9] text-[#F5F0E8]/90">
          <p>
            I was mid-presentation when my body just… shut down. Vision went dark, knees buckled,
            mind completely blank. I'd always been able to explain my ideas — not perfectly, but
            confidently. After that day, I couldn't.
          </p>
          <p>
            Every time I tried to speak up, my mind would spiral. Awkward silence → more awkward →
            total shutdown. I looked for tools to practice but nothing felt right.
          </p>
          <p>
            So I built VoxMind. For me. And for everyone who knows exactly what that spiral feels like.
          </p>
          <p className="text-sm text-[#a0a0a0] pt-2">— Developer of VoxMind</p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Problem ---------- */
function Problem() {
  const cards = [
    {
      icon: "↻",
      title: "The Anxiety Spiral (Glossophobia)",
      body:
        "You go blank → feel awkward → go more blank. Glossophobia feeds itself through avoidance. You avoid speaking, which only makes the fear stronger.",
    },
    {
      icon: "🎙",
      title: "No Safe Space to Practice",
      body:
        "Practicing in real meetings or interviews is high-stakes. You need a low-pressure, private space to make mistakes, run exposure exercises, and learn from them.",
    },
    {
      icon: "💬",
      title: "Objective Feedback is Everything",
      body:
        "Toastmasters is great — but it's once a week. You need deliberate practice. Daily, private reps with AI-driven, objective feedback on your clarity and structure.",
    },
  ];
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center max-w-3xl mx-auto leading-tight">
          You're not bad at speaking. You're suffering from <span className="text-[#7C3AED]">Glossophobia</span>.
        </h2>
        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <div
              key={i}
              className="group relative bg-[#161616] border border-white/5 hover:border-[#7C3AED]/50 rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-2xl text-[#7C3AED] mb-5">
                {c.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{c.title}</h3>
              <p className="text-[15px] text-[#a0a0a0] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick your mode",
      body:
        "Choose from Technical Interview, Extempore, or Group Discussion. VoxMind generates the question — you just speak.",
    },
    {
      n: "02",
      title: "Speak freely",
      body:
        "Your words appear on screen in real time as you talk. Full screen. No judgment. Just you and your thoughts becoming text.",
    },
    {
      n: "03",
      title: "Get brutal feedback",
      body:
        "AI scores your answer on structure, clarity, and completeness. You see what you nailed, what to improve, and what a great answer looks like.",
    },
  ];
  return (
    <section id="how" className="py-24 md:py-32 bg-[#0c0c0c] border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-center max-w-3xl mx-auto leading-tight">
          Three steps. No audience. Just you and your voice.
        </h2>
        <div className="mt-16 grid md:grid-cols-3 gap-10 md:gap-6">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="text-6xl md:text-7xl font-bold text-[#7C3AED] mb-4 tracking-tight tabular-nums">
                {s.n}
              </div>
              <h3 className="text-2xl font-semibold mb-3">{s.title}</h3>
              <p className="text-[15px] text-[#a0a0a0] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex justify-center">
          <StartCTA size="lg">Try a Free Session</StartCTA>
        </div>
      </div>
    </section>
  );
}

/* ---------- Modes ---------- */
function Modes() {
  const modes = [
    {
      icon: "🎤",
      name: "Extempore",
      body: "A random topic. You speak. No prep. Builds raw thinking-on-your-feet confidence and impromptu speaking mastery.",
      badge: "All levels",
    },
    {
      icon: "💻",
      name: "Technical Explainer",
      body:
        "DSA, system design, OOP, frontend, backend. Real interview questions. AI speech practice for presentations and technical communication.",
      badge: "Beginner → Advanced",
    },
    {
      icon: "🗣️",
      name: "Group Discussion",
      body: "A contested statement. Your job is to argue it, structure it, and own the room.",
      badge: "Intermediate",
    },
  ];
  return (
    <section id="modes" className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-2xl leading-tight">
          Practice the way you'll actually be tested.
        </h2>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {modes.map((m) => (
            <div
              key={m.name}
              className="group relative bg-[#141414] border border-white/5 rounded-2xl p-8 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/10"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-60" />
              <div className="text-3xl mb-5">{m.icon}</div>
              <h3 className="text-xl font-semibold mb-3">{m.name}</h3>
              <p className="text-[15px] text-[#a0a0a0] leading-relaxed mb-6">{m.body}</p>
              <span className="inline-block text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#7C3AED]/10 text-[#a78bfa] border border-[#7C3AED]/20">
                {m.badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Science ---------- */
function Science() {
  return (
    <section id="science" className="py-24 md:py-32 bg-[#0c0c0c] border-y border-white/5">
      <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
          This isn't just practice. It's <span className="text-[#7C3AED]">Cognitive Restructuring</span>.
        </h2>
        <p className="mt-8 text-[17px] text-[#a0a0a0] leading-[1.9]">
          VoxMind is built on three clinically-proven, evidence-backed methods:{" "}
          <span className="text-[#F5F0E8]">Graduated Exposure Therapy</span> — starting small with an AI and
          building up voluntarily; <span className="text-[#F5F0E8]">Cognitive Behavioral Therapy (CBT)</span>{" "}
          principles — reframing catastrophic thoughts like "I will make a fool of myself" into "I successfully structured 3 points"; and{" "}
          <span className="text-[#F5F0E8]">Deliberate Practice</span> — high-volume, feedback-rich
          reps that break the cycle of avoidance and rewire neural pathways.
        </p>
        <p className="mt-5 text-[17px] text-[#a0a0a0] leading-[1.9]">
          Every session acts as a digital exposure rep. Reps build the pathways. Pathways override panic.
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {[
            "75% of people fear public speaking",
            "Exposure therapy: 80%+ success for phobias",
            "Skill + reps = confidence — not talent",
          ].map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Testimonials ---------- */
function Testimonials() {
  const t = [
    {
      quote:
        "I bombed a panel interview so badly I cried in my car. VoxMind gave me somewhere to go every day. My next interview, I answered every question without freezing once.",
      name: "Aarav S.",
      role: "Software Engineer",
    },
    {
      quote:
        "I'm an introvert at a company that loves meetings. Two weeks of daily sessions and I actually volunteered to present. That never happens.",
      name: "Meera T.",
      role: "Product Manager",
    },
    {
      quote:
        "The real-time transcription thing is wild. Seeing your words appear while you speak makes you think differently. Slower. Clearer.",
      name: "Rahul K.",
      role: "Final Year CS Student",
    },
  ];
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
          From people who know the spiral.
        </h2>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {t.map((q) => (
            <figure
              key={q.name}
              className="bg-[#141414] border border-white/5 rounded-2xl p-8 flex flex-col"
            >
              <span className="text-4xl text-[#7C3AED]/60 leading-none mb-4">"</span>
              <blockquote className="text-[15px] text-[#F5F0E8]/90 leading-relaxed flex-1">
                {q.quote}
              </blockquote>
              <figcaption className="mt-6 pt-6 border-t border-white/5">
                <div className="text-sm font-semibold text-[#F5F0E8]">{q.name}</div>
                <div className="text-xs text-[#a0a0a0] mt-0.5">{q.role}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 50%, rgba(124,58,237,0.22), transparent 70%)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6 md:px-10 text-center">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Your ideas deserve to be heard.
        </h2>
        <p className="mt-6 text-lg text-[#a0a0a0] max-w-xl mx-auto">
          Start free. No account needed for your first session. Just a mic and something you want to say.
        </p>
        <div className="mt-10 flex justify-center">
          <StartCTA size="lg">Start Practicing Now →</StartCTA>
        </div>
        <p className="mt-6 text-xs text-[#7a7a7a]">
          Free to use. Groq-powered AI. Runs in your browser.
        </p>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[#7a7a7a]">
        <div className="flex items-center gap-2">
          <span className="text-[#7C3AED]">◈</span>
          <span className="text-[#F5F0E8] font-medium">VoxMind</span>
          <span className="opacity-60">— Train your voice.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how" className="hover:text-[#F5F0E8] transition">How it works</a>
          <a href="#modes" className="hover:text-[#F5F0E8] transition">Modes</a>
          <a href="#science" className="hover:text-[#F5F0E8] transition">Science</a>
          <Link to="/blog" className="hover:text-[#F5F0E8] transition">Blog</Link>
        </div>
      </div>
    </footer>
  );
}
