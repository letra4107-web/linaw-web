import { useAccessibility } from '../../lib/a11y/AccessibilityContext';
import { IconLabel } from './IconLabel';

export function AccessibilityBar() {
  const { font, theme, readingGuide, setFont, setTheme, setReadingGuide } = useAccessibility();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => setFont(font === 'dyslexic' ? 'default' : 'dyslexic')}
        aria-pressed={font === 'dyslexic'}
        className="rounded-full border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-primary)]"
      >
        <IconLabel icon="🔤" label={font === 'dyslexic' ? 'Karaniwang font' : 'Madaling basahing font'} />
      </button>
      <button
        type="button"
        onClick={() => setTheme(theme === 'high-contrast' ? 'default' : 'high-contrast')}
        aria-pressed={theme === 'high-contrast'}
        className="rounded-full border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-primary)]"
      >
        <IconLabel icon="🌓" label={theme === 'high-contrast' ? 'Karaniwang kulay' : 'Mataas na contrast'} />
      </button>
      <button
        type="button"
        onClick={() => setReadingGuide(!readingGuide)}
        aria-pressed={readingGuide}
        className="rounded-full border border-[var(--color-border)] px-3 py-1.5 hover:border-[var(--color-primary)]"
      >
        <IconLabel icon="📏" label={readingGuide ? 'Isara ang Gabay sa Pagbasa' : 'Gabay sa Pagbasa'} />
      </button>
    </div>
  );
}
