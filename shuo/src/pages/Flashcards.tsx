import { useEffect, useMemo, useState } from 'react';
import { ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh } from '../components/ui';
import { HSK_DECKS } from '../data/hsk';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { speak } from '../lib/speech';
import { addCards, cardsStore, dueCards, nextIntervalLabel, review, type Card, type Grade } from '../lib/srs';
import { explainIn, navigate, settingsStore } from '../lib/state';
import { toPinyin } from '../lib/zh';
import { locale, useT } from '../lib/i18n';

type Tab = 'review' | 'decks' | 'browse';

export default function Flashcards() {
  const cards = cardsStore.use();
  const [tab, setTab] = useState<Tab>(cards.length ? 'review' : 'decks');
  const { due, fresh } = dueCards(cards);
  const F = useT().cards;

  return (
    <div>
      <PageHeader
        title={F.title}
        zh="生词本"
        subtitle={F.subtitle}
        actions={
          <div className="segmented">
            {(['review', 'decks', 'browse'] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t === 'review' ? F.reviewTab(due.length + fresh.length) : t === 'decks' ? F.addTab : F.allTab(cards.length)}
              </button>
            ))}
          </div>
        }
      />
      {tab === 'review' && <Review onEmpty={() => setTab('decks')} />}
      {tab === 'decks' && <Decks />}
      {tab === 'browse' && <Browse />}
    </div>
  );
}

