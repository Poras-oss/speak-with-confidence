export type ModeId = "extempore" | "technical" | "gd" | "conversation" | "devsim" | "pitch" | "story" | "interview";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface ModeConfig {
  id: ModeId | string;
  name: string;
  short: string;
  description: string;
  difficulty: "Easy" | "Core" | "Challenging";
  icon: string;
  comingSoon?: boolean;
  defaultDuration: number; // seconds
}

export type DevSimSubMode = "code-review" | "hld" | "lld" | "debugging";
export type PitchType = "sales" | "startup" | "idea";
export type InterviewType = "behavioral" | "technical-depth" | "resume-deep-dive";

export interface DevSimSubModeConfig {
  id: DevSimSubMode;
  name: string;
  description: string;
  aiRole: string;
  icon: string;
}

export interface PitchTypeConfig {
  id: PitchType;
  name: string;
  description: string;
  aiRole: string;
  icon: string;
}

export interface InterviewTypeConfig {
  id: InterviewType;
  name: string;
  description: string;
  aiRole: string;
  icon: string;
}

export const DEV_SIM_SUBMODES: DevSimSubModeConfig[] = [
  {
    id: "code-review",
    name: "Code Review",
    description: "Review a PR verbally, explain architectural issues, and suggest refactoring.",
    aiRole: "Author of the PR (Senior Software Engineer)",
    icon: "🔍",
  },
  {
    id: "hld",
    name: "High-Level Design",
    description: "Propose and explain a system architecture, databases, cache layers, and scaling strategies.",
    aiRole: "System Design Interviewer / Principal Engineer",
    icon: "🏗️",
  },
  {
    id: "lld",
    name: "Low-Level Design",
    description: "Detail class diagrams, API endpoints, design patterns, and database schemas.",
    aiRole: "Tech Lead requesting details for implementation",
    icon: "📐",
  },
  {
    id: "debugging",
    name: "Debugging Session",
    description: "Talk through a production issue report, explain your mental model, and pinpoint solutions.",
    aiRole: "Junior Developer asking for debugging guidance",
    icon: "🪲",
  },
];

export const PITCH_TYPES: PitchTypeConfig[] = [
  {
    id: "sales",
    name: "Sales Pitch",
    description: "Pitch a product, address pricing and competition concerns, and close the deal.",
    aiRole: "Skeptical enterprise decision-maker / VP of Tech",
    icon: "💼",
  },
  {
    id: "startup",
    name: "Startup Pitch",
    description: "Pitch your startup idea, market sizing, moat, and business plan.",
    aiRole: "Skeptical Venture Capitalist (VC) Investor",
    icon: "🚀",
  },
  {
    id: "idea",
    name: "Idea Pitch",
    description: "Pitch a technical migration, process improvement, or new feature to the team.",
    aiRole: "Skeptical Engineering Manager / Peer Developers",
    icon: "💡",
  },
];

export const INTERVIEW_TYPES: InterviewTypeConfig[] = [
  {
    id: "behavioral",
    name: "Behavioral Round",
    description: "Practice STAR answers, conflict stories, ownership, failure, leadership, and follow-up probing.",
    aiRole: "Hiring Manager",
    icon: "BR",
  },
  {
    id: "technical-depth",
    name: "Technical Round",
    description: "Answer practical engineering questions with trade-offs, constraints, edge cases, and follow-up pressure.",
    aiRole: "Senior Technical Interviewer",
    icon: "TR",
  },
  {
    id: "resume-deep-dive",
    name: "Resume Deep Dive",
    description: "Defend resume claims, explain project decisions, metrics, impact, and what you personally owned.",
    aiRole: "Staff Engineer Interviewer",
    icon: "RD",
  },
];

export const MODES: ModeConfig[] = [
  {
    id: "extempore",
    name: "Extempore",
    short: "Free Speaking",
    description: "Random topic. Speak freely. Build the muscle of starting.",
    difficulty: "Easy",
    icon: "✦",
    defaultDuration: 60,
  },
  {
    id: "technical",
    name: "Technical Explainer",
    short: "Core Mode",
    description: "Interview-style technical question. Explain it out loud.",
    difficulty: "Core",
    icon: "◆",
    defaultDuration: 120,
  },
  {
    id: "interview",
    name: "AI Interview Practice",
    short: "Real Mock Interview",
    description: "A serious interview round with follow-ups, probing, and full-session feedback.",
    difficulty: "Challenging",
    icon: "AI",
    defaultDuration: 300,
  },
  {
    id: "conversation",
    name: "1-on-1 Conversation",
    short: "Daily Practice",
    description: "Spoken english practice. Daily english speaking practice in a low-pressure back-and-forth chat.",
    difficulty: "Easy",
    icon: "💬",
    defaultDuration: 300,
  },
  {
    id: "devsim",
    name: "Dev's Day Out",
    short: "Coding Collaboration",
    description: "Verbal code review, LLD/HLD, and debugging sessions. Simulate real dev jobs.",
    difficulty: "Challenging",
    icon: "🖥️",
    defaultDuration: 300,
  },
  {
    id: "pitch",
    name: "Convince the Room",
    short: "Persuasion Arena",
    description: "Practice sales, startup, or product pitches. Handle tough objections from the AI.",
    difficulty: "Core",
    icon: "🎯",
    defaultDuration: 300,
  },
  {
    id: "story",
    name: "Story Narration",
    short: "Creative Delivery",
    description: "Narrate a story based on AI prompts. Master narrative pacing and emotional hook.",
    difficulty: "Easy",
    icon: "📖",
    defaultDuration: 90,
  },
  {
    id: "gd",
    name: "Group Discussion",
    short: "Coming Soon",
    description: "Take a position on a statement. Argue with structure.",
    difficulty: "Challenging",
    icon: "❖",
    comingSoon: true,
    defaultDuration: 90,
  },
  { id: "debate", name: "Debate", short: "Coming Soon", description: "Defend a side under pressure.", difficulty: "Challenging", icon: "✧", comingSoon: true, defaultDuration: 90 },
];

export const DOMAINS = [
  "DSA",
  "System Design",
  "OOP",
  "Frontend",
  "Backend",
  "Databases",
  "Behavioral/HR",
  "General Interview",
] as const;
export type Domain = (typeof DOMAINS)[number];

export const DURATIONS = [30, 60, 90, 120, 180, 300] as const;
