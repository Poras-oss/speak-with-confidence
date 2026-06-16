import { useCallback, useEffect, useRef, useState } from "react";
import { useTranscriber } from "@/hooks/useTranscriber";
import { MicLevelMeter } from "./MicLevelMeter";
import { generateText, generateChatResponse } from "@/hooks/useGroqAI";
import { devSimScenarioPrompt, devSimSystemPrompt } from "@/config/prompts";
import { DEV_SIM_SUBMODES, type DevSimSubMode, type Difficulty } from "@/config/modes";
import { ArrowLeft, Play, AlertCircle, Loader2, Code, Terminal, Sparkles } from "lucide-react";

interface Props {
  apiKey: string;
  difficulty: Difficulty;
  onExit: () => void;
  onFinish: (transcript: string, durationSec: number, customQuestion: string) => void;
}

interface Scenario {
  scenarioTitle: string;
  context: string;
  codeSnippet: string | null;
  goal: string;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function DevSimScreen({ apiKey, difficulty, onExit, onFinish }: Props) {
  const [subMode, setSubMode] = useState<DevSimSubMode | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [errorScenario, setErrorScenario] = useState<string | null>(null);

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duration, setDuration] = useState(0);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const sr = useTranscriber();

  // Handle auto-scroll on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, sr.transcript, sr.interim]);

  // Session timer
  useEffect(() => {
    if (started && !isProcessing) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, isProcessing]);

  const selectSubMode = async (modeId: DevSimSubMode) => {
    setSubMode(modeId);
    setLoadingScenario(true);
    setErrorScenario(null);
    try {
      const prompt = devSimScenarioPrompt(modeId, difficulty);
      const res = await generateText(apiKey, prompt);
      // Clean potential JSON markdown wrapping
      const cleaned = res.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed: Scenario = JSON.parse(cleaned);
      setScenario(parsed);
    } catch (err) {
      console.error(err);
      setErrorScenario("Failed to generate a scenario. Please try again.");
    } finally {
      setLoadingScenario(false);
    }
  };

