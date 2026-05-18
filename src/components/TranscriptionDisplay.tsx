import { useEffect, useMemo, useRef, useState } from "react";

import type { TranscriptChunk } from "@/hooks/useTranscriber";

interface Props {
  transcript: string;
  interim: string;
  chunks?: TranscriptChunk[];
  listening?: boolean;
}

function GhostChunkView({ chunk }: { chunk: TranscriptChunk }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let raf1: number, raf2: number;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  const isStale = chunk.status === 'stale-ghost';
  
  const ghostWords = chunk.ghostText.split(' ');

  return (
    <>
      {ghostWords.map((gw, i) => (
        <span 
          key={`${chunk.id}-ghost-${i}`}
          className={`inline-block mr-[0.4em] chunk-ghost ${visible ? 'visible' : ''} ${isStale ? 'chunk-ghost-stale' : ''}`}
        >
          {gw}
        </span>
      ))}
    </>
  );
}

/**
 * Cinematic word-wall: words fade in, older words dim.
 * Auto-scrolls to the latest line.
 */
export function TranscriptionDisplay({ transcript, interim, chunks, listening = true }: Props) {
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
  
  const hasChunks = chunks !== undefined;
  const chunkWordsTotal = hasChunks ? chunks.reduce((acc, c) => acc + c.words.length, 0) : 0;
  const isEmpty = hasChunks 
    ? (chunks.length === 0 && interimWords.length === 0) 
    : (total === 0 && interimWords.length === 0);

  let wordIndex = 0;

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
            {hasChunks ? (
              chunks.map(chunk => {
                if (chunk.status === 'ghost' || chunk.status === 'stale-ghost') {
                  return <GhostChunkView key={chunk.id} chunk={chunk} />;
                }
                
                return chunk.words.map((w, index) => {
                  const distance = chunkWordsTotal - 1 - wordIndex;
                  wordIndex++;
                  
                  const isFresh = distance < 3;
                  const isArriving = chunk.status === 'arriving';
                  
                  // if arriving, opacity is driven by animation
                  const opacity = distance < 8 ? 1 : Math.max(0.35, 1 - (distance - 8) * 0.04);
                  const staggerStyle = isArriving ? { animationDelay: `${index * 58}ms` } : { opacity };
                  
                  return (
                    <span
                      key={`${chunk.id}-${index}`}
                      className={`inline-block mr-[0.4em] ${isArriving ? 'word-arriving' : 'animate-word-in'}`}
                      style={{
                        ...staggerStyle,
                        color: isFresh ? "var(--color-warm)" : "var(--color-warm-muted)"
                      }}
                    >
                      {w}
                    </span>
                  );
                });
              })
            ) : (
              words.map((w, i) => {
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
              })
            )}
            {interimWords.map((w, i) => (
              <span
                key={`i-${i}-${w}`}
                className="inline-block mr-[0.4em] text-warm-muted/70 italic"
              >
                {w}
              </span>
            ))}
            {listening && (
              <span
                className="inline-block w-[2px] h-[1em] align-middle bg-warm/70 ml-1 animate-pulse-soft"
                aria-hidden
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
