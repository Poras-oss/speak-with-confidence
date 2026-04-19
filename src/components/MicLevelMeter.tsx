interface Props {
  level: number; // 0..1
  active: boolean;
}

export function MicLevelMeter({ level, active }: Props) {
  const bars = 24;
  const activeBars = Math.round(level * bars);
  return (
    <div className="flex items-center gap-[3px] h-4">
      {Array.from({ length: bars }).map((_, i) => {
        const on = active && i < Math.max(2, activeBars);
        const dist = Math.abs(i - bars / 2);
        const baseHeight = 6 + (bars / 2 - dist) * 0.6;
        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-all duration-100"
            style={{
              height: on ? `${baseHeight + level * 14}px` : "4px",
              background: on ? "var(--color-listening)" : "var(--color-border)",
              opacity: on ? 0.9 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
}
