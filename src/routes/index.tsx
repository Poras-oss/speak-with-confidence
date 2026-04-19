import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SetupScreen } from "@/components/SetupScreen";
import { HomeScreen } from "@/components/HomeScreen";
import { SessionScreen } from "@/components/SessionScreen";
import { FeedbackScreen } from "@/components/FeedbackScreen";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { MODES, type ModeId } from "@/config/modes";
import { useApiKey, useSettings, useSessions, useStreak } from "@/hooks/useSessionStore";
import { generateText, generateFeedback, type FeedbackPayload } from "@/hooks/useNvidiaAI";
import {
  technicalQuestionPrompt,
  extemporeTopicPrompt,
  gdTopicPrompt,
  feedbackPrompt,
} from "@/config/prompts";

export const Route = createFileRoute("/")({
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
  useEffect(() => setHydrated(true), []);

  const { apiKey, setApiKey } = useApiKey();
  const { settings } = useSettings();
  const { sessions, addSession } = useSessions();
  const { streak, bump } = useStreak();

  const [screen, setScreen] = useState<Screen>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [activeMode, setActiveMode] = useState<ModeId | null>(null);
  const [question, setQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [durationActual, setDurationActual] = useState(0);

  const [feedback, setFeedback] = useState<FeedbackPayload | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const fetchQuestion = useCallback(
    async (mode: ModeId) => {
      if (!apiKey) return;
      setQuestionLoading(true);
      setQuestionError(null);
      setQuestion("");
      try {
        let prompt = "";
        if (mode === "technical") prompt = technicalQuestionPrompt(settings.difficulty, settings.domain);
        else if (mode === "extempore") prompt = extemporeTopicPrompt();
        else prompt = gdTopicPrompt();
        const q = await generateText(apiKey, prompt);
        setQuestion(q);
      } catch (e: any) {
        setQuestionError("Couldn't fetch a question. Check your API key or try again.");
      } finally {
        setQuestionLoading(false);
      }
    },
    [apiKey, settings.difficulty, settings.domain]
  );

  const startMode = useCallback(
    (mode: ModeId) => {
      setActiveMode(mode);
      setTranscript("");
      setFeedback(null);
      setFeedbackError(null);
      setScreen("session");
      fetchQuestion(mode);
    },
    [fetchQuestion]
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
        const fb = await generateFeedback(apiKey, feedbackPrompt(question, t, activeMode || "extempore"));
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
        setFeedbackError("We couldn't generate feedback this time. The session is still saved in spirit — try again.");
      } finally {
        setFeedbackLoading(false);
      }
    },
    [apiKey, question, activeMode, addSession, bump]
  );

  const retryFeedback = useCallback(async () => {
    if (!activeMode) return;
    setFeedbackError(null);
    setFeedbackLoading(true);
    try {
      const fb = await generateFeedback(apiKey, feedbackPrompt(question, transcript, activeMode));
      setFeedback(fb);
    } catch {
      setFeedbackError("Still no luck. Check your network or API key.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [apiKey, question, transcript, activeMode]);

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

  if (!apiKey) {
    return <SetupScreen onSaved={(k) => setApiKey(k)} />;
  }

  const modeCfg = activeMode ? MODES.find((m) => m.id === activeMode)! : null;

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onPick={startMode}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          streak={streak}
          totalSessions={sessions.length}
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

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryDrawer open={historyOpen} sessions={sessions} onClose={() => setHistoryOpen(false)} />
      {/* Reference durationActual to silence unused warnings */}
      <span hidden>{durationActual}</span>
    </>
  );
}
