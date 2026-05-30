"use client";

import { createContext, useContext, useEffect, useState } from "react";
import t, { type Lang, type Translations } from "./translations";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  T: Translations;
}

const LangContext = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  T: t.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("tausi_lang") as Lang | null;
    if (stored === "en" || stored === "sw") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("tausi_lang", l);
    document.documentElement.lang = l;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, T: t[lang] as Translations }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
