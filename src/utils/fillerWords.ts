export const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically", "so", "actually",
  "literally", "kind of", "sort of", "i mean", "right",
];

export function countFillers(transcript: string): number {
  if (!transcript) return 0;
  const lower = ` ${transcript.toLowerCase()} `;
  let count = 0;
  for (const f of FILLER_WORDS) {
    const re = new RegExp(`\\b${f.replace(/ /g, "\\s+")}\\b`, "g");
    const matches = lower.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

export function highlightFillers(transcript: string): { text: string; filler: boolean }[] {
  if (!transcript) return [];
  // Split keeping spaces so we can rebuild
  const tokens = transcript.split(/(\s+)/);
  return tokens.map((tok) => {
    const clean = tok.toLowerCase().replace(/[.,!?;:]/g, "");
    const isFiller = FILLER_WORDS.includes(clean);
    return { text: tok, filler: isFiller };
  });
}
