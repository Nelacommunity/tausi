import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { addCards, cardsStore } from '../lib/srs';
import { speak } from '../lib/speech';
import { settingsStore, explainIn } from '../lib/state';
import { isHan, segment, syllables, toPinyin } from '../lib/zh';
import { errorText, generateJSON } from '../lib/gemini';
import { lookupBuiltin } from '../data/hsk';
import { useLang, useT } from '../lib/i18n';

/** Chinese text with optional pinyin ruby and tone colouring. Words are clickable when `onWord` is set. */
export function Zh({
  text,
  pinyin,
  size,
  onWord,
  className = '',
}: {
  text: string;
  pinyin?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onWord?: (word: string, context: string, el: HTMLElement) => void;
  className?: string;
}) {
  const show = pinyin ?? settingsStore.use().showPinyin;
  const words = onWord ? segment(text) : [text];
  return (
    <span className={`zh zh-${size ?? 'md'} ${className}`} lang="zh-CN">
      {words.map((w, wi) => {
        const syls = syllables(w);
        const inner = syls.map((s, i) =>
          s.tone < 0 ? (
            <span key={i}>{s.char}</span>
          ) : show ? (
            <ruby key={i} className={`t${s.tone}`}>
              {s.char}
              <rt>{s.py}</rt>
            </ruby>
          ) : (
            <span key={i}>{s.char}</span>
          ),
        );
        if (!onWord || !isHan(w)) return <span key={wi}>{inner}</span>;
        return (
          <span key={wi} className="zh-word" onClick={(e) => onWord(w, text, e.currentTarget)}>
            {inner}
          </span>
        );
      })}
    </span>
  );
}

/** Pinyin string coloured by tone. */
export function Pinyin({ hanzi, pinyin }: { hanzi?: string; pinyin?: string }) {
  if (hanzi) {
    return (
      <span className="pinyin">
        {syllables(hanzi).map((s, i) =>
          s.tone < 0 ? (
            <span key={i}>{s.char.trim() ? s.char : ' '}</span>
          ) : (
            <span key={i} className={`t${s.tone}`}>
              {s.py}{' '}
            </span>
          ),
        )}
      </span>
    );
  }
  return <span className="pinyin">{pinyin}</span>;
}

export function SpeakButton({ text, slow, label, className = '' }: { text: string; slow?: boolean; label?: string; className?: string }) {
  const T = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`btn-icon ${busy ? 'busy' : ''} ${className}`}
      title={slow ? T.common.playSlow : T.common.play}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await speak(text, { slow });
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <span className="spinner sm" /> : slow ? '🐢' : '🔊'}
      {label && <span>{label}</span>}
    </button>
  );
}

export function AddCardButton({ word, deck = 'Collected' }: { word: { hanzi: string; pinyin?: string; meaning: string; example?: string; exampleEn?: string }; deck?: string }) {
  const T = useT();
  const cards = cardsStore.use();
  const has = cards.some((c) => c.hanzi === word.hanzi);
  return (
    <button
      type="button"
      className={`chip-btn ${has ? 'done' : ''}`}
      disabled={has}
      onClick={(e) => {
        e.stopPropagation();
        addCards([{ ...word, pinyin: word.pinyin || toPinyin(word.hanzi) }], deck);
      }}
    >
      {has ? T.common.inDeck : T.common.addCard}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: string | null; onRetry?: () => void }) {
  const T = useT();
  if (!error) return null;
  return (
    <div className="error-box">
      <span>⚠️ {error}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          {T.common.retry}
        </button>
      )}
    </div>
  );
}

export function PageHeader({ title, zh, subtitle, actions }: { title: string; zh?: string; subtitle?: string; actions?: ReactNode }) {
  const lang = useLang();
  return (
    <header className="page-header">
      <div>
        <h1>
          {title} {zh && zh !== title && lang !== 'zh' && <span className="h-zh">{zh}</span>}
        </h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}

// ---------- Tap-a-word dictionary popup ----------
interface Lookup {
  pinyin: string;
  meaning: string;
  note?: string;
}
const lookupCache = new Map<string, Lookup>();

export interface WordTarget {
  word: string;
  context: string;
  rect: DOMRect;
}

export function WordPopup({ target, onClose }: { target: WordTarget | null; onClose: () => void }) {
  const T = useT();
  const [info, setInfo] = useState<Lookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target) return;
    setError(null);
    const { word, context } = target;
    const known = cardsStore.get().find((c) => c.hanzi === word) ?? lookupBuiltin(word);
    const key = `${word}|${context}`;
    if (known) return setInfo({ pinyin: known.pinyin, meaning: known.meaning });
    if (lookupCache.has(key)) return setInfo(lookupCache.get(key)!);
    setInfo(null);
    let cancelled = false;
    generateJSON<Lookup>(
      `Define the Chinese word "${word}" as used in this sentence: "${context}".
Return JSON: {"pinyin": "tone-marked pinyin", "meaning": "concise ${explainIn()} meaning in this context", "note": "optional short usage note or empty string"}`,
      { temperature: 0.2 },
    )
      .then((r) => {
        lookupCache.set(key, r);
        if (!cancelled) setInfo(r);
      })
      .catch((e) => !cancelled && setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const t = setTimeout(() => document.addEventListener('mousedown', close));
    document.addEventListener('keydown', esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [target, onClose]);

  if (!target) return null;
  const top = Math.min(target.rect.bottom + 8, window.innerHeight - 220);
  const left = Math.max(12, Math.min(target.rect.left, window.innerWidth - 300));
  return (
    <div className="word-popup" ref={ref} style={{ top, left }}>
      <div className="wp-head">
        <span className="wp-hanzi" lang="zh-CN">
          {target.word}
        </span>
        <SpeakButton text={target.word} />
      </div>
      <Pinyin hanzi={target.word} />
      {error ? (
        <p className="error-text">{error}</p>
      ) : info ? (
        <>
          <p className="wp-meaning">{info.meaning}</p>
          {info.note && <p className="muted small">{info.note}</p>}
          <AddCardButton word={{ hanzi: target.word, pinyin: info.pinyin, meaning: info.meaning, example: target.context }} />
        </>
      ) : (
        <Spinner label={T.common.lookingUp} />
      )}
    </div>
  );
}

export function useWordPopup() {
  const [target, setTarget] = useState<WordTarget | null>(null);
  const open = (word: string, context: string, el: HTMLElement) => setTarget({ word, context, rect: el.getBoundingClientRect() });
  const close = useCallback(() => setTarget(null), []);
  const popup = <WordPopup target={target} onClose={close} />;
  return { open, popup };
}
