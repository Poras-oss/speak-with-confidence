import { useCallback, useEffect, useState } from "react";
import type { FeedbackPayload } from "./useNvidiaAI";
import type { Difficulty, Domain, ModeId } from "@/config/modes";

const KEYS = {
  apiKey: "voxmind:apiKey",
  settings: "voxmind:settings",
  sessions: "voxmind:sessions",
  streak: "voxmind:streak",
  resume: "voxmind:resume",
} as const;

export interface ResumeState {
  text: string;
  fileName: string;
  updatedAt: number;
}

export type STTEngine = "browser" | "whisper";
export type WhisperModelId = "tiny" | "base";

export interface Settings {
  difficulty: Difficulty;
  domain: Domain;
  duration: number;
  autoAdvance: boolean;
  showFillers: boolean;
  revealIdeal: boolean;
  sttEngine: STTEngine;
  whisperModel: WhisperModelId;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: "Intermediate",
  domain: "General Interview",
  duration: 60,
  autoAdvance: false,
  showFillers: true,
  revealIdeal: true,
  sttEngine: "browser",
  whisperModel: "tiny",
};

export interface SessionRecord {
  id: string;
  date: number;
  mode: ModeId | string;
  question: string;
  transcript: string;
  durationSec: number;
  feedback: FeedbackPayload;
}

export interface StreakState {
  count: number;
  lastDay: string; // YYYY-MM-DD
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");
  useEffect(() => {
    setApiKeyState(read<string>(KEYS.apiKey, ""));
  }, []);
  const setApiKey = useCallback((v: string) => {
    setApiKeyState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(KEYS.apiKey, JSON.stringify(v));
      else localStorage.removeItem(KEYS.apiKey);
    }
  }, []);
  return { apiKey, setApiKey };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setSettingsState(read<Settings>(KEYS.settings, DEFAULT_SETTINGS));
  }, []);
  const setSettings = useCallback((s: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...s };
      write(KEYS.settings, next);
      return next;
    });
  }, []);
  return { settings, setSettings };
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  useEffect(() => {
    setSessions(read<SessionRecord[]>(KEYS.sessions, []));
  }, []);
  const addSession = useCallback((s: SessionRecord) => {
    setSessions((prev) => {
      const next = [s, ...prev].slice(0, 200);
      write(KEYS.sessions, next);
      return next;
    });
  }, []);
  const clearSessions = useCallback(() => {
    setSessions([]);
    write(KEYS.sessions, []);
  }, []);
  return { sessions, addSession, clearSessions };
}

export function useStreak() {
  const [streak, setStreak] = useState<StreakState>({ count: 0, lastDay: "" });
  useEffect(() => {
    setStreak(read<StreakState>(KEYS.streak, { count: 0, lastDay: "" }));
  }, []);
  const bump = useCallback(() => {
    setStreak((prev) => {
      const today = todayKey();
      if (prev.lastDay === today) return prev;
      const next: StreakState = {
        count: prev.lastDay === yesterdayKey() ? prev.count + 1 : 1,
        lastDay: today,
      };
      write(KEYS.streak, next);
      return next;
    });
  }, []);
  return { streak, bump };
}

export function useResume() {
  const [resume, setResumeState] = useState<ResumeState | null>(null);
  useEffect(() => {
    setResumeState(read<ResumeState | null>(KEYS.resume, null));
  }, []);
  const setResume = useCallback((r: ResumeState | null) => {
    setResumeState(r);
    if (typeof window !== "undefined") {
      if (r) localStorage.setItem(KEYS.resume, JSON.stringify(r));
      else localStorage.removeItem(KEYS.resume);
    }
  }, []);
  return { resume, setResume };
}
