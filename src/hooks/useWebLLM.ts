import { useCallback, useState } from "react";
import { CreateMLCEngine, InitProgressReport } from "@mlc-ai/web-llm";

export interface WebLLMLoadProgress {
  status: "idle" | "downloading" | "ready" | "error";
  progress: number;
  message: string;
}

export function useWebLLM(modelId: string = "Llama-3.2-3B-Instruct-q4f16_1-MLC") {
  const [engine, setEngine] = useState<any>(null);
  const [loadStatus, setLoadStatus] = useState<WebLLMLoadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });

  const load = useCallback(async () => {
    if (engine) return;
    try {
      const initProgressCallback = (report: InitProgressReport) => {
        setLoadStatus({
          status: "downloading",
          progress: report.progress,
          message: report.text,
        });
      };
      
      const newEngine = await CreateMLCEngine(modelId, {
        initProgressCallback,
      });
      setEngine(newEngine);
      setLoadStatus({ status: "ready", progress: 1, message: "Ready" });
    } catch (e: any) {
      setLoadStatus({
        status: "error",
        progress: 0,
        message: e?.message || "Failed to load LLM",
      });
    }
  }, [engine, modelId]);

  const fixTranscript = useCallback(async (text: string) => {
    if (!engine) return text;
    try {
      const messages = [
        {
          role: "system",
          content: "You are a professional transcriber. Your job is to take raw, messy speech-to-text transcripts, remove filler words (like 'um', 'uh', 'like'), fix grammatical errors, add proper punctuation, and return ONLY the cleaned up text. Do not add any conversational filler or explain your changes."
        },
        {
          role: "user",
          content: text
        }
      ];

      const reply = await engine.chat.completions.create({
        messages,
        temperature: 0.1,
      });

      return reply.choices[0].message.content || text;
    } catch (e) {
      console.error("WebLLM generation error:", e);
      return text;
    }
  }, [engine]);

  return { loadStatus, load, fixTranscript, isReady: !!engine };
}
