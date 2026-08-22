import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getUserProfile, incrementExtemporeCount, type UserProfile, fetchSessionHistory, insertSessionRecord } from "@/utils/supabase";
import type { FeedbackPayload } from "./useGroqAI";
import type { Difficulty, Domain, ModeId } from "@/config/modes";

const KEYS = {
  apiKey: "voxmind:apiKey",
  geminiApiKey: "voxmind:geminiApiKey",
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

export type STTEngine = "groq" | "whisper" | "browser";
export type WhisperModelId = "tiny" | "base" | "distil-small";

export interface Settings {
  difficulty: Difficulty;
  domain: Domain;
  duration: number;
  autoAdvance: boolean;
  showFillers: boolean;
  revealIdeal: boolean;
  sttEngine: STTEngine;
  whisperModel: WhisperModelId;
  extemporeInterests: string;
}

export const DEFAULT_SETTINGS: Settings = {
  difficulty: "Intermediate",
  domain: "General Interview",
  duration: 60,
  autoAdvance: false,
  showFillers: true,
  revealIdeal: true,
  sttEngine: "groq",
  whisperModel: "base",
  extemporeInterests: "",
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

export function useGeminiApiKey() {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>("");
  useEffect(() => {
    setGeminiApiKeyState(read<string>(KEYS.geminiApiKey, ""));
  }, []);
  const setGeminiApiKey = useCallback((v: string) => {
    setGeminiApiKeyState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(KEYS.geminiApiKey, JSON.stringify(v));
      else localStorage.removeItem(KEYS.geminiApiKey);
    }
  }, []);
  return { geminiApiKey, setGeminiApiKey };
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

export function useSessions(userId?: string) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  
  useEffect(() => {
    const local = read<SessionRecord[]>(KEYS.sessions, []);
    setSessions(local);
    
    if (userId) {
      fetchSessionHistory(userId).then((history) => {
        if (history && history.length > 0) {
          const remoteSessions: SessionRecord[] = history.map((h) => ({
            id: h.id,
            date: Number(h.date),
            mode: h.mode,
            question: h.question,
            transcript: h.transcript,
            durationSec: h.duration_sec,
            feedback: h.feedback,
          }));
          setSessions(remoteSessions);
          write(KEYS.sessions, remoteSessions);
        }
      });
    }
  }, [userId]);

  const addSession = useCallback((s: SessionRecord) => {
    setSessions((prev) => {
      const next = [s, ...prev].slice(0, 200);
      write(KEYS.sessions, next);
      return next;
    });

    if (userId) {
      insertSessionRecord(userId, s);
    }
  }, [userId]);

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

export function useUserProfile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      const localId = read<string>("voxmind:anonId", "");
      let activeId = localId;
      if (!activeId && typeof window !== "undefined") {
        activeId = crypto.randomUUID();
        localStorage.setItem("voxmind:anonId", JSON.stringify(activeId));
      }
      getUserProfile(activeId).then((p) => {
        setProfile(p);
        setLoading(false);
      });
      return;
    }

    getUserProfile(user.id).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [user, isLoaded]);

  const incrementUsage = useCallback(async () => {
    const id = user?.id || read<string>("voxmind:anonId", "");
    if (!id) return;
    const p = await incrementExtemporeCount(id);
    setProfile(p);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    const id = user?.id || read<string>("voxmind:anonId", "");
    if (!id) return;
    const p = await getUserProfile(id);
    setProfile(p);
  }, [user]);

  return { profile, loading, incrementUsage, refreshProfile, userId: user?.id };
}
