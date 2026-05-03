import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HomeScreen } from "@/components/HomeScreen";
import { SessionScreen } from "@/components/SessionScreen";
import { FeedbackScreen } from "@/components/FeedbackScreen";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { MODES, type ModeId } from "@/config/modes";
import { useSettings, useSessions, useStreak, useResume } from "@/hooks/useSessionStore";
import { generateText, generateFeedback, type FeedbackPayload } from "@/hooks/useNvidiaAI";
import {
  technicalQuestionPrompt,
  extemporeTopicPrompt,
  gdTopicPrompt,
  feedbackPrompt,
} from "@/config/prompts";

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

  const { settings } = useSettings();
  const { sessions, addSession } = useSessions();
  const { streak, bump } = useStreak();
  const { resume, setResume } = useResume();

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
      setQuestionLoading(true);
      setQuestionError(null);
      setQuestion("");
      try {
        let prompt = "";
        if (mode === "technical") prompt = technicalQuestionPrompt(settings.difficulty, settings.domain, resume?.text);
        else if (mode === "extempore") prompt = extemporeTopicPrompt();
        else prompt = gdTopicPrompt();
        const q = await generateText("", prompt);
        setQuestion(q);
      } catch (e: any) {
        setQuestionError("Couldn't fetch a question. Try again.");
      } finally {
        setQuestionLoading(false);
      }
    },
    [settings.difficulty, settings.domain, resume?.text]
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
        const fb = await generateFeedback("", feedbackPrompt(question, t, activeMode || "extempore", activeMode === "technical" ? resume?.text : undefined));
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
    [question, activeMode, addSession, bump, resume?.text]
  );

  const retryFeedback = useCallback(async () => {
    if (!activeMode) return;
    setFeedbackError(null);
    setFeedbackLoading(true);
    try {
      const fb = await generateFeedback("", feedbackPrompt(question, transcript, activeMode, activeMode === "technical" ? resume?.text : undefined));
      setFeedback(fb);
    } catch {
      setFeedbackError("Still no luck. Check your network or try again.");
    } finally {
      setFeedbackLoading(false);
    }
  }, [question, transcript, activeMode, resume?.text]);

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
          streak={streak}
          totalSessions={sessions.length}
          resume={resume}
          onResumeChange={setResume}
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
