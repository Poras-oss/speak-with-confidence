// Unified transcriber that switches between Groq Whisper API, local Whisper WASM model,
// and browser SpeechRecognition API based on user settings.
import { useSpeechRecognition, type UseSpeechRecognitionResult } from "./useSpeechRecognition";
import { useWhisperSTT, type UseWhisperResult } from "./useWhisperSTT";
import { useGroqSTT } from "./useGroqSTT";
import { useSettings } from "./useSessionStore";

export type TranscriberResult = UseSpeechRecognitionResult & {
  engine: "groq" | "whisper" | "browser";
  loadStatus?: UseWhisperResult["loadStatus"];
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
