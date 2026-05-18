// Unified transcriber that switches between Groq Whisper API, local Whisper WASM model,
// and browser SpeechRecognition API based on user settings.
import { useSpeechRecognition, type UseSpeechRecognitionResult } from "./useSpeechRecognition";
import { useWhisperSTT, type UseWhisperResult } from "./useWhisperSTT";
import { useGroqSTT } from "./useGroqSTT";
import { useSettings } from "./useSessionStore";

export interface TranscriptChunk {
  id: string;
  status: 'ghost' | 'arriving' | 'confirmed' | 'stale-ghost';
  ghostText: string;
  words: string[];
  arrivedAt?: number;
  createdAt: number;
}

export type TranscriberResult = Omit<UseSpeechRecognitionResult, "stop"> & {
  engine: "groq" | "whisper" | "browser";
  loadStatus?: UseWhisperResult["loadStatus"];
  stop: () => Promise<string>;
  chunks?: TranscriptChunk[];
  isVoiceActive?: boolean;
};

export function useTranscriber(): TranscriberResult {
  const { settings } = useSettings();
  const browser = useSpeechRecognition();
  const whisper = useWhisperSTT(settings.whisperModel);
  const groq = useGroqSTT();

  if (settings.sttEngine === "groq") {
    return {
      engine: "groq",
      supported: groq.supported,
      listening: groq.listening,
      transcript: groq.transcript,
      interim: groq.interim,
      error: groq.error,
      level: groq.level,
      start: groq.start,
      stop: groq.stop,
      reset: groq.reset,
      loadStatus: groq.loadStatus,
      chunks: groq.chunks,
      isVoiceActive: groq.isVoiceActive,
    };
  }

  if (settings.sttEngine === "whisper") {
    return {
      engine: "whisper",
      supported: whisper.supported,
      listening: whisper.listening,
      transcript: whisper.transcript,
      interim: whisper.interim,
      error: whisper.error,
      level: whisper.level,
      start: whisper.start,
      stop: whisper.stop,
      reset: whisper.reset,
      loadStatus: whisper.loadStatus,
    };
  }

  return {
    engine: "browser",
    ...browser,
  };
}
