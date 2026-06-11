export type ModeId = "extempore" | "technical" | "gd" | "conversation";
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
    id: "conversation",
    name: "1-on-1 Conversation",
    short: "Daily Practice",
    description: "Spoken english practice. Daily english speaking practice in a low-pressure back-and-forth chat.",
    difficulty: "Easy",
    icon: "💬",
    defaultDuration: 300,
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
  { id: "story", name: "Story Narration", short: "Coming Soon", description: "Tell a compelling story.", difficulty: "Easy", icon: "✧", comingSoon: true, defaultDuration: 90 },
  { id: "sales", name: "Sales Pitch", short: "Coming Soon", description: "Pitch a product persuasively.", difficulty: "Core", icon: "✧", comingSoon: true, defaultDuration: 90 },
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
