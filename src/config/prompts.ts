import type { Difficulty, ModeId } from "./modes";

export function technicalQuestionPrompt(level: Difficulty, domain: string, resume?: string) {
  if (resume && resume.trim().length > 0) {
    const trimmed = resume.slice(0, 4000);
    return `You are a senior technical interviewer. The candidate's resume is below. Generate ONE specific interview question for a ${level} engineer about ${domain} that directly references something concrete from their resume (a project, technology, role, or claim). Frame the question as a real-world scenario or a practical problem they might face on the job, rather than a theoretical or textbook question. Probe for depth. Return ONLY the question, no preamble, no quotes.

RESUME:
"""
${trimmed}
"""`;
  }
  return `You are a senior technical interviewer. Generate 1 interview question for a ${level} software engineer about ${domain}. Frame the question as a practical, real-world on-the-job scenario they need to solve, rather than a generalized or textbook question. Return ONLY the question, nothing else. The question should be specific, not vague. No preamble.`;
}

// Topic categories and framing angles for variety rotation
const TOPIC_CATEGORIES = [
  "everyday life and habits",
  "technology in daily life",
  "movies, books, and entertainment",
  "food and culture",
  "travel and places",
  "work-life balance",
  "childhood memories",
  "friendship and relationships",
  "hobbies and personal interests",
  "local community and society",
];

const FRAMING_ANGLES = [
  "a simple question about personal preference",
  "an easy hypothetical scenario",
  "a straightforward opinion",
  "a lighthearted debate topic",
  "a personal experience or story",
  "a common everyday dilemma",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function extemporeTopicPrompt(interests?: string, countryContext?: string) {
  const contextInstruction = countryContext ? ` Make the topic highly relatable to someone living in ${countryContext}, using local context if applicable, but keep it very easy to understand.` : ` Make it general, straightforward, and easy to speak about for anyone.`;

  const hasInterests = interests && interests.trim().length > 0;

  if (hasInterests) {
    // When interests are set, rotate through the interests list and pick one
    const interestList = interests!.split(",").map((s) => s.trim()).filter(Boolean);
    const chosenInterest = pickRandom(interestList);
    const angle = pickRandom(FRAMING_ANGLES);
    return `Generate ONE straightforward and easy-to-answer extempore speaking topic about "${chosenInterest}". Frame it as ${angle}.${contextInstruction} Return ONLY the topic as a single sentence or question. No preamble, no numbering, no quotes.`;
  }

  // No interests — rotate through categories + angles for maximum variety
  const category = pickRandom(TOPIC_CATEGORIES);
  const angle = pickRandom(FRAMING_ANGLES);
  const seed = Math.random().toString(36).slice(2, 6); // adds entropy per call
  return `Generate ONE simple, everyday extempore speaking topic from the category of "${category}". Frame it as ${angle}.${contextInstruction} Variation seed: ${seed}. Return ONLY the topic as a single sentence or question. No preamble, no numbering, no quotes.`;
}

export function conversationSystemPrompt() {
  return `You are an expert English language conversation coach applying evidence-based language acquisition principles (such as Krashen's Affective Filter hypothesis and Communicative Language Teaching). Your goal is to help the user improve their conversational fluency in a low-anxiety environment. 
Rules:
1. Prioritize meaning and flow over perfect grammar. 
2. Keep your responses concise (1-2 sentences maximum) to maximize the user's speaking time.
3. Ask open-ended, engaging questions to encourage elaboration.
4. Provide implicit error correction through 'recasting'—if the user makes a grammatical error, naturally model the correct usage in your reply without explicitly pointing out their mistake.
5. Do not list corrections or break character. 
Start the conversation with a simple, friendly question.`;
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
  "improve": ["ACTIONABLE step-by-step fix for a specific weakness. Explain exactly HOW to improve it (e.g. 'Use the STAR method: Start with the Situation, then...'). Not 'try to be clearer'."],
  "ideal_framework": ["Detailed, concrete point that a strong answer would cover applied to THIS specific question", "Next detailed point", "Next detailed point"],
  "improved_response": "A fully fleshed out, highly polished, and structured 3-5 sentence example response that perfectly applies the framework to the given question. Provide a strong exemplar they can learn from.",
  "reframe": "ONE blunt but constructive sentence. Acknowledge reality, name the gap, point to the next rep. No fluff.",
  "resources": [
    {
      "title": "Name of a relevant framework, concept, or technical topic",
      "description": "1-sentence explanation of what this is and how it helps answer the question better.",
      "type": "framework | concept | article"
    }
  ]
}

Rules:
- If the answer is empty or near-empty, give low scores (1-3), say so in 'improve', and still give a real ideal_framework so they learn.
- Never say "good effort" or "nice try" unless they truly demonstrated something.
- Be specific. Vague feedback is useless feedback.
- Output VALID JSON only. No markdown fences.`;
}
