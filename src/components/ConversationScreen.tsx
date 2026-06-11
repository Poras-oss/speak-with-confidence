import { useCallback, useEffect, useRef, useState } from "react";
import { useTranscriber } from "@/hooks/useTranscriber";
import { MicLevelMeter } from "./MicLevelMeter";
import { generateChatResponse } from "@/hooks/useGroqAI";
import { conversationSystemPrompt } from "@/config/prompts";

interface Props {
  apiKey: string;
  onExit: () => void;
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export function ConversationScreen({ apiKey, onExit }: Props) {
  const sr = useTranscriber();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [started, setStarted] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, sr.transcript, sr.interim]);

  const startConversation = async () => {
    setStarted(true);
    setIsProcessing(true);
    const initialMessages: Message[] = [
      { role: "system", content: conversationSystemPrompt() }
    ];
    setMessages(initialMessages);

    try {
      const response = await generateChatResponse(apiKey, initialMessages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      sr.start();
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "assistant", content: "Oops, I'm having trouble connecting right now." }]);
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
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I missed that. Could you repeat?" }]);
      sr.start();
    } finally {
      setIsProcessing(false);
    }
  }, [sr, messages, isProcessing, apiKey]);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#080808]">
      {/* Header */}
      <div className="pt-8 pb-4 px-6 md:px-10 border-b border-white/5 flex justify-between items-center bg-[#080808] z-10">
        <div>
          <h2 className="text-xl font-medium text-[#f5f0e8]">1-on-1 Conversation</h2>
          <p className="text-xs text-warm-muted mt-1">Daily English speaking practice</p>
        </div>
        <button onClick={onExit} className="text-sm text-warm-muted hover:text-white transition px-4 py-2 rounded-lg hover:bg-white/5">
          Exit
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6" ref={chatContainerRef}>
        {!started ? (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-3xl">💬</div>
            <h3 className="text-2xl font-medium text-white mb-2">Ready to practice?</h3>
            <p className="text-warm-muted text-center max-w-sm mb-8">
              This is a safe, non-judgmental space for your spoken English practice. We will just chat back and forth.
            </p>
            <button
              onClick={startConversation}
              className="px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-primary/50"
              style={{ background: "linear-gradient(135deg, var(--color-primary), #9333ea)" }}
            >
              Start Conversation
            </button>
          </div>
        ) : (
          <>
            {messages.filter(m => m.role !== "system").map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}>
                <div
                  className={`max-w-[80%] md:max-w-[60%] p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-[#181818] text-[#f5f0e8] border border-white/5 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {(sr.transcript || sr.interim) && !isProcessing && (
              <div className="flex justify-end animate-fade-in">
                <div className="max-w-[80%] md:max-w-[60%] p-4 rounded-2xl bg-primary/20 text-primary-foreground/70 border border-primary/30 rounded-tr-sm italic">
                  {sr.transcript} <span className="opacity-60">{sr.interim}</span>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex justify-start animate-fade-in">
                <div className="max-w-[80%] md:max-w-[60%] p-4 rounded-2xl bg-[#181818] text-warm-muted border border-white/5 rounded-tl-sm flex items-center gap-2">
                  <span className="animate-pulse">Typing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-warm-muted animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      {started && (
        <div className="px-6 md:px-10 py-6 border-t border-white/5 bg-[#080808]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={sr.isVoiceActive ? "mic-active-pulse" : ""}>
                <MicLevelMeter level={sr.level} active={sr.listening} />
              </div>
              <span className="text-sm text-warm-muted">
                {isProcessing ? "Waiting for AI..." : sr.listening ? "Listening... Speak now" : "Paused"}
              </span>
            </div>
            
            <button
              onClick={handleSendReply}
              disabled={isProcessing || (!sr.transcript && !sr.interim)}
              className="px-6 py-2.5 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Send Reply (Space)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
