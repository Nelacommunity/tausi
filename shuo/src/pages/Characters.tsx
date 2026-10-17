import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner } from '../components/ui';
import { HSK_DECKS, lookupBuiltin } from '../data/hsk';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { cardsStore } from '../lib/srs';
import { award } from '../lib/state';
import { isHan } from '../lib/zh';
import { logActivity } from '../lib/history';
import { tr, useT } from '../lib/i18n';

interface CharStory {
  meaning: string;
  radical: string;
  components: string;
  story: string;
  words: { hanzi: string; pinyin: string; meaning: string }[];
}
const storyCache = new Map<string, CharStory>();

export default function Characters() {
  const cards = cardsStore.use();
  const [chars, setChars] = useState('你好');
  const [input, setInput] = useState('');
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<'watch' | 'quiz'>('watch');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [story, setStory] = useState<CharStory | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const writer = useRef<HanziWriter | null>(null);
  const T = useT();
  const C = T.chars;

  const list = useMemo(() => Array.from(chars).filter(isHan), [chars]);
  const char = list[idx] ?? list[0];

  const pool = useMemo(() => {
    const src = cards.length ? cards.map((c) => c.hanzi) : HSK_DECKS['HSK 1'].map((w) => w.hanzi);
    return [...new Set(src.join('').split('').filter(isHan))];
  }, [cards]);

  // Create / update the writer
  useEffect(() => {
    if (!host.current || !char) return;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    host.current.innerHTML = '';
    const size = Math.min(320, host.current.clientWidth || 320);
    writer.current = HanziWriter.create(host.current, char, {
      width: size,
      height: size,
      padding: 16,
      showOutline: true,
      strokeColor: dark ? '#f1f1f1' : '#1d1d1f',
      outlineColor: dark ? '#3a3a3f' : '#e4e4e8',
      radicalColor: '#d93a3a',
      highlightColor: '#3b82f6',
      drawingColor: dark ? '#f1f1f1' : '#1d1d1f',
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      showHintAfterMisses: 2,
      onLoadCharDataError: () => setError(tr().chars.noStroke(char)),
    });
    setFeedback(null);
    setMistakes(0);
    if (mode === 'watch') void writer.current.animateCharacter();
    else startQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char, mode]);

  useEffect(() => {
    setStory(storyCache.get(char) ?? null);
  }, [char]);

  function startQuiz() {
    const w = writer.current;
    if (!w) return;
    setFeedback(tr().chars.drawPrompt);
    setMistakes(0);
    let misses = 0;
    void w.quiz({
      onMistake: () => {
        misses++;
        setMistakes(misses);
      },
      onComplete: ({ totalMistakes }) => {
        setFeedback(totalMistakes === 0 ? tr().chars.perfect : tr().chars.doneWith(totalMistakes));
        award(totalMistakes === 0 ? 5 : 3, 'writing');
        logActivity('writing', `${tr().nav.write} · ${char}`, { xp: totalMistakes === 0 ? 5 : 3, details: { char, mistakes: totalMistakes } });
      },
    });
  }

  async function explain() {
    setStoryBusy(true);
    setError(null);
    try {
      const r = await generateJSON<CharStory>(
        `Explain the Chinese character ${char}. ${learnerProfile()}
Return JSON: {"meaning": "core meaning(s)", "radical": "radical with its meaning", "components": "breakdown of components and their roles (semantic/phonetic)", "story": "a short vivid etymology or memory story (2–3 sentences)", "words": [{"hanzi":"common word containing it","pinyin":"","meaning":""}]}
Give 4 common words, prioritising ones at or near the learner's level.`,
      );
      storyCache.set(char, r);
      setStory(r);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setStoryBusy(false);
    }
  }

  const load = (text: string) => {
    const han = Array.from(text).filter(isHan).join('');
    if (han) {
      setChars(han);
      setIdx(0);
    }
  };

  const info = cards.find((c) => c.hanzi === char) ?? lookupBuiltin(char);

  return (
    <div>
      <PageHeader title={C.title} zh="写汉字" subtitle={C.subtitle} />
      <ErrorBox error={error} />
      <div className="grid-2 chars-layout">
        <section className="card writer-card">
          <div className="row gap wrap">
            <input className="input grow" placeholder={C.placeholder} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(input)} />
            <button className="btn" onClick={() => load(input)}>
              {C.load}
            </button>
            <button className="btn" title={C.random} onClick={() => load(pool[Math.floor(Math.random() * pool.length)] ?? '好')}>
              🎲
            </button>
          </div>
          {list.length > 1 && (
            <div className="char-tabs">
              {list.map((c, i) => (
                <button key={i} className={i === idx ? 'active' : ''} onClick={() => setIdx(i)} lang="zh-CN">
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="writer-wrap">
            <div className="writer-grid" ref={host} />
          </div>
          <div className="segmented center">
            <button className={mode === 'watch' ? 'active' : ''} onClick={() => setMode('watch')}>
              {C.watch}
            </button>
            <button className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}>
              {C.write}
            </button>
          </div>
          <div className="row gap center wrap">
            {mode === 'watch' ? (
              <button className="btn" onClick={() => writer.current?.animateCharacter()}>
                {C.replay}
              </button>
            ) : (
              <>
                <button className="btn" onClick={startQuiz}>
                  {C.restart}
                </button>
                <button className="btn" onClick={() => writer.current?.showOutline()}>
                  {C.showOutline}
                </button>
                <button className="btn" onClick={() => writer.current?.hideOutline()}>
                  {C.hideOutline}
                </button>
              </>
            )}
            {list.length > 1 && (
              <button className="btn" onClick={() => setIdx((i) => (i + 1) % list.length)}>
                {C.next}
              </button>
            )}
          </div>
          {feedback && (
            <p className="center">
              {feedback} {mode === 'quiz' && mistakes > 0 && <span className="muted">{C.misses(mistakes)}</span>}
            </p>
          )}
        </section>

        <section className="card">
          <div className="char-hero">
            <span className="char-big" lang="zh-CN">
              {char}
            </span>
            <div>
              <Pinyin hanzi={char} /> <SpeakButton text={char} />
              {info && <p>{info.meaning}</p>}
            </div>
          </div>
          {story ? (
            <div className="char-story">
              <p>
                <b>{C.meaning}</b> {story.meaning}
              </p>
              <p>
                <b>{C.radical}</b> {story.radical}
              </p>
              <p>
                <b>{C.components}</b> {story.components}
              </p>
              <p className="tip">📜 {story.story}</p>
              <h4>{C.wordsWith(char)}</h4>
              <div className="vocab-grid">
                {story.words?.map((w) => (
                  <div key={w.hanzi} className="vocab-item">
                    <span className="vocab-hanzi" lang="zh-CN">
                      {w.hanzi}
                    </span>
                    <Pinyin hanzi={w.hanzi} />
                    <span className="muted small">{w.meaning}</span>
                    <button className="btn-link" onClick={() => load(w.hanzi)}>
                      {C.practise}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : storyBusy ? (
            <Spinner label={C.digging} />
          ) : (
            <button className="btn" onClick={explain}>
              {C.explain}
            </button>
          )}
          <h4>{C.fromWords}</h4>
          <div className="char-pool">
            {pool.slice(0, 60).map((c) => (
              <button key={c} onClick={() => load(c)} lang="zh-CN" className={c === char ? 'active' : ''}>
                {c}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
