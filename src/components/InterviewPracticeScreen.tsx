import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, AlertCircle, BriefcaseBusiness, ClipboardCheck, Loader2, Play, Target } from "lucide-react";
import { useTranscriber } from "@/hooks/useTranscriber";
import { MicLevelMeter } from "./MicLevelMeter";
import { generateChatResponse, generateText } from "@/hooks/useGroqAI";
import { interviewScenarioPrompt, interviewSystemPrompt } from "@/config/prompts";
import { INTERVIEW_TYPES, type Difficulty, type InterviewType } from "@/config/modes";

interface Props {
  apiKey: string;
  difficulty: Difficulty;
  domain: string;
  resumeText?: string;
  onExit: () => void;
  onFinish: (transcript: string, durationSec: number, customQuestion: string) => void;
}

interface Scenario {
  interviewTitle: string;
  role: string;
  context: string;
  openingQuestion: string;
  competencies: string[];
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function InterviewPracticeScreen({ apiKey, difficulty, domain, resumeText, onExit, onFinish }: Props) {
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [errorScenario, setErrorScenario] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sr = useTranscriber();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, sr.transcript, sr.interim]);

  useEffect(() => {
    if (started && !isProcessing) {
      timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, isProcessing]);

  const selectInterviewType = async (type: InterviewType) => {
    setInterviewType(type);
    setLoadingScenario(true);
    setErrorScenario(null);
    try {
      const prompt = interviewScenarioPrompt(type, difficulty, domain, resumeText);
      const res = await generateText(apiKey, prompt);
      const cleaned = res.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed: Scenario = JSON.parse(cleaned);
      setScenario(parsed);
    } catch (err) {
      console.error(err);
      setErrorScenario("Failed to generate an interview round. Please try again.");
    } finally {
      setLoadingScenario(false);
    }
  };

  const startInterview = async () => {
    if (!scenario || !interviewType) return;
    setStarted(true);
    setIsProcessing(true);
    setQuestionCount(0);

    const typeCfg = INTERVIEW_TYPES.find((type) => type.id === interviewType)!;
    const initialMessages: Message[] = [
      {
        role: "system",
        content: interviewSystemPrompt(typeCfg.name, JSON.stringify(scenario, null, 2)),
      },
    ];
    setMessages(initialMessages);

    try {
      const response = await generateChatResponse(apiKey, initialMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setQuestionCount(1);
      sr.start();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: scenario.openingQuestion }]);
      setQuestionCount(1);
      sr.start();
    } finally {
      setIsProcessing(false);
    }
  };

  const latestTranscriptRef = useRef("");
  const latestInterimRef = useRef("");

  useEffect(() => {
    latestTranscriptRef.current = sr.transcript;
    latestInterimRef.current = sr.interim;
  }, [sr.transcript, sr.interim]);

  const handleSendReply = useCallback(async () => {
    if (isProcessing) return;

    let finalTxStr = "";
    try {
      finalTxStr = (await sr.stop()) || "";
    } catch {
      // ignore
    }
    const finalTx = finalTxStr || [latestTranscriptRef.current, latestInterimRef.current].filter(Boolean).join(" ");

    if (!finalTx.trim()) {
      sr.start();
      return;
    }

    const newMessages: Message[] = [...messages, { role: "user", content: finalTx }];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const response = await generateChatResponse(apiKey, newMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setQuestionCount((prev) => prev + 1);
      sr.start();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I missed part of that. Can you restate your answer with one concrete example?" },
      ]);
      sr.start();
    } finally {
      setIsProcessing(false);
    }
  }, [sr, messages, isProcessing, apiKey]);

  const handleEndSession = async () => {
    try {
      sr.stop();
    } catch {
      // ignore
    }
    const typeCfg = INTERVIEW_TYPES.find((type) => type.id === interviewType)!;
    const historyText = messages
      .filter((message) => message.role !== "system")
      .map((message) => `${message.role === "user" ? "Candidate" : "Interviewer"}: ${message.content}`)
      .join("\n\n");

    const customQuestion = `[AI Interview Practice - ${typeCfg.name}]
Role: ${scenario?.role}
Round: ${scenario?.interviewTitle}
Opening question: ${scenario?.openingQuestion}`;
    onFinish(historyText, duration, customQuestion);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && started && !isProcessing) {
        e.preventDefault();
        handleSendReply();
      }
      if (e.code === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, isProcessing, handleSendReply, onExit]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!interviewType) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <header className="px-6 md:px-10 py-6 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hover:bg-accent/40 rounded-lg transition">
              <ArrowLeft className="w-4 h-4 text-warm-muted" />
            </button>
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-warm-muted">Advanced Mode</span>
              <h1 className="text-xl font-medium text-warm">AI Interview Practice</h1>
            </div>
          </div>
          <button onClick={onExit} className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40">
            Exit
          </button>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl text-warm font-light mb-3">Practice the interview, not just answers</h2>
            <p className="text-warm-muted text-sm leading-relaxed">
              Choose a real interview round. The AI will ask follow-ups, push for specifics, and judge the full conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => selectInterviewType(type.id)}
                className="text-left bg-card hover:bg-card/80 border border-border hover:border-warm/30 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center text-sm font-semibold text-warm-muted group-hover:text-warm transition-colors mb-4">
                  {type.icon}
                </div>
                <h3 className="text-lg font-medium text-warm group-hover:text-primary transition-colors mb-2">
                  {type.name}
                </h3>
                <p className="text-[10px] text-warm-muted/50 uppercase tracking-wider mb-3">
                  Interviewer: {type.aiRole}
                </p>
                <p className="text-xs text-warm-muted leading-relaxed">{type.description}</p>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (loadingScenario) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <h2 className="text-lg text-warm font-medium">Building Interview Round...</h2>
        <p className="text-warm-muted text-xs mt-1">Creating interviewer context, opening question, and evaluation criteria.</p>
      </div>
    );
  }

  if (errorScenario || !scenario) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <h2 className="text-lg text-warm font-medium">Interview Setup Failed</h2>
        <p className="text-warm-muted text-xs mt-1 mb-6">{errorScenario}</p>
        <div className="flex gap-3">
          <button onClick={() => setInterviewType(null)} className="px-5 py-2 rounded-xl bg-secondary text-warm text-sm hover:bg-accent transition">
            Go Back
          </button>
          <button onClick={() => selectInterviewType(interviewType)} className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    const typeCfg = INTERVIEW_TYPES.find((type) => type.id === interviewType)!;
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <header className="px-6 md:px-10 py-6 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setInterviewType(null)} className="p-2 hover:bg-accent/40 rounded-lg transition">
              <ArrowLeft className="w-4 h-4 text-warm-muted" />
            </button>
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-warm-muted">{typeCfg.name}</span>
              <h1 className="text-xl font-medium text-warm">Interview briefing</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 flex flex-col justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-primary font-medium mb-1.5 flex items-center gap-1.5">
                <BriefcaseBusiness className="w-3.5 h-3.5" /> Round context
              </div>
              <h2 className="text-2xl font-semibold text-warm mb-2">{scenario.interviewTitle}</h2>
              <p className="text-xs text-warm-muted mb-3">Role context: {scenario.role}</p>
              <p className="text-sm text-warm/90 leading-relaxed bg-accent/10 p-4 rounded-xl border border-border/30">
                {scenario.context}
              </p>
            </div>

            <div className="border-t border-border/40 pt-6">
              <div className="text-xs font-medium text-warm-muted flex items-center gap-1.5 mb-1.5">
                <Target className="w-3.5 h-3.5" /> Opening question:
              </div>
              <p className="text-sm text-warm font-light italic">"{scenario.openingQuestion}"</p>
            </div>

            <div className="border-t border-border/40 pt-6">
              <div className="text-xs font-medium text-warm-muted flex items-center gap-1.5 mb-3">
                <ClipboardCheck className="w-3.5 h-3.5" /> Evaluated competencies
              </div>
              <div className="flex flex-wrap gap-2">
                {scenario.competencies.map((competency) => (
                  <span key={competency} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-warm-muted">
                    {competency}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={startInterview}
              className="px-8 py-3.5 rounded-xl font-medium text-white shadow-lg shadow-primary/20 hover:shadow-primary/45 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--color-primary), #9333ea)" }}
            >
              <Play className="w-4 h-4 fill-white" /> Start Interview
            </button>
          </div>
        </main>
      </div>
    );
  }

  const typeCfg = INTERVIEW_TYPES.find((type) => type.id === interviewType)!;
  return (
    <div className="min-h-screen flex flex-col bg-[#080808]">
      <div className="pt-6 pb-4 px-6 md:px-10 border-b border-white/5 flex justify-between items-center bg-[#080808] z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xs text-warm">
            {typeCfg.icon}
          </div>
          <div>
            <h2 className="text-lg font-medium text-[#f5f0e8] flex items-center gap-2">
              AI Interview Practice
              <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-white/5 text-warm-muted">{typeCfg.name}</span>
            </h2>
            <p className="text-[11px] text-warm-muted mt-0.5">{scenario.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono tabular-nums text-warm-muted bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            Q{questionCount} - {formatTime(duration)}
          </span>
          <button onClick={handleEndSession} className="text-xs text-primary-foreground font-semibold hover:opacity-90 transition px-4 py-2 rounded-lg bg-primary">
            Get Feedback
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6" ref={chatContainerRef}>
            {messages
              .filter((message) => message.role !== "system")
              .map((message, i) => (
                <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                  <div className="max-w-[85%] md:max-w-[70%]">
                    <div className="text-[10px] uppercase tracking-wider text-warm-muted/50 mb-1 px-1">
                      {message.role === "user" ? "Candidate" : "Interviewer"}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-[14px] leading-relaxed select-text ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-[#141414] text-[#f5f0e8] border border-white/5 rounded-tl-sm whitespace-pre-wrap"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}

            {(sr.transcript || sr.interim) && !isProcessing && (
              <div className="flex justify-end animate-fade-in">
                <div className="max-w-[85%] md:max-w-[70%]">
                  <div className="text-[10px] uppercase tracking-wider text-primary/60 mb-1 px-1">Speaking</div>
                  <div className="p-4 rounded-2xl bg-primary/15 text-primary border border-primary/25 rounded-tr-sm italic text-[14px]">
                    {sr.transcript} <span className="opacity-60">{sr.interim}</span>
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%] md:max-w-[70%] p-4 rounded-2xl bg-[#141414] text-warm-muted border border-white/5 rounded-tl-sm flex items-center gap-2 text-xs">
                  <span className="animate-pulse">Interviewer is listening for follow-up</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 md:px-8 py-5 border-t border-white/5 bg-[#080808] z-10">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={sr.isVoiceActive ? "mic-active-pulse" : ""}>
                  <MicLevelMeter level={sr.level} active={sr.listening} />
                </div>
                <span className="text-xs text-warm-muted select-none">
                  {isProcessing ? "Interviewer is processing..." : sr.listening ? "Mic active. Answer naturally" : "Mic paused"}
                </span>
              </div>

              <button
                onClick={handleSendReply}
                disabled={isProcessing || (!sr.transcript && !sr.interim)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-40"
              >
                Send Answer (Space)
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-80 border-l border-white/5 flex-col bg-[#0b0b0b] overflow-y-auto p-5 space-y-5">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-2 font-medium">Interview context</h3>
            <h4 className="text-sm font-semibold text-white mb-2">{scenario.interviewTitle}</h4>
            <p className="text-[12px] text-warm-muted/95 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 select-text">
              {scenario.context}
            </p>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-2 font-medium">Opening question</h3>
            <p className="text-[12px] text-warm-muted italic select-text">"{scenario.openingQuestion}"</p>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-2 font-medium">Evaluated on</h3>
            <div className="flex flex-wrap gap-2">
              {scenario.competencies.map((competency) => (
                <span key={competency} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 text-warm-muted border border-white/5">
                  {competency}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
