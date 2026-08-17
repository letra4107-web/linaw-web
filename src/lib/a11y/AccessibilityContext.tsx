import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type FontMode = 'default' | 'dyslexic';
type ThemeMode = 'default' | 'high-contrast';
export type FontScale = 'small' | 'medium' | 'large';

const FONT_SCALE_MULTIPLIER: Record<FontScale, number> = { small: 0.92, medium: 1, large: 1.16 };

interface AccessibilityState {
  font: FontMode;
  theme: ThemeMode;
  readingGuide: boolean;
  fontScale: FontScale;
  setFont: (f: FontMode) => void;
  setTheme: (t: ThemeMode) => void;
  setReadingGuide: (v: boolean) => void;
  setFontScale: (s: FontScale) => void;
}

const STORAGE_KEY = 'linawletra.a11y.v1';

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

function loadInitial(): { font: FontMode; theme: ThemeMode; readingGuide: boolean; fontScale: FontScale } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { readingGuide: false, fontScale: 'medium', ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return { font: 'default', theme: 'default', readingGuide: false, fontScale: 'medium' };
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [font, setFont] = useState<FontMode>(initial.font);
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);
  const [readingGuide, setReadingGuide] = useState<boolean>(initial.readingGuide);
  const [fontScale, setFontScale] = useState<FontScale>(initial.fontScale);

  useEffect(() => {
    document.body.dataset.font = font;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--font-scale', String(FONT_SCALE_MULTIPLIER[fontScale]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ font, theme, readingGuide, fontScale }));
  }, [font, theme, readingGuide, fontScale]);

  return (
    <AccessibilityContext.Provider
      value={{ font, theme, readingGuide, fontScale, setFont, setTheme, setReadingGuide, setFontScale }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
