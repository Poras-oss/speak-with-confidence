import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/HomeScreen";
import { SessionScreen } from "@/components/SessionScreen";
import { FeedbackScreen } from "@/components/FeedbackScreen";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { ProgressDrawer } from "@/components/ProgressDrawer";
import { PremiumModal } from "@/components/PremiumModal";
import { MODES, type ModeId } from "@/config/modes";
import { useSettings, useSessions, useStreak, useResume, useApiKey, useUserProfile } from "@/hooks/useSessionStore";
import { generateText, generateFeedback, type FeedbackPayload } from "@/hooks/useGroqAI";
import { loadWhisper, type WhisperLoadProgress } from "@/hooks/useWhisperSTT";
import {
  technicalQuestionPrompt,
  extemporeTopicPrompt,
  gdTopicPrompt,
  feedbackPrompt,
} from "@/config/prompts";

async function getUserCountry(): Promise<string | undefined> {
  try {
    return await new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(Intl.DateTimeFormat().resolvedOptions().timeZone);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await res.json();
            resolve(data.countryName || data.countryCode || Intl.DateTimeFormat().resolvedOptions().timeZone);
          } catch (e) {
            resolve(Intl.DateTimeFormat().resolvedOptions().timeZone);
          }
        },
        () => {
          resolve(Intl.DateTimeFormat().resolvedOptions().timeZone);
        },
        { timeout: 5000 }
      );
    });
  } catch (e) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "VoxMind — Public Speaking Trainer" },
      {
        name: "description",
        content:
          "A research-backed public speaking trainer for people recovering from presentation anxiety. Graduated exposure, CBT, deliberate practice — one rep at a time.",
      },
      { property: "og:title", content: "VoxMind — Public Speaking Trainer" },
      {
        property: "og:description",
        content:
          "Rebuild your voice. AI-generated questions, real-time transcription, and structured feedback. Built on graduated exposure, CBT, and deliberate practice.",
      },
    ],
  }),
  component: VoxMindApp,
});

type Screen = "home" | "session" | "feedback";

