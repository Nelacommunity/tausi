import { useState } from 'react';
import { AddCardButton, ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh, useWordPopup } from '../components/ui';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { speak, stopPlayback } from '../lib/speech';
import { addCards } from '../lib/srs';
import { award, settingsStore, explainIn } from '../lib/state';
import { persisted } from '../lib/store';
import { logActivity } from '../lib/history';
import { useT } from '../lib/i18n';

interface Story {
  title: string;
  paragraphs: string[];
  translations: string[];
  vocab: { hanzi: string; pinyin: string; meaning: string }[];
  questions: { q: string; options: string[]; answer: number; explanation: string }[];
}

const readerStore = persisted<{ story: Story | null; answers: Record<number, number> }>('reader', { story: null, answers: {} });

const GENRES = ['Daily life', 'Mystery', 'Funny story', 'Chinese culture', 'Business', 'Travel', 'Sci-fi', 'Romance', 'History', 'News-style'];

export default function Reader() {
  const settings = settingsStore.use();
  const { story, answers } = readerStore.use();
  const [topic, setTopic] = useState('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('short');
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEn, setShowEn] = useState<Record<number, boolean>>({});
  const [playing, setPlaying] = useState<number | null>(null);
  const { open: openWord, popup } = useWordPopup();
  const T = useT();
  const R = T.reader;

  async function generate(fromText?: string) {
    setBusy(true);
    setError(null);
    setShowEn({});
    try {
      const len = { short: '120–180', medium: '250–350', long: '450–600' }[length];
      const prompt = fromText
        ? `Here is a Chinese text the learner wants to study:\n"""${fromText}"""\n${learnerProfile()}
Split it into natural paragraphs (keep the original text exactly; convert to simplified characters if needed). Return JSON:
{"title": "short Chinese title", "paragraphs": ["..."], "translations": ["${explainIn()} translation per paragraph"], "vocab": [{"hanzi":"","pinyin":"","meaning":""}], "questions": [{"q":"question in ${settings.level <= 3 ? explainIn() : 'Chinese'}","options":["","","",""],"answer": 0,"explanation":""}]}
Give 8–12 key vocab items likely new to the learner and 3 comprehension questions.`
        : `Write an original, engaging graded-reader story in simplified Chinese. ${learnerProfile()}
Genre: ${genre}. ${topic ? `Topic: ${topic}.` : ''} Length: ${len} characters.
Use ~90% vocabulary at or below HSK ${settings.level} and ~10% new words (i+1). Use natural, grammatical sentences, some dialogue, and a satisfying ending.
Return JSON:
{"title": "Chinese title", "paragraphs": ["paragraph 1", "..."], "translations": ["${explainIn()} translation per paragraph"], "vocab": [{"hanzi":"","pinyin":"","meaning":""}], "questions": [{"q":"question in ${settings.level <= 3 ? explainIn() : 'Chinese'}","options":["","","",""],"answer": 0,"explanation":"${explainIn()}"}]}
Give 6–10 vocab items (the new/harder words) and 3–4 comprehension questions; "answer" is the index of the correct option.`;
      const s = await generateJSON<Story>(prompt, { temperature: fromText ? 0.3 : 1 });
      readerStore.set({ story: s, answers: {} });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function playAll() {
    if (!story) return;
    for (let i = 0; i < story.paragraphs.length; i++) {
      setPlaying(i);
      await speak(story.paragraphs[i]);
      if (readerStopped) break;
    }
    readerStopped = false;
    setPlaying(null);
  }

  function answer(qi: number, oi: number) {
    if (answers[qi] !== undefined || !story) return;
    const next = { ...answers, [qi]: oi };
    readerStore.set({ story, answers: next });
    if (Object.keys(next).length === story.questions.length) {
      const correct = story.questions.filter((q, i) => next[i] === q.answer).length;
      award(10 + correct * 3, 'reading');
      logActivity('reading', `${T.nav.read} · ${story.title}`, {
        score: (correct / Math.max(1, story.questions.length)) * 100, xp: 10 + correct * 3,
        details: { correct, total: story.questions.length },
      });
    }
  }

  const correctCount = story ? story.questions.filter((q, i) => answers[i] === q.answer).length : 0;

  return (
    <div>
      <PageHeader title={R.title} zh="分级阅读" subtitle={R.subtitle} />
      <ErrorBox error={error} />

      <section className="card">
        <div className="row gap wrap">
          <label className="field">
            <span>{R.genre}</span>
            <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
              {GENRES.map((g) => (
                <option key={g} value={g}>{R.genres[g] ?? g}</option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>{R.topic}</span>
            <input className="input" placeholder={R.topicPlaceholder} value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label className="field">
            <span>{R.length}</span>
            <select className="input" value={length} onChange={(e) => setLength(e.target.value as typeof length)}>
              <option value="short">{R.lengths.short}</option>
              <option value="medium">{R.lengths.medium}</option>
              <option value="long">{R.lengths.long}</option>
            </select>
          </label>
          <button className="btn btn-primary align-end" onClick={() => generate()} disabled={busy}>
            {R.write}
          </button>
        </div>
        <details>
          <summary>{R.ownText}</summary>
          <textarea className="input" rows={4} placeholder="粘贴中文文本…" value={pasted} onChange={(e) => setPasted(e.target.value)} />
          <button className="btn" onClick={() => generate(pasted)} disabled={busy || !pasted.trim()}>
            {R.studyThis}
          </button>
        </details>
      </section>

      {busy && <Spinner label={R.writing} />}

      {story && !busy && (
        <>
          <article className="card story">
            <div className="row between wrap">
              <h2>
                <Zh text={story.title} />
              </h2>
              <div className="row gap">
                {playing === null ? (
                  <button className="btn" onClick={playAll}>
                    {R.listen}
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={() => {
                      readerStopped = true;
                      stopPlayback();
                    }}
                  >
                    {R.stop}
                  </button>
                )}
                <button className="btn" onClick={() => settingsStore.set((s) => ({ ...s, showPinyin: !s.showPinyin }))}>
                  {settings.showPinyin ? R.hidePinyin : R.showPinyin}
                </button>
              </div>
            </div>
            {story.paragraphs.map((p, i) => (
              <div key={i} className={`paragraph ${playing === i ? 'playing' : ''}`}>
                <p className="story-text">
                  <Zh text={p} onWord={openWord} size="lg" />
                </p>
                <div className="bubble-tools">
                  <SpeakButton text={p} />
                  <button className="btn-link" onClick={() => setShowEn((s) => ({ ...s, [i]: !s[i] }))}>
                    {showEn[i] ? R.hideTranslation : T.common.translate}
                  </button>
                </div>
                {showEn[i] && <p className="translation">{story.translations?.[i]}</p>}
              </div>
            ))}
          </article>

          {story.vocab?.length > 0 && (
            <section className="card">
              <div className="row between wrap">
                <h3>{R.keyVocab}</h3>
                <button className="btn btn-sm" onClick={() => addCards(story.vocab, 'Reader')}>
                  {T.common.addAllCards}
                </button>
              </div>
              <div className="vocab-grid">
                {story.vocab.map((v) => (
                  <div key={v.hanzi} className="vocab-item">
                    <span className="vocab-hanzi" lang="zh-CN">
                      {v.hanzi}
                    </span>
                    <Pinyin hanzi={v.hanzi} />
                    <span className="muted small">{v.meaning}</span>
                    <AddCardButton word={v} deck="Reader" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {story.questions?.length > 0 && (
            <section className="card">
              <h3>
                {R.comprehension} {Object.keys(answers).length === story.questions.length && `· ${correctCount}/${story.questions.length}`}
              </h3>
              {story.questions.map((q, qi) => (
                <div key={qi} className="question">
                  <p>
                    <b>{qi + 1}.</b> <span lang="zh-CN">{q.q}</span>
                  </p>
                  <div className="options">
                    {q.options.map((o, oi) => {
                      const chosen = answers[qi];
                      const cls = chosen === undefined ? '' : oi === q.answer ? 'correct' : oi === chosen ? 'wrong' : 'dim';
                      return (
                        <button key={oi} className={`option ${cls}`} onClick={() => answer(qi, oi)} lang="zh-CN">
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {answers[qi] !== undefined && <p className="muted small">{q.explanation}</p>}
                </div>
              ))}
            </section>
          )}
        </>
      )}
      {popup}
    </div>
  );
}

let readerStopped = false;
