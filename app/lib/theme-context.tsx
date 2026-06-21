"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

/** Apply the theme class to <html>. Dark is the default (no class needed). */
function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", t === "light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default dark; the inline head script (see layout) sets the real value
  // before paint, and we sync from the DOM on mount to avoid hydration drift.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("tausi_theme") as Theme | null;
    const initial: Theme = stored === "light" ? "light"
      : stored === "dark" ? "dark"
      : document.documentElement.classList.contains("light") ? "light" : "dark";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("tausi_theme", t);
    applyTheme(t);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Inline script string injected into <head> to set the theme class before
 * first paint — prevents a flash of the wrong theme. Respects a saved
 * preference, falling back to the OS setting, then dark.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('tausi_theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;