function VoxMindApp() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { apiKey } = useApiKey();
  const { profile, loading: profileLoading, incrementUsage, refreshProfile, userId } = useUserProfile();

  const { settings } = useSettings();
  const { sessions, addSession } = useSessions(userId);
  const { streak, bump } = useStreak();
  const { resume, setResume } = useResume();

  const [screen, setScreen] = useState<Screen>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  const [activeMode, setActiveMode] = useState<ModeId | null>(null);
  const [question, setQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [durationActual, setDurationActual] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Preload Whisper model as soon as the app mounts (when whisper engine is selected)
  const [modelStatus, setModelStatus] = useState<WhisperLoadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const modelReady = modelStatus.status === "ready";

  useEffect(() => {
    if (settings.sttEngine !== "whisper") {
      // Browser STT doesn't need preloading
      setModelStatus({ status: "ready", progress: 1, message: "Browser STT" });
      return;
    }
    // Start preloading the whisper model immediately
    loadWhisper(settings.whisperModel, setModelStatus).catch((e) => {
      setModelStatus({ status: "error", progress: 0, message: e?.message || "Failed to load model" });
    });
  }, [settings.sttEngine, settings.whisperModel]);

  const fetchQuestion = useCallback(
    async (mode: ModeId) => {
      setQuestionLoading(true);
      setQuestionError(null);
      setQuestion("");
      try {
        let prompt = "";
        if (mode === "technical") prompt = technicalQuestionPrompt(settings.difficulty, settings.domain, resume?.text);
        else if (mode === "extempore") {
          const countryContext = await getUserCountry();
          prompt = extemporeTopicPrompt(settings.extemporeInterests, countryContext);
        }
        else prompt = gdTopicPrompt();
        const q = await generateText(apiKey, prompt);
        setQuestion(q);
      } catch (e: any) {
        setQuestionError("Couldn't fetch a question. Try again.");
      } finally {
        setQuestionLoading(false);
      }
    },
    [settings.difficulty, settings.domain, settings.extemporeInterests, resume?.text, apiKey]
  );

  const startMode = useCallback(
    (mode: ModeId) => {
      const isPremium = profile?.plan === "premium";
      const hasCustomKey = !!apiKey;

      if (!isPremium && !hasCustomKey) {
        if (mode === "extempore") {
          if ((profile?.extempore_count || 0) >= 5) {
            setPremiumOpen(true);
            return;
          }
          incrementUsage();
        } else if (mode === "technical" && resume) {
          setPremiumOpen(true);
          return;
        }
      }

      setActiveMode(mode);
      setTranscript("");
      setFeedback(null);
      setFeedbackError(null);
      setScreen("session");
      fetchQuestion(mode);
    },
    [fetchQuestion, profile, apiKey, incrementUsage, resume]
  );

  const finishSession = useCallback(
    async (t: string, durSec: number) => {
      setTranscript(t);
      setDurationActual(durSec);
      setScreen("feedback");
      setFeedback(null);
      setFeedbackError(null);
      setFeedbackLoading(true);
      try {
        const fb = await generateFeedback(apiKey, feedbackPrompt(question, t, activeMode || "extempore", activeMode === "technical" ? resume?.text : undefined));
        setFeedback(fb);
        bump();
        addSession({
          id: crypto.randomUUID(),
          date: Date.now(),
          mode: activeMode || "extempore",
          question,
          transcript: t,
          durationSec: durSec,
          feedback: fb,
        });
      } catch (e: any) {
        setFeedbackError("We couldn't generate feedback this time. Try again.");
      } finally {
        setFeedbackLoading(false);
      }
    },
    [question, activeMode, addSession, bump, resume?.text, apiKey]
  );

  const retryFeedback = useCallback(async () => {
    if (!activeMode) return;
    setFeedbackError(null);
    setFeedbackLoading(true);
    try {
      const fb = await generateFeedback(apiKey, feedbackPrompt(question, transcript, activeMode, activeMode === "technical" ? resume?.text : undefined));
      setFeedback(fb);
    } catch {
      setFeedbackError("Still no luck. Check your network or try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [question, transcript, activeMode, resume?.text, apiKey]);

  const tryAgain = useCallback(() => {
    setTranscript("");
    setFeedback(null);
    setFeedbackError(null);
    setScreen("session");
    // Keep same question — don't refetch
  }, []);

  const nextQuestion = useCallback(() => {
    if (!activeMode) return;
    setTranscript("");
    setFeedback(null);
    setFeedbackError(null);
    setScreen("session");
    fetchQuestion(activeMode);
  }, [activeMode, fetchQuestion]);

  const skipQuestion = useCallback(() => {
    if (!activeMode) return;
    fetchQuestion(activeMode);
  }, [activeMode, fetchQuestion]);

  const exitToHome = useCallback(() => {
    setScreen("home");
    setActiveMode(null);
  }, []);

  if (!hydrated) {
    return <div className="min-h-screen bg-canvas" />;
  }

  const modeCfg = activeMode ? MODES.find((m) => m.id === activeMode)! : null;

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onPick={startMode}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenProgress={() => setProgressOpen(true)}
          streak={streak}
          totalSessions={sessions.length}
          resume={resume}
          onResumeChange={(r) => {
            const isPremium = profile?.plan === "premium";
            const hasCustomKey = !!apiKey;
            if (r && !isPremium && !hasCustomKey) {
              setPremiumOpen(true);
              return;
            }
            setResume(r);
          }}
          modelReady={modelReady}
          modelStatus={modelStatus}
        />
      )}

      {screen === "session" && modeCfg && (
        <SessionScreen
          mode={modeCfg}
          difficultyLabel={activeMode === "technical" ? settings.difficulty : undefined}
          topicLabel={activeMode === "technical" ? settings.domain : undefined}
          question={question}
          questionLoading={questionLoading}
          questionError={questionError}
          durationSec={settings.duration}
          onFinish={finishSession}
          onSkip={skipQuestion}
          onExit={exitToHome}
        />
      )}

      {screen === "feedback" && (
        <FeedbackScreen
          question={question}
          transcript={transcript}
          feedback={feedback}
          loading={feedbackLoading}
          error={feedbackError}
          showFillers={settings.showFillers}
          onTryAgain={tryAgain}
          onNext={nextQuestion}
          onEnd={exitToHome}
          onRetry={retryFeedback}
        />
      )}

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <HistoryDrawer
        open={historyOpen}
        sessions={sessions}
        onClose={() => setHistoryOpen(false)}
      />

      <ProgressDrawer
        open={progressOpen}
        sessions={sessions}
        onClose={() => setProgressOpen(false)}
      />

      <PremiumModal
        open={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        userId={userId}
        onSuccess={refreshProfile}
      />
      {/* Reference durationActual to silence unused warnings */}
      <span hidden>{durationActual}</span>
    </>
  );
}
