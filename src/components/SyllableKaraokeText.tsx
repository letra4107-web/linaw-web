interface SyllableKaraokeTextProps {
  syllables: string[];
  activeIndex: number | null;
  colorVar?: string;
  alternateColorVar?: string;
  highlightDifficult?: boolean;
}

export function SyllableKaraokeText({ syllables, activeIndex, colorVar = '--color-primary', alternateColorVar, highlightDifficult = false }: SyllableKaraokeTextProps) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1 text-6xl font-black tracking-wide sm:text-7xl">
      {syllables.map((syllable, i) => {
        const syllableColor = i % 2 === 1 && alternateColorVar ? alternateColorVar : colorVar;
        const isDifficult = highlightDifficult && (syllable.length >= 3 || /[bcdfghjklmnpqrstvwxyz]{2}/i.test(syllable));
        return <span key={i} className="flex items-center">
          <span
            className="rounded-xl px-2 py-0.5 font-black transition-colors duration-150"
            style={
              i === activeIndex
                ? { backgroundColor: `var(${colorVar})`, color: 'white' }
                : isDifficult
                  ? { backgroundColor: `var(${syllableColor})`, color: 'white', boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(${syllableColor}) 70%, white)` }
                  : {
                    backgroundColor: `color-mix(in srgb, var(${syllableColor}) 25%, white)`,
                    // Keep inactive syllables dark and heavy against their light
                    // chips; the currently spoken syllable switches to white on
                    // the brand colour for the strongest possible contrast.
                    color: '#40366f',
                    boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(${syllableColor}) 45%, white)`,
                  }
            }
          >
            {syllable}
          </span>
          {i < syllables.length - 1 && <span className="mx-0.5 text-[var(--color-text-muted)]">·</span>}
        </span>;
      })}
    </p>
  );
}
