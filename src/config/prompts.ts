import type { Difficulty, ModeId } from "./modes";

export function technicalQuestionPrompt(level: Difficulty, domain: string) {
  return `You are a senior technical interviewer. Generate 1 interview question for a ${level} software engineer about ${domain}. Return ONLY the question, nothing else. The question should be specific, not vague. No preamble.`;
}

export function extemporeTopicPrompt() {
  return `Generate ONE thought-provoking extempore speaking topic. It can be an opinion, hypothetical, current-events angle, or general knowledge prompt. Return ONLY the topic as a single sentence or question. No preamble, no quotes.`;
}

export function gdTopicPrompt() {
  return `Generate ONE group discussion statement that has two reasonable sides. Phrase it as a debatable statement people can take a position on. Return ONLY the statement. No preamble, no quotes.`;
}

export function feedbackPrompt(question: string, transcript: string, mode: ModeId | string) {
  return `You are a calm, constructive public speaking coach helping someone recover from presentation anxiety. They answered the following ${mode} question:

QUESTION: ${question}
THEIR ANSWER (transcribed): ${transcript || "(no audible answer captured)"}
MODE: ${mode}

Respond in this exact JSON format:
{
  "scores": {
    "structure": 7,
    "clarity": 6,
    "completeness": 5,
    "confidence_estimate": 7
  },
  "nailed": ["point 1", "point 2"],
  "improve": ["point 1", "point 2"],
  "ideal_framework": ["Framework point 1", "Framework point 2", "Framework point 3"],
  "reframe": "One CBT-style sentence that acknowledges what they did, reframes any weakness as fixable, and encourages the next rep."
}

Be encouraging but honest. Never be harsh. Treat blanks and pauses as normal. Score 0-10. No markdown, only valid JSON.`;
}
