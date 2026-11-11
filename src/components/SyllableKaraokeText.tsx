import type {CSSProperties} from 'react';
import './syllable-karaoke.css';

interface SyllableKaraokeTextProps {
  syllables: string[];
  activeIndex: number | null;
  colorVar?: string;
  alternateColorVar?: string;
  highlightDifficult?: boolean;
}

export function SyllableKaraokeText({ syllables, activeIndex, colorVar = '--color-primary', alternateColorVar, highlightDifficult = false }: SyllableKaraokeTextProps) {
  return (
    <p className="syllable-karaoke" aria-label={syllables.join('')} style={{'--reading-units':Math.max(5,syllables.join('').length+syllables.length*1.3)} as CSSProperties}>
      {syllables.map((syllable, i) => {
        const syllableColor = i % 2 === 1 && alternateColorVar ? alternateColorVar : colorVar;
        const isDifficult = highlightDifficult && (syllable.length >= 3 || /[bcdfghjklmnpqrstvwxyz]{2}/i.test(syllable));
        return <span key={i} className="syllable-karaoke__group">
          <span
            className="syllable-karaoke__chip" data-active={i===activeIndex||undefined} data-difficult={isDifficult||undefined}
            style={
              i === activeIndex
                ? { backgroundColor: `var(${colorVar})`, color: 'white' }
                : isDifficult
                  ? { backgroundColor:'#ede7fb',color:'#40366f',boxShadow:'inset 0 0 0 2px #a99acb' }
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
          {i < syllables.length - 1 && <span className="syllable-karaoke__divider" aria-hidden="true">·</span>}
        </span>;
      })}
    </p>
  );
}
