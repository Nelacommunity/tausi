import { useEffect, useMemo, useState } from 'react';
import { ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh } from '../components/ui';
import { HSK_DECKS } from '../data/hsk';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { speak } from '../lib/speech';
import { addCards, cardsStore, dueCards, nextIntervalLabel, review, type Card, type Grade } from '../lib/srs';
import { navigate, settingsStore } from '../lib/state';
import { toPinyin } from '../lib/zh';

type Tab = 'review' | 'decks' | 'browse';

export default function Flashcards() {
  const cards = cardsStore.use();
  const [tab, setTab] = useState<Tab>(cards.length ? 'review' : 'decks');
  const { due, fresh } = dueCards(cards);

  return (
    <div>
      <PageHeader
        title="Flashcards"
        zh="生词本"
        subtitle="Spaced repetition: each word comes back just before you'd forget it."
        actions={
          <div className="segmented">
            {(['review', 'decks', 'browse'] as Tab[]).map((t) => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t === 'review' ? `Review (${due.length + fresh.length})` : t === 'decks' ? 'Add words' : `All (${cards.length})`}
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
        <p>No flashcards yet. Add the HSK 1 deck or generate a topic deck to get started.</p>
        <button className="btn btn-primary" onClick={onEmpty}>
          Add words
        </button>
      </section>
    );
  }

  if (!card) {
    const next = cards.filter((c) => c.state !== 'new').sort((a, b) => a.due - b.due)[0];
    return (
      <section className="card empty">
        <div className="big-emoji">🎉</div>
        <h2>All done for now!</h2>
        <p className="muted">
          {done > 0 && `You reviewed ${done} cards this session. `}
          {next ? `Next review ${new Date(next.due).toLocaleString()}.` : ''}
        </p>
        <div className="row gap center wrap">
          <button className="btn" onClick={() => navigate('voice')}>
            🎙️ Use them in conversation
          </button>
          <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, newCardsPerDay: s.newCardsPerDay + 5 }))}>
            + 5 more new cards today
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
          <span className="tag">{due.length} due</span> <span className="tag tag-new">{fresh.length} new</span> · {card.deck}
          {card.state === 'new' && <span className="tag tag-new">NEW</span>}
        </div>
        <div className="segmented sm">
          <button className={direction === 'recognize' ? 'active' : ''} onClick={() => setDirection('recognize')}>
            汉字 → meaning
          </button>
          <button className={direction === 'recall' ? 'active' : ''} onClick={() => setDirection('recall')}>
            meaning → 汉字
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
          <p className="muted small">Tap or press Space to reveal</p>
        )}
      </section>

      {revealed && (
        <div className="grade-row">
          {(['Again', 'Hard', 'Good', 'Easy'] as const).map((label, g) => (
            <button key={label} className={`grade g${g}`} onClick={() => grade(g as Grade)}>
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
        {busy ? <span className="spinner sm" /> : '✨'} Explain, mnemonic & example
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
      setMsg(`Added ${n} new cards to "${topic.trim()}".`);
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
        const r = await generateJSON<{ pinyin: string; meaning: string }>(`Chinese word "${hanzi}". JSON: {"pinyin":"tone-marked","meaning":"concise English meaning"}`, {
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
    setMsg(n ? `Added ${hanzi}.` : `${hanzi} is already in your deck.`);
    setManual({ hanzi: '', meaning: '' });
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h3>📦 HSK decks</h3>
        {Object.entries(HSK_DECKS).map(([name, words]) => {
          const have = words.filter((w) => cards.some((c) => c.hanzi === w.hanzi)).length;
          return (
            <div key={name} className="deck-row">
              <div>
                <strong>{name}</strong>
                <div className="muted small">
                  {words.length} words · {have} in your collection
                </div>
              </div>
              <button className="btn btn-sm" disabled={have === words.length} onClick={() => setMsg(`Added ${addCards(words, name)} cards from ${name}.`)}>
                {have === words.length ? '✓ Added' : 'Add'}
              </button>
            </div>
          );
        })}
        <p className="muted small">New cards are introduced {settingsStore.get().newCardsPerDay} per day (change in Settings).</p>
      </section>

      <section className="card">
        <h3>✨ AI topic deck</h3>
        <p className="muted small">Any topic, tailored to your level — your job, hobbies, an upcoming trip…</p>
        <div className="row gap">
          <input className="input grow" placeholder="e.g. software engineering, hot pot, basketball" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && generateDeck()} />
          <button className="btn btn-primary" onClick={generateDeck} disabled={busy}>
            Generate
          </button>
        </div>
        <div className="chips">
          {['Business meetings', 'Travel in China', 'Food & cooking', 'Tech & programming', 'Emotions', 'Doctor & health'].map((t) => (
            <button key={t} className="chip" onClick={() => setTopic(t)}>
              {t}
            </button>
          ))}
        </div>

        <h3>✍️ Add a word</h3>
        <div className="row gap wrap">
          <input className="input" placeholder="汉字" value={manual.hanzi} onChange={(e) => setManual({ ...manual, hanzi: e.target.value })} />
          <input className="input grow" placeholder="Meaning (leave blank for AI)" value={manual.meaning} onChange={(e) => setManual({ ...manual, meaning: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addManual()} />
          <button className="btn" onClick={addManual} disabled={busy}>
            Add
          </button>
        </div>
      </section>
      {busy && <Spinner label="Working…" />}
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
  const list = cards.filter((c) => (deck === 'all' || c.deck === deck) && (!q || c.hanzi.includes(q) || c.pinyin.toLowerCase().includes(q.toLowerCase()) || c.meaning.toLowerCase().includes(q.toLowerCase())));
  const stateLabel = (c: Card) => (c.state === 'new' ? 'new' : c.state === 'learning' ? 'learning' : c.interval >= 21 ? 'mature' : 'young');

  return (
    <section className="card">
      <div className="row gap wrap">
        <input className="input grow" placeholder="Search hanzi, pinyin or meaning" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={deck} onChange={(e) => setDeck(e.target.value)}>
          <option value="all">All decks</option>
          {decks.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="word-table">
          <thead>
            <tr>
              <th>Word</th>
              <th>Pinyin</th>
              <th>Meaning</th>
              <th>Status</th>
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
                  <span className={`tag st-${stateLabel(c)}`}>{stateLabel(c)}</span>
                </td>
                <td className="nowrap">
                  <SpeakButton text={c.hanzi} />
                  <button className="btn-icon" title="Delete" onClick={() => cardsStore.set((all) => all.filter((x) => x.id !== c.id))}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > 400 && <p className="muted small">Showing first 400 of {list.length}.</p>}
    </section>
  );
}
