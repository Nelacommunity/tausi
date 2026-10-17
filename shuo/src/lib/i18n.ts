import { useSyncExternalStore } from 'react';
import { en, type Dict } from '../locales/en';
import { sw } from '../locales/sw';
import { zh } from '../locales/zh';

/**
 * Shuō's interface language. Shared with Tausi (same origin, same
 * `tausi_lang` key), so choosing a language in either app applies to both.
 */
export type Lang = 'en' | 'sw' | 'zh';
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'sw', label: 'Kiswahili', short: 'SW' },
  { id: 'zh', label: '中文', short: '中' },
];

const KEY = 'tausi_lang';
const DICTS: Record<Lang, Dict> = { en, sw, zh };
/** The language the AI tutor explains things in, per interface language. */
const EXPLAIN: Record<Lang, string> = { en: 'English', sw: 'Kiswahili', zh: 'Simplified Chinese' };

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'en' || v === 'sw' || v === 'zh') return v;
  } catch {
    /* storage blocked */
  }
  return 'en';
}

let lang: Lang = read();
const listeners = new Set<() => void>();
const emit = () => {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  listeners.forEach((l) => l());
};
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;

// Another tab (e.g. Tausi) changed the language.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    lang = read();
    emit();
  }
});

export function getLang() {
  return lang;
}

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem(KEY, l);
  } catch {
    /* storage blocked */
  }
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useLang() {
  return useSyncExternalStore(subscribe, getLang);
}

/** Interface strings for the current language (re-renders on change). */
export function useT() {
  const l = useLang();
  return DICTS[l];
}

/** Interface strings outside React (error messages etc.). */
export function tr() {
  return DICTS[lang];
}

/** `'auto'` follows the interface language; anything else is the student's own choice. */
export function explainLanguage(setting: string) {
  return !setting || setting === 'auto' ? EXPLAIN[lang] : setting;
}

/** Locale for dates and numbers. */
export function locale() {
  return lang === 'zh' ? 'zh-CN' : lang === 'sw' ? 'sw-TZ' : 'en-GB';
}
