interface SyllableKaraokeTextProps {
  syllables: string[];
  activeIndex: number | null;
  colorVar?: string;
}

export function SyllableKaraokeText({ syllables, activeIndex, colorVar = '--color-primary' }: SyllableKaraokeTextProps) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1 text-5xl font-extrabold tracking-wide">
      {syllables.map((syllable, i) => (
        <span key={i} className="flex items-center">
          <span
            className="rounded-xl px-2 py-0.5 transition-colors duration-150"
            style={
              i === activeIndex
                ? { backgroundColor: `var(${colorVar})`, color: 'white' }
                : { color: `var(${colorVar})` }
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
