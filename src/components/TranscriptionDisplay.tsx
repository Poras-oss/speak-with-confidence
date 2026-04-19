import { useEffect, useMemo, useRef } from "react";

interface Props {
  transcript: string;
  interim: string;
}

/**
 * Cinematic word-wall: words fade in, older words dim.
 * Auto-scrolls to the latest line.
 */
export function TranscriptionDisplay({ transcript, interim }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => {
    const t = transcript ? transcript.trim() : "";
    return t ? t.split(/\s+/) : [];
  }, [transcript]);

  const interimWords = useMemo(() => {
    const t = interim ? interim.trim() : "";
    return t ? t.split(/\s+/) : [];
  }, [interim]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [words.length, interimWords.length]);

  const total = words.length;
  const isEmpty = total === 0 && interimWords.length === 0;

  return (
    <div
      ref={scrollRef}
      className="relative h-full w-full overflow-y-auto px-6 md:px-12 scroll-smooth"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="mx-auto max-w-4xl py-8 leading-[1.8] text-[22px] md:text-[26px] tracking-[-0.005em]">
        {isEmpty ? (
          <p className="text-warm-muted/60 italic text-center mt-16 text-lg">
            Begin speaking — your words will appear here…
          </p>
        ) : (
          <>
            {words.map((w, i) => {
              // Trail: last 8 words bright, older fade
              const distance = total - 1 - i;
              const opacity =
                distance < 8 ? 1 : Math.max(0.35, 1 - (distance - 8) * 0.04);
              const isFresh = distance < 3;
              return (
                <span
                  key={`${i}-${w}`}
                  className="inline-block mr-[0.4em] animate-word-in"
                  style={{
                    opacity,
                    color: isFresh ? "var(--color-warm)" : "var(--color-warm-muted)",
                  }}
                >
                  {w}
                </span>
              );
            })}
            {interimWords.map((w, i) => (
              <span
                key={`i-${i}-${w}`}
                className="inline-block mr-[0.4em] text-warm-muted/70 italic"
              >
                {w}
              </span>
            ))}
            <span
              className="inline-block w-[2px] h-[1em] align-middle bg-warm/70 ml-1 animate-pulse-soft"
              aria-hidden
            />
          </>
        )}
      </div>
    </div>
  );
}
