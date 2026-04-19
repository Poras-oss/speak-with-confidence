import type { Difficulty, ModeId } from "./modes";

export function technicalQuestionPrompt(level: Difficulty, domain: string, resume?: string) {
  if (resume && resume.trim().length > 0) {
    const trimmed = resume.slice(0, 4000);
    return `You are a senior technical interviewer. The candidate's resume is below. Generate ONE specific interview question for a ${level} engineer about ${domain} that directly references something concrete from their resume (a project, technology, role, or claim). Probe for depth — do NOT ask a generic textbook question. Return ONLY the question, no preamble, no quotes.

RESUME:
"""
${trimmed}
"""`;
  }
  return `You are a senior technical interviewer. Generate 1 interview question for a ${level} software engineer about ${domain}. Return ONLY the question, nothing else. The question should be specific, not vague. No preamble.`;
}

export function extemporeTopicPrompt() {
  return `Generate ONE thought-provoking extempore speaking topic. It can be an opinion, hypothetical, current-events angle, or general knowledge prompt. Return ONLY the topic as a single sentence or question. No preamble, no quotes.`;
}

export function gdTopicPrompt() {
  return `Generate ONE group discussion statement that has two reasonable sides. Phrase it as a debatable statement people can take a position on. Return ONLY the statement. No preamble, no quotes.`;
}

export function feedbackPrompt(question: string, transcript: string, mode: ModeId | string, resume?: string) {
  const resumeBlock =
    resume && resume.trim().length > 0
      ? `\n\nCANDIDATE RESUME (for context — judge their answer against what they claim to know):\n"""\n${resume.slice(0, 3000)}\n"""`
      : "";

  return `You are a blunt, senior interview coach. You DO NOT coddle. You give brutally honest, specific, actionable feedback — the kind that actually makes people improve. No empty validation. No "great job" if it wasn't. If the answer was weak, say so directly and explain exactly why. If they went blank or said almost nothing, name it and tell them what to do next time. Compliments must be earned and specific.

You are evaluating a ${mode} response.

QUESTION: ${question}
THEIR ANSWER (transcribed, may include filler words and stumbles): ${transcript || "(no audible answer captured)"}
MODE: ${mode}${resumeBlock}

Scoring rubric (0-10, be strict — 5 is average, 7 is genuinely good, 9+ is rare):
- structure: Did they organize the answer logically (intro → points → close)?
- clarity: Could a listener actually follow it without re-reading?
- completeness: Did they cover what the question actually asked?
- confidence_estimate: Based on pacing, hedging, filler density, and conviction.

Respond in EXACTLY this JSON format (no markdown, no prose outside JSON):
{
  "scores": {
    "structure": 0,
    "clarity": 0,
    "completeness": 0,
    "confidence_estimate": 0
  },
  "nailed": ["specific thing they actually did well — quote or paraphrase from their answer. If nothing, return an empty array."],
  "improve": ["specific weakness with a specific fix. Be direct. e.g. 'You never defined the term — open with a 1-line definition.' Not 'try to be clearer'."],
  "ideal_framework": ["Concrete bullet of what a strong answer would cover", "Next bullet", "Next bullet"],
  "reframe": "ONE blunt but constructive sentence. Acknowledge reality, name the gap, point to the next rep. No fluff."
}

Rules:
- If the answer is empty or near-empty, give low scores (1-3), say so in 'improve', and still give a real ideal_framework so they learn.
- Never say "good effort" or "nice try" unless they truly demonstrated something.
- Be specific. Vague feedback is useless feedback.
- Output VALID JSON only. No markdown fences.`;
}
