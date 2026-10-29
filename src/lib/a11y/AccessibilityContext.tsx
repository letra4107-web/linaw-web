/* oxlint-disable react/only-export-components -- provider and its hook form one public module */
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

type FontMode = 'default' | 'dyslexic' | 'comic';
export type ThemeMode = 'default' | 'dark' | 'high-contrast';
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

const STORAGE_KEY = 'linawletra.a11y.v2';
const LEGACY_STORAGE_KEY = 'linawletra.a11y.v1';

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

function loadInitial(): { font: FontMode; theme: ThemeMode; readingGuide: boolean; fontScale: FontScale } {
  const defaults = { font: 'comic' as FontMode, theme: 'default' as ThemeMode, readingGuide: false, fontScale: 'medium' as FontScale };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...defaults, ...saved, font: saved.font === 'dyslexic' ? 'dyslexic' : 'comic' };
    }
    // Older versions also saved the student's font in the site preference.
    // Keep the other settings, but start the new independent site font at Comic Sans.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return { ...defaults, ...JSON.parse(legacy), font: 'comic' };
  } catch {
    // ignore malformed storage
  }
  return defaults;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const initial = loadInitial();
  const [siteFont, setSiteFont] = useState<FontMode>(initial.font);
  const [studentFont, setStudentFont] = useState<FontMode>('default');
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);
  const [readingGuide, setReadingGuide] = useState<boolean>(initial.readingGuide);
  const [fontScale, setFontScale] = useState<FontScale>(initial.fontScale);
  const isStudentArea = /^\/student(?:\/|$)/.test(pathname);
  const font = isStudentArea ? studentFont : siteFont;
  const setFont = isStudentArea ? setStudentFont : setSiteFont;

  // Apply the route's font before paint, including the student -> login transition.
  useLayoutEffect(() => {
    document.body.dataset.font = font;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--font-scale', String(FONT_SCALE_MULTIPLIER[fontScale]));
  }, [font, theme, fontScale]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ font: siteFont, theme, readingGuide, fontScale }));
    } catch {
      // Preferences still work for this session if browser storage is unavailable.
    }
  }, [siteFont, theme, readingGuide, fontScale]);

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
