import { persisted, todayKey, uid } from './store';

// ---------- Settings ----------
export type ShareMode = 'ask' | 'auto';

export interface Settings {
  textModel: string;
  liveModel: string;
  ttsModel: string;
  tutorVoice: string;
  level: number; // HSK 1–6
  nativeLanguage: string;
  goal: string;
  showPinyin: boolean;
  playback: 'gemini' | 'browser';
  dailyGoal: number; // XP per day
  newCardsPerDay: number;
  name: string;
  /** How lesson and speaking results reach the student's teachers: 'ask' = a Send button, 'auto' = sent automatically. */
  shareMode: ShareMode;
}

export const TEXT_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
export const LIVE_MODELS = ['gemini-3.1-flash-live-preview', 'gemini-2.5-flash-native-audio-preview-12-2025'];
export const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'];
export const VOICES = [
  { id: 'Kore', desc: 'Firm, clear (female)' },
  { id: 'Aoede', desc: 'Breezy, warm (female)' },
  { id: 'Leda', desc: 'Youthful (female)' },
  { id: 'Zephyr', desc: 'Bright (female)' },
  { id: 'Puck', desc: 'Upbeat (male)' },
  { id: 'Charon', desc: 'Informative (male)' },
  { id: 'Fenrir', desc: 'Excitable (male)' },
  { id: 'Orus', desc: 'Firm (male)' },
];

export const settingsStore = persisted<Settings>('settings', {
  textModel: TEXT_MODELS[0],
  liveModel: LIVE_MODELS[0],
  ttsModel: TTS_MODELS[0],
  tutorVoice: 'Kore',
  level: 1,
  nativeLanguage: 'English',
  goal: 'Become fluent enough to hold real conversations and work in Chinese',
  showPinyin: true,
  playback: 'gemini',
  dailyGoal: 50,
  newCardsPerDay: 10,
  name: '',
  shareMode: 'ask',
}, { sync: true });

// ---------- Progress / XP / streak ----------
export interface DayStats {
  xp: number;
  cards: number;
  newCards: number;
  voiceSeconds: number;
  chats: number;
  drills: number;
  lessons: number;
  reading: number;
  writing: number;
}
export interface Progress {
  xp: number;
  streak: number;
  bestStreak: number;
  lastActive: string;
  days: Record<string, DayStats>;
  lessons: Record<string, { score: number; completedAt: number }>;
}

const emptyDay = (): DayStats => ({
  xp: 0,
  cards: 0,
  newCards: 0,
  voiceSeconds: 0,
  chats: 0,
  drills: 0,
  lessons: 0,
  reading: 0,
  writing: 0,
});

export const progressStore = persisted<Progress>('progress', {
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActive: '',
  days: {},
  lessons: {},
}, { sync: true });

export function today(p: Progress = progressStore.get()): DayStats {
  return { ...emptyDay(), ...p.days[todayKey()] };
}

/** Award XP and bump a daily counter. Maintains the streak. */
export function award(xp: number, counter?: keyof DayStats, amount = 1) {
  progressStore.set((p) => {
    const key = todayKey();
    const day = { ...emptyDay(), ...p.days[key] };
    day.xp += xp;
    if (counter && counter !== 'xp') day[counter] += amount;
    let { streak, bestStreak } = p;
    if (p.lastActive !== key) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      streak = p.lastActive === todayKey(y) ? streak + 1 : 1;
      bestStreak = Math.max(bestStreak, streak);
    }
    return { ...p, xp: p.xp + xp, streak, bestStreak, lastActive: key, days: { ...p.days, [key]: day } };
  });
}

/** Streak shown to the user: broken if the last activity was before yesterday. */
export function liveStreak(p: Progress): number {
  if (!p.lastActive) return 0;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return p.lastActive === todayKey() || p.lastActive === todayKey(y) ? p.streak : 0;
}

// ---------- Mistake notebook ----------
export interface Mistake {
  id: string;
  source: 'voice' | 'chat' | 'lesson' | 'pronunciation' | 'reader';
  said: string;
  correct: string;
  pinyin?: string;
  explanation: string;
  created: number;
  mastered?: boolean;
}
export const mistakesStore = persisted<Mistake[]>('mistakes', [], { sync: true });

export function addMistakes(items: Omit<Mistake, 'id' | 'created'>[]) {
  const clean = items.filter((m) => m.correct && m.said !== m.correct);
  if (!clean.length) return;
  mistakesStore.set((all) => [...clean.map((m) => ({ ...m, id: uid(), created: Date.now() })), ...all].slice(0, 500));
}

// ---------- Speaking session history ----------
export interface SessionRecord {
  id: string;
  date: number;
  scenario: string;
  seconds: number;
  overall: number;
  fluency: number;
  accuracy: number;
  estimatedLevel: string;
  summary: string;
}
export const sessionsStore = persisted<SessionRecord[]>('sessions', [], { sync: true });

// ---------- Cross-page handoff (e.g. lesson -> voice tutor) ----------
export interface Handoff {
  scenarioTitle: string;
  scenarioPrompt: string;
}
let pendingHandoff: Handoff | null = null;
export const setHandoff = (h: Handoff) => (pendingHandoff = h);
export const takeHandoff = () => {
  const h = pendingHandoff;
  // Cleared asynchronously so StrictMode's double-invoked initializers both see it.
  setTimeout(() => (pendingHandoff = null));
  return h;
};

export function navigate(path: string) {
  window.location.hash = `/${path}`;
}
