interface SyllableKaraokeTextProps {
  syllables: string[];
  activeIndex: number | null;
  colorVar?: string;
  alternateColorVar?: string;
}

export function SyllableKaraokeText({ syllables, activeIndex, colorVar = '--color-primary', alternateColorVar }: SyllableKaraokeTextProps) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1 text-6xl font-black tracking-wide sm:text-7xl">
      {syllables.map((syllable, i) => (
        <span key={i} className="flex items-center">
          <span
            className="rounded-xl px-2 py-0.5 font-black transition-colors duration-150"
            style={
              i === activeIndex
                ? { backgroundColor: `var(${colorVar})`, color: 'white' }
                : {
                    backgroundColor: `color-mix(in srgb, var(${i % 2 === 1 && alternateColorVar ? alternateColorVar : colorVar}) 25%, white)`,
                    color: 'var(--color-text)',
                    boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(${i % 2 === 1 && alternateColorVar ? alternateColorVar : colorVar}) 45%, white)`,
                  }
            }
          >
            {syllable}
          </span>
          {i < syllables.length - 1 && <span className="mx-0.5 text-[var(--color-text-muted)]">·</span>}
        </span>
      ))}
    </p>
  );
}
