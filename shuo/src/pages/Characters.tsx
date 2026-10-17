import HanziWriter from 'hanzi-writer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner } from '../components/ui';
import { HSK_DECKS, lookupBuiltin } from '../data/hsk';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { cardsStore } from '../lib/srs';
import { award } from '../lib/state';
import { isHan } from '../lib/zh';

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
      onLoadCharDataError: () => setError(`No stroke data for ${char}.`),
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
    setFeedback('Draw the strokes in order ✍️');
    setMistakes(0);
    let misses = 0;
    void w.quiz({
      onMistake: () => {
        misses++;
        setMistakes(misses);
      },
      onComplete: ({ totalMistakes }) => {
        setFeedback(totalMistakes === 0 ? '完美！Perfect — no mistakes!' : `Done with ${totalMistakes} mistake${totalMistakes > 1 ? 's' : ''}. Try again for a clean run!`);
        award(totalMistakes === 0 ? 5 : 3, 'writing');
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
      <PageHeader title="Characters" zh="写汉字" subtitle="Watch the correct stroke order, then write it yourself — strokes are checked as you draw." />
      <ErrorBox error={error} />
      <div className="grid-2 chars-layout">
        <section className="card writer-card">
          <div className="row gap wrap">
            <input className="input grow" placeholder="Enter characters to practise, e.g. 学习中文" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load(input)} />
            <button className="btn" onClick={() => load(input)}>
              Load
            </button>
            <button className="btn" title="Random character from your words" onClick={() => load(pool[Math.floor(Math.random() * pool.length)] ?? '好')}>
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
              👀 Watch
            </button>
            <button className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}>
              ✍️ Write
            </button>
          </div>
          <div className="row gap center wrap">
            {mode === 'watch' ? (
              <button className="btn" onClick={() => writer.current?.animateCharacter()}>
                ↻ Replay
              </button>
            ) : (
              <>
                <button className="btn" onClick={startQuiz}>
                  ↻ Restart
                </button>
                <button className="btn" onClick={() => writer.current?.showOutline()}>
                  Show outline
                </button>
                <button className="btn" onClick={() => writer.current?.hideOutline()}>
                  Hide outline
                </button>
              </>
            )}
            {list.length > 1 && (
              <button className="btn" onClick={() => setIdx((i) => (i + 1) % list.length)}>
                Next →
              </button>
            )}
          </div>
          {feedback && (
            <p className="center">
              {feedback} {mode === 'quiz' && mistakes > 0 && <span className="muted">({mistakes} misses)</span>}
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
                <b>Meaning:</b> {story.meaning}
              </p>
              <p>
                <b>Radical:</b> {story.radical}
              </p>
              <p>
                <b>Components:</b> {story.components}
              </p>
              <p className="tip">📜 {story.story}</p>
              <h4>Words with {char}</h4>
              <div className="vocab-grid">
                {story.words?.map((w) => (
                  <div key={w.hanzi} className="vocab-item">
                    <span className="vocab-hanzi" lang="zh-CN">
                      {w.hanzi}
                    </span>
                    <Pinyin hanzi={w.hanzi} />
                    <span className="muted small">{w.meaning}</span>
                    <button className="btn-link" onClick={() => load(w.hanzi)}>
                      Practise
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : storyBusy ? (
            <Spinner label="Digging into the character's history…" />
          ) : (
            <button className="btn" onClick={explain}>
              ✨ Radicals, etymology & memory story
            </button>
          )}
          <h4>From your words</h4>
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