function Review({ onEmpty }: { onEmpty: () => void }) {
  const cards = cardsStore.use();
  const [direction, setDirection] = useState<'recognize' | 'recall'>('recognize');
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [tick, setTick] = useState(0);
  const { queue, due, fresh } = useMemo(() => dueCards(cards), [cards, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = queue[0];
  const F = useT().cards;

  // Re-check periodically so short learning steps (1–10 min) come back on their own.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (revealed && card) void speak(card.hanzi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || !card) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        grade((+e.key - 1) as Grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function grade(g: Grade) {
    if (!card) return;
    setRevealed(false);
    review(card, g);
    setDone((d) => d + 1);
  }

  if (!cards.length) {
    return (
      <section className="card empty">
        <p>{F.none}</p>
        <button className="btn btn-primary" onClick={onEmpty}>
          {F.addTab}
        </button>
      </section>
    );
  }

  if (!card) {
    const next = cards.filter((c) => c.state !== 'new').sort((a, b) => a.due - b.due)[0];
    return (
      <section className="card empty">
        <div className="big-emoji">🎉</div>
        <h2>{F.allDone}</h2>
        <p className="muted">
          {done > 0 && F.reviewed(done)}
          {next ? F.nextReview(new Date(next.due).toLocaleString(locale())) : ''}
        </p>
        <div className="row gap center wrap">
          <button className="btn" onClick={() => navigate('voice')}>
            {F.useThem}
          </button>
          <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, newCardsPerDay: s.newCardsPerDay + 5 }))}>
            {F.moreNew}
          </button>
        </div>
      </section>
    );
  }

  const front =
    direction === 'recognize' ? (
      <div className="fc-hanzi" lang="zh-CN">
        {card.hanzi}
      </div>
    ) : (
      <div className="fc-meaning">{card.meaning}</div>
    );

  return (
    <div className="review">
      <div className="row between wrap">
        <div className="muted small">
          <span className="tag">{F.due(due.length)}</span> <span className="tag tag-new">{F.new(fresh.length)}</span> · {card.deck}
          {card.state === 'new' && <span className="tag tag-new">{F.newTag}</span>}
        </div>
        <div className="segmented sm">
          <button className={direction === 'recognize' ? 'active' : ''} onClick={() => setDirection('recognize')}>
            {F.toMeaning}
          </button>
          <button className={direction === 'recall' ? 'active' : ''} onClick={() => setDirection('recall')}>
            {F.toHanzi}
          </button>
        </div>
      </div>

      <section className={`card flashcard ${revealed ? 'revealed' : ''}`} onClick={() => !revealed && setRevealed(true)}>
        {front}
        {revealed ? (
          <div className="fc-back">
            {direction === 'recall' && (
              <div className="fc-hanzi" lang="zh-CN">
                {card.hanzi}
              </div>
            )}
            <div className="fc-pinyin">
              <Pinyin hanzi={card.hanzi} /> <SpeakButton text={card.hanzi} /> <SpeakButton text={card.hanzi} slow />
            </div>
            {direction === 'recognize' && <div className="fc-meaning">{card.meaning}</div>}
            {card.example && (
              <div className="fc-example">
                <Zh text={card.example} />
                <SpeakButton text={card.example} />
                {card.exampleEn && <div className="muted small">{card.exampleEn}</div>}
              </div>
            )}
            <Explain card={card} />
          </div>
        ) : (
          <p className="muted small">{F.reveal}</p>
        )}
      </section>

      {revealed && (
        <div className="grade-row">
          {F.grades.map((label, g) => (
            <button key={g} className={`grade g${g}`} onClick={() => grade(g as Grade)}>
              <span>{label}</span>
              <small>
                {nextIntervalLabel(card, g as Grade)} · {g + 1}
              </small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Explain({ card }: { card: Card }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const F = useT().cards;

  async function explain() {
    setBusy(true);
    setError(null);
    try {
      const r = await generateJSON<{ breakdown: string; mnemonic: string; usage: string; example: string; examplePinyin: string; exampleEn: string }>(
        `Teach the Chinese word ${card.hanzi} (${card.pinyin}, "${card.meaning}"). ${learnerProfile()}
Return JSON: {"breakdown": "character/radical breakdown and what each part means", "mnemonic": "vivid memory hook", "usage": "how and when it's used, common collocations, and any confusable words", "example": "a natural example sentence at the learner's level", "examplePinyin": "", "exampleEn": ""}`,
      );
      const notes = `🧩 ${r.breakdown}\n\n🧠 ${r.mnemonic}\n\n📌 ${r.usage}`;
      cardsStore.set((all) => all.map((c) => (c.id === card.id ? { ...c, notes, example: c.example || r.example, exampleEn: c.exampleEn || r.exampleEn } : c)));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (card.notes) return <div className="fc-notes">{card.notes}</div>;
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ErrorBox error={error} />
      <button className="btn btn-sm" onClick={explain} disabled={busy}>
        {busy ? <span className="spinner sm" /> : '✨'} {F.explain}
      </button>
    </div>
  );
}

function Decks() {
  const cards = cardsStore.use();
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [manual, setManual] = useState({ hanzi: '', meaning: '' });
  const T = useT();
  const F = T.cards;

  async function generateDeck() {
    if (!topic.trim()) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const r = await generateJSON<{ words: { hanzi: string; pinyin: string; meaning: string; example: string; exampleEn: string }[] }>(
        `Create a vocabulary deck of the 15 most useful Chinese words/phrases for the topic "${topic}". ${learnerProfile()}
Pick words slightly above the learner's level that they'd genuinely need. Return JSON: {"words":[{"hanzi":"","pinyin":"tone marks","meaning":"","example":"short example sentence","exampleEn":""}]}`,
      );
      const n = addCards(r.words, topic.trim());
      setMsg(F.addedN(n, topic.trim()));
      setTopic('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function addManual() {
    const hanzi = manual.hanzi.trim();
    if (!hanzi) return;
    setError(null);
    let meaning = manual.meaning.trim();
    let pinyin = '';
    if (!meaning) {
      setBusy(true);
      try {
        const r = await generateJSON<{ pinyin: string; meaning: string }>(`Chinese word "${hanzi}". JSON: {"pinyin":"tone-marked","meaning":"concise ${explainIn()} meaning"}`, {
          temperature: 0.2,
        });
        meaning = r.meaning;
        pinyin = r.pinyin;
      } catch (e) {
        setError(errorText(e));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    const n = addCards([{ hanzi, pinyin: pinyin || toPinyin(hanzi), meaning }], 'My words');
    setMsg(n ? F.addedWord(hanzi) : F.already(hanzi));
    setManual({ hanzi: '', meaning: '' });
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h3>{F.hskDecks}</h3>
        {Object.entries(HSK_DECKS).map(([name, words]) => {
          const have = words.filter((w) => cards.some((c) => c.hanzi === w.hanzi)).length;
          return (
            <div key={name} className="deck-row">
              <div>
                <strong>{name}</strong>
                <div className="muted small">
                  {F.deckInfo(words.length, have)}
                </div>
              </div>
              <button className="btn btn-sm" disabled={have === words.length} onClick={() => setMsg(F.addedFrom(addCards(words, name), name))}>
                {have === words.length ? F.added : T.common.add}
              </button>
            </div>
          );
        })}
        <p className="muted small">{F.perDay(settingsStore.get().newCardsPerDay)}</p>
      </section>

      <section className="card">
        <h3>{F.aiDeck}</h3>
        <p className="muted small">{F.aiDeckNote}</p>
        <div className="row gap">
          <input className="input grow" placeholder={F.topicPlaceholder} value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateDeck()} />
          <button className="btn btn-primary" onClick={generateDeck} disabled={busy}>
            {T.common.generate}
          </button>
        </div>
        <div className="chips">
          {F.topics.map((t) => (
            <button key={t} className="chip" onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <h3>{F.addWord}</h3>
        <div className="row gap wrap">
          <input className="input" placeholder="汉字" value={manual.hanzi} onChange={(e) => setManual({ ...manual, hanzi: e.target.value })} />
          <input className="input grow" placeholder={F.meaningPlaceholder} value={manual.meaning} onChange={(e) => setManual({ ...manual, meaning: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addManual()} />
          <button className="btn" onClick={addManual} disabled={busy}>
            {T.common.add}
          </button>
        </div>
      </section>
      {busy && <Spinner label={T.common.working} />}
      <ErrorBox error={error} />
      {msg && <div className="success-box">✓ {msg}</div>}
    </div>
  );
}

function Browse() {
  const cards = cardsStore.use();
  const [q, setQ] = useState('');
  const [deck, setDeck] = useState('all');
  const decks = [...new Set(cards.map((c) => c.deck))];
  const T = useT();
  const F = T.cards;
  const list = cards.filter((c) => (deck === 'all' || c.deck === deck) && (!q || c.hanzi.includes(q) || c.pinyin.toLowerCase().includes(q.toLowerCase()) || c.meaning.toLowerCase().includes(q.toLowerCase())));
  const stateLabel = (c: Card) => (c.state === 'new' ? 'new' : c.state === 'learning' ? 'learning' : c.interval >= 21 ? 'mature' : 'young');

  return (
    <section className="card">
      <div className="row gap wrap">
        <input className="input grow" placeholder={F.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={deck} onChange={(e) => setDeck(e.target.value)}>
          <option value="all">{F.allDecks}</option>
          {decks.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="word-table">
          <thead>
            <tr>
              {F.cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 400).map((c) => (
              <tr key={c.id}>
                <td lang="zh-CN" className="td-hanzi">
                  {c.hanzi}
                </td>
                <td>
                  <Pinyin hanzi={c.hanzi} />
                </td>
                <td>{c.meaning}</td>
                <td>
                  <span className={`tag st-${stateLabel(c)}`}>{F.states[stateLabel(c)]}</span>
                </td>
                <td className="nowrap">
                  <SpeakButton text={c.hanzi} />
                  <button className="btn-icon" title={T.common.delete} onClick={() => cardsStore.set((all) => all.filter((x) => x.id !== c.id))}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > 400 && <p className="muted small">{F.showing(list.length)}</p>}
    </section>
  );
}
