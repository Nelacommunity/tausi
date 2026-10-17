import { persisted, uid } from './store';
import { award, progressStore, settingsStore, today } from './state';

export interface Card {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example?: string;
  examplePinyin?: string;
  exampleEn?: string;
  notes?: string; // AI explanation (markdown-ish)
  deck: string;
  state: 'new' | 'learning' | 'review';
  ease: number;
  interval: number; // days
  reps: number;
  lapses: number;
  due: number; // epoch ms
  created: number;
}

export const cardsStore = persisted<Card[]>('cards', [], { sync: true });

export type Grade = 0 | 1 | 2 | 3; // again, hard, good, easy

const DAY = 86_400_000;
const MIN = 60_000;

export function newCard(w: { hanzi: string; pinyin: string; meaning: string; example?: string; examplePinyin?: string; exampleEn?: string }, deck: string): Card {
  return { ...w, id: uid(), deck, state: 'new', ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, created: Date.now() };
}

/** Add words, skipping ones already in the collection. Returns number added. */
export function addCards(words: Parameters<typeof newCard>[0][], deck: string): number {
  const existing = new Set(cardsStore.get().map((c) => c.hanzi));
  const fresh = words.filter((w) => w.hanzi && !existing.has(w.hanzi) && (existing.add(w.hanzi), true));
  if (fresh.length) cardsStore.set((all) => [...all, ...fresh.map((w) => newCard(w, deck))]);
  return fresh.length;
}

export function hasCard(hanzi: string) {
  return cardsStore.get().some((c) => c.hanzi === hanzi);
}

/** SM-2 style scheduling with short learning steps. */
export function schedule(card: Card, grade: Grade, now = Date.now()): Card {
  const c = { ...card };
  if (c.state === 'new' || c.state === 'learning') {
    if (grade === 0) {
      c.state = 'learning';
      c.due = now + 1 * MIN;
    } else if (grade === 1) {
      c.state = 'learning';
      c.due = now + 6 * MIN;
    } else if (grade === 2) {
      if (c.state === 'learning' && c.reps > 0) {
        c.state = 'review';
        c.interval = 1;
        c.due = now + DAY;
      } else {
        c.state = 'learning';
        c.due = now + 10 * MIN;
      }
    } else {
      c.state = 'review';
      c.interval = 4;
      c.due = now + 4 * DAY;
    }
    c.reps++;
    return c;
  }
  // review
  if (grade === 0) {
    c.lapses++;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.state = 'learning';
    c.interval = 1;
    c.due = now + 10 * MIN;
  } else {
    if (grade === 1) {
      c.ease = Math.max(1.3, c.ease - 0.15);
      c.interval = Math.max(1, c.interval * 1.2);
    } else if (grade === 2) {
      c.interval = Math.max(c.interval + 1, c.interval * c.ease);
    } else {
      c.ease += 0.15;
      c.interval = Math.max(c.interval + 2, c.interval * c.ease * 1.3);
    }
    c.interval = Math.min(Math.round(c.interval * (0.95 + Math.random() * 0.1) * 10) / 10, 3650);
    c.due = now + c.interval * DAY;
  }
  c.reps++;
  return c;
}

export function nextIntervalLabel(card: Card, grade: Grade): string {
  const ms = schedule(card, grade, 0).due;
  if (ms < DAY) return `${Math.max(1, Math.round(ms / MIN))}m`;
  const d = ms / DAY;
  return d < 30 ? `${Math.round(d)}d` : d < 365 ? `${Math.round(d / 30)}mo` : `${(d / 365).toFixed(1)}y`;
}

export function dueCards(all: Card[], now = Date.now()) {
  const due = all.filter((c) => c.state !== 'new' && c.due <= now).sort((a, b) => a.due - b.due);
  const newLeft = Math.max(0, settingsStore.get().newCardsPerDay - today(progressStore.get()).newCards);
  const fresh = all.filter((c) => c.state === 'new').slice(0, newLeft);
  if (!due.length && !fresh.length) {
    // Nothing left: learn ahead on cards in short learning steps rather than making the user wait.
    const soon = all.filter((c) => c.state === 'learning' && c.due <= now + 20 * MIN).sort((a, b) => a.due - b.due);
    return { due: soon, fresh, queue: soon };
  }
  return { due, fresh, queue: [...due, ...fresh] };
}

export function review(card: Card, grade: Grade) {
  const wasNew = card.state === 'new';
  cardsStore.set((all) => all.map((c) => (c.id === card.id ? schedule(c, grade) : c)));
  award(grade === 0 ? 1 : 2, 'cards');
  if (wasNew) award(0, 'newCards');
}
