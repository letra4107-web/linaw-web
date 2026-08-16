import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type FontMode = 'default' | 'dyslexic';
type ThemeMode = 'default' | 'high-contrast';

interface AccessibilityState {
  font: FontMode;
  theme: ThemeMode;
  setFont: (f: FontMode) => void;
  setTheme: (t: ThemeMode) => void;
}

const STORAGE_KEY = 'linawletra.a11y.v1';

const AccessibilityContext = createContext<AccessibilityState | undefined>(undefined);

function loadInitial(): { font: FontMode; theme: ThemeMode } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore malformed storage
  }
  return { font: 'default', theme: 'default' };
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [font, setFont] = useState<FontMode>(initial.font);
  const [theme, setTheme] = useState<ThemeMode>(initial.theme);

  useEffect(() => {
    document.body.dataset.font = font;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ font, theme }));
  }, [font, theme]);

  return (
    <AccessibilityContext.Provider value={{ font, theme, setFont, setTheme }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