  const startSimulation = async () => {
    if (!scenario || !subMode) return;
    setStarted(true);
    setIsProcessing(true);
    startTimeRef.current = Date.now();

    const subModeCfg = DEV_SIM_SUBMODES.find((s) => s.id === subMode)!;
    const scenarioStr = JSON.stringify(scenario, null, 2);

    const initialMessages: Message[] = [
      {
        role: "system",
        content: devSimSystemPrompt(subMode, subModeCfg.name, scenarioStr),
      },
    ];
    setMessages(initialMessages);

    try {
      const response = await generateChatResponse(apiKey, initialMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      sr.start();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hey! Ready to look at this technical scenario? Let me know when you're set." },
      ]);
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
      sr.start();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had a brief network glitch. Could you repeat that?" },
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
    const subModeCfg = DEV_SIM_SUBMODES.find((s) => s.id === subMode)!;
    // Format full dialogue history as transcript
    const historyText = messages
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Developer" : "Colleague"}: ${m.content}`)
      .join("\n\n");

    const customQuestion = `[Dev Simulation - ${subModeCfg.name}]\nScenario: ${scenario?.scenarioTitle}\nGoal: ${scenario?.goal}`;
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

  // 1. SubMode Selection Screen
  if (!subMode) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <header className="px-6 md:px-10 py-6 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onExit} className="p-2 hover:bg-accent/40 rounded-lg transition">
              <ArrowLeft className="w-4 h-4 text-warm-muted" />
            </button>
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-warm-muted">Advanced Mode</span>
              <h1 className="text-xl font-medium text-warm">Dev's Day Out</h1>
            </div>
          </div>
          <button onClick={onExit} className="text-xs text-warm-muted hover:text-warm transition px-3 py-1.5 rounded-lg hover:bg-accent/40">
            Exit
          </button>
        </header>

        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col justify-center">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl text-warm font-light mb-3">Simulate a software engineer's day-to-day</h2>
            <p className="text-warm-muted text-sm leading-relaxed">
              Select a collaboration scenario. Speak out loud to review code, debate high-level system designs, clarify API specs, or guide junior teammates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEV_SIM_SUBMODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => selectSubMode(mode.id)}
                className="text-left bg-card hover:bg-card/80 border border-border hover:border-warm/30 rounded-2xl p-6 transition-all duration-300 group hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl p-2.5 rounded-xl bg-secondary/50 text-warm-muted group-hover:text-warm transition-colors duration-300">
                    {mode.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-warm mb-1 group-hover:text-primary transition-colors duration-300">
                      {mode.name}
                    </h3>
                    <p className="text-[11px] text-warm-muted/60 uppercase tracking-wider mb-2">
                      Role: {mode.aiRole}
                    </p>
                    <p className="text-xs text-warm-muted leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // 2. Loading Scenario Screen
  if (loadingScenario) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <h2 className="text-lg text-warm font-medium">Generating Scenario...</h2>
        <p className="text-warm-muted text-xs mt-1">Simulating developer context and problem statement.</p>
      </div>
    );
  }

  // 3. Error Loading Scenario Screen
  if (errorScenario || !scenario) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mb-4" />
        <h2 className="text-lg text-warm font-medium">Scenario Generation Failed</h2>
        <p className="text-warm-muted text-xs mt-1 mb-6">{errorScenario}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setSubMode(null)}
            className="px-5 py-2 rounded-xl bg-secondary text-warm text-sm hover:bg-accent transition"
          >
            Go Back
          </button>
          <button
            onClick={() => selectSubMode(subMode)}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:opacity-90 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // 4. Briefing Screen (Before simulation starts)
  if (!started) {
    const subModeCfg = DEV_SIM_SUBMODES.find((s) => s.id === subMode)!;
    return (
      <div className="min-h-screen bg-canvas flex flex-col">
        <header className="px-6 md:px-10 py-6 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSubMode(null)} className="p-2 hover:bg-accent/40 rounded-lg transition">
              <ArrowLeft className="w-4 h-4 text-warm-muted" />
            </button>
            <div>
              <span className="text-xs uppercase tracking-[0.2em] text-warm-muted">{subModeCfg.name}</span>
              <h1 className="text-xl font-medium text-warm">Scenario briefing</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 flex flex-col justify-center">
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-primary font-medium mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Simulation Details
              </div>
              <h2 className="text-2xl font-semibold text-warm mb-3">{scenario.scenarioTitle}</h2>
              <p className="text-sm text-warm/90 leading-relaxed bg-accent/10 p-4 rounded-xl border border-border/30">
                {scenario.context}
              </p>
            </div>

            {scenario.codeSnippet && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-warm-muted flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" /> Reference Code snippet:
                </div>
                <div className="relative rounded-xl overflow-hidden border border-border/60 bg-[#0c0c0c] p-4 font-mono text-xs leading-relaxed text-warm-muted select-text overflow-x-auto max-h-60">
                  <pre>{scenario.codeSnippet}</pre>
                </div>
              </div>
            )}

            <div className="border-t border-border/40 pt-6">
              <div className="text-xs font-medium text-warm-muted flex items-center gap-1.5 mb-1.5">
                <Terminal className="w-3.5 h-3.5" /> Your objective:
              </div>
              <p className="text-sm text-warm font-light italic">
                "{scenario.goal}"
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={startSimulation}
              className="px-8 py-3.5 rounded-xl font-medium text-white shadow-lg shadow-primary/20 hover:shadow-primary/45 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--color-primary), #9333ea)" }}
            >
              <Play className="w-4 h-4 fill-white" /> Start Simulation
            </button>
          </div>
        </main>
      </div>
    );
  }

  // 5. Active Chat Simulation Screen
  const subModeCfg = DEV_SIM_SUBMODES.find((s) => s.id === subMode)!;
  return (
    <div className="min-h-screen flex flex-col bg-[#080808]">
      {/* Header */}
      <div className="pt-6 pb-4 px-6 md:px-10 border-b border-white/5 flex justify-between items-center bg-[#080808] z-10">
        <div className="flex items-center gap-4">
          <div className="text-2xl">{subModeCfg.icon}</div>
          <div>
            <h2 className="text-lg font-medium text-[#f5f0e8] flex items-center gap-2">
              {subModeCfg.name}
              <span className="text-xs font-normal px-2 py-0.5 rounded-md bg-white/5 text-warm-muted">
                {difficulty}
              </span>
            </h2>
            <p className="text-[11px] text-warm-muted mt-0.5">Roleplay: {subModeCfg.aiRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono tabular-nums text-warm-muted bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            {formatTime(duration)}
          </span>
          <button
            onClick={handleEndSession}
            className="text-xs text-primary-foreground font-semibold hover:opacity-90 transition px-4 py-2 rounded-lg bg-primary"
          >
            Get Feedback
          </button>
        </div>
      </div>

      {/* Main chat body with context sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Chat Flow */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6" ref={chatContainerRef}>
            {messages
              .filter((m) => m.role !== "system")
              .map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                  <div className="max-w-[85%] md:max-w-[70%]">
                    <div className="text-[10px] uppercase tracking-wider text-warm-muted/50 mb-1 px-1">
                      {msg.role === "user" ? "You" : "Colleague"}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-[14px] leading-relaxed select-text ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-[#141414] text-[#f5f0e8] border border-white/5 rounded-tl-sm whitespace-pre-wrap"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

            {/* Interim Transcript */}
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

            {/* AI Typing Indicator */}
            {isProcessing && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[85%] md:max-w-[70%] p-4 rounded-2xl bg-[#141414] text-warm-muted border border-white/5 rounded-tl-sm flex items-center gap-2 text-xs">
                  <span className="animate-pulse">Colleague typing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Controls Footer */}
          <div className="px-6 md:px-8 py-5 border-t border-white/5 bg-[#080808] z-10">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={sr.isVoiceActive ? "mic-active-pulse" : ""}>
                  <MicLevelMeter level={sr.level} active={sr.listening} />
                </div>
                <span className="text-xs text-warm-muted select-none">
                  {isProcessing ? "Colleague is processing..." : sr.listening ? "Mic Active. Speak now" : "Mic paused"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSendReply}
                  disabled={isProcessing || (!sr.transcript && !sr.interim)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-40"
                >
                  Send Reply (Space)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Scenario Context Sidebar (Desktop Only) */}
        <div className="hidden lg:flex w-80 border-l border-white/5 flex-col bg-[#0b0b0b] overflow-y-auto p-5 space-y-5">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-2 font-medium">Scenario context</h3>
            <h4 className="text-sm font-semibold text-white mb-2">{scenario.scenarioTitle}</h4>
            <p className="text-[12px] text-warm-muted/95 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5 select-text">
              {scenario.context}
            </p>
          </div>

          {scenario.codeSnippet && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-2 font-medium">Code context</h3>
              <div className="rounded-lg overflow-hidden border border-white/10 bg-black/60 p-3 font-mono text-[11px] leading-relaxed text-warm-muted select-text overflow-x-auto max-h-80">
                <pre>{scenario.codeSnippet}</pre>
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-4">
            <h3 className="text-xs uppercase tracking-wider text-warm-muted mb-1.5 font-medium">Goal</h3>
            <p className="text-[12px] text-warm-muted italic select-text">
              "{scenario.goal}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
