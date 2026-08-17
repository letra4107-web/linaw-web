import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type FontMode = 'default' | 'dyslexic';
type ThemeMode = 'default' | 'high-contrast';

interface AccessibilityState {
  font: FontMode;
  theme: ThemeMode;
  readingGuide: boolean;
  setFont: (f: FontMode) => void;
  setTheme: (t: ThemeMode) => void;
  setReadingGuide: (v: boolean) => void;
}

const STORAGE_KEY = 'linawletra.a11y.v1';

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

function loadInitial(): { font: FontMode; theme: ThemeMode; readingGuide: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { readingGuide: false, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return { font: 'default', theme: 'default', readingGuide: false };
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [font, setFont] = useState<FontMode>(initial.font);
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);
  const [readingGuide, setReadingGuide] = useState<boolean>(initial.readingGuide);

  useEffect(() => {
    document.body.dataset.font = font;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ font, theme, readingGuide }));
  }, [font, theme, readingGuide]);

  return (
    <AccessibilityContext.Provider value={{ font, theme, readingGuide, setFont, setTheme, setReadingGuide }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
