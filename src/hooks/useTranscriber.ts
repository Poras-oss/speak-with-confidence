// Unified transcriber that switches between the browser SpeechRecognition API
// and a local Whisper WASM model based on user settings.
import { useSpeechRecognition, type UseSpeechRecognitionResult } from "./useSpeechRecognition";
import { useWhisperSTT, type UseWhisperResult } from "./useWhisperSTT";
import { useSettings } from "./useSessionStore";

export type TranscriberResult = UseSpeechRecognitionResult & {
  engine: "browser" | "whisper";
  loadStatus?: UseWhisperResult["loadStatus"];
};

export function useTranscriber(): TranscriberResult {
  const { settings } = useSettings();
  const browser = useSpeechRecognition();
  const whisper = useWhisperSTT(settings.whisperModel);

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
