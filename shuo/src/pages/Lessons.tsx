import { ShareResult } from '../components/ShareResult';
import { useEffect, useMemo, useState } from 'react';
import { AddCardButton, ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh, useWordPopup } from '../components/ui';
import { CURRICULUM, type Unit } from '../data/curriculum';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { speak } from '../lib/speech';
import { addCards } from '../lib/srs';
import { addMistakes, award, navigate, progressStore, setHandoff, settingsStore, explainIn } from '../lib/state';
import { persisted, uid } from '../lib/store';
import { logActivity } from '../lib/history';
import { getLang, tr, useLang, useT } from '../lib/i18n';
import { unitText } from '../locales/content';

type Exercise =
  | { type: 'mc'; prompt: string; options: string[]; answer: number; explanation?: string }
  | { type: 'fill'; sentence: string; translation?: string; options: string[]; answer: number; explanation?: string }
  | { type: 'order'; answer: string; translation?: string; words: string[] }
  | { type: 'listen'; zh: string; options: string[]; answer: number }
  | { type: 'translate'; prompt: string; answer: string };

interface Lesson {
  intro: string;
  vocab: { hanzi: string; pinyin: string; meaning: string; example?: string; exampleEn?: string }[];
  grammar: { point: string; pattern: string; explanation: string; examples: { zh: string; en: string }[] };
  dialogue: { speaker: string; zh: string; en: string }[];
  culture?: string;
  exercises: Exercise[];
}

const lessonCache = persisted<Record<string, Lesson>>('lessonCache', {});
const customUnits = persisted<Unit[]>('customUnits', [], { sync: true });

function lessonPrompt(unit: Unit) {
  const L = explainIn();
  return `Create a complete, high-quality Mandarin lesson for HSK ${unit.level}.
Unit: "${unit.title}". Topic: ${unit.topic}. Grammar focus: ${unit.grammar}. Can-do goal: ${unit.canDo}.
${learnerProfile()}
Use simplified Chinese. Keep vocabulary appropriate for HSK ${unit.level}.

Return JSON:
{
  "intro": "2 sentences in ${L}: what the student will be able to do and why it's useful",
  "vocab": [{"hanzi":"","pinyin":"tone marks","meaning":"${L}","example":"short Chinese example","exampleEn":"${L}"}],
  "grammar": {"point":"name of grammar point","pattern":"structure, e.g. Subject + 是 + Noun","explanation":"clear ${L} explanation including a common learner mistake","examples":[{"zh":"","en":""}]},
  "dialogue": [{"speaker":"Chinese name","zh":"","en":""}],
  "culture": "one short, interesting cultural note related to the topic (${L})",
  "exercises": [...]
}
vocab: 8–12 items. grammar.examples: 4. dialogue: 6–10 natural lines using the vocab and grammar.
exercises: exactly 10, mixing ALL of these types, easy → harder:
{"type":"mc","prompt":"${L} question about meaning or usage","options":["4 options"],"answer":0,"explanation":""}
{"type":"fill","sentence":"Chinese sentence with ___ marking the gap","translation":"${L}","options":["4 Chinese options"],"answer":0,"explanation":""}
{"type":"order","answer":"a correct Chinese sentence","translation":"${L}","words":["the answer split into 4–7 chunks, in correct order"]}
{"type":"listen","zh":"a short Chinese sentence","options":["4 ${L} meanings"],"answer":0}
{"type":"translate","prompt":"a ${L} sentence to translate","answer":"reference Chinese translation"}
"answer" for mc/fill/listen is the index of the correct option; vary the correct index.`;
}

export default function Lessons() {
  const settings = settingsStore.use();
  const progress = progressStore.use();
  const customs = customUnits.use();
  const [open, setOpen] = useState<Unit | null>(null);
  const [level, setLevel] = useState(settings.level);
  const [customTopic, setCustomTopic] = useState('');
  const T = useT();
  const lang = useLang();
  const L = T.lessons;

  if (open) return <LessonView unit={open} onBack={() => setOpen(null)} />;

  const units = CURRICULUM.filter((u) => u.level === level);
  const nextUnit = CURRICULUM.find((u) => u.level >= settings.level && !progress.lessons[u.id]);

  function createCustom() {
    if (!customTopic.trim()) return;
    const unit: Unit = {
      id: `custom-${uid()}`,
      level: settings.level,
      title: customTopic.trim(),
      topic: customTopic.trim(),
      grammar: 'the most useful grammar point for this topic at this level',
      canDo: `Handle "${customTopic.trim()}" confidently in Chinese`,
    };
    customUnits.set((all) => [unit, ...all]);
    setCustomTopic('');
    setOpen(unit);
  }

  return (
    <div>
      <PageHeader title={L.title} zh="课程" subtitle={L.subtitle} />

      {nextUnit && (
        <section className="card continue-card">
          <div>
            <small className="muted">{L.upNext(nextUnit.level)}</small>
            <h2>{unitText(nextUnit, lang).title}</h2>
            <p className="muted">
              {unitText(nextUnit, lang).canDo} · <span lang="zh-CN">{nextUnit.grammar}</span>
            </p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setOpen(nextUnit)}>
            {L.start}
          </button>
        </section>
      )}

      <section className="card">
        <h3>{L.makeAny}</h3>
        <div className="row gap">
          <input
            className="input grow"
            placeholder={L.customPlaceholder}
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createCustom()}
          />
          <button className="btn btn-primary" onClick={createCustom}>
            {L.create}
          </button>
        </div>
        {customs.length > 0 && (
          <div className="chips">
            {customs.slice(0, 12).map((u) => (
              <button key={u.id} className="chip" onClick={() => setOpen(u)}>
                {progress.lessons[u.id] ? '✓ ' : ''}
                {u.title}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="segmented level-tabs">
        {[1, 2, 3, 4, 5, 6].map((l) => {
          const all = CURRICULUM.filter((u) => u.level === l);
          const done = all.filter((u) => progress.lessons[u.id]).length;
          return (
            <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>
              HSK {l} <small>{done}/{all.length}</small>
            </button>
          );
        })}
      </div>

      <div className="unit-path">
        {units.map((u, i) => {
          const rec = progress.lessons[u.id];
          return (
            <button key={u.id} className={`unit ${rec ? 'done' : ''}`} onClick={() => setOpen(u)}>
              <span className="unit-num">{rec ? '✓' : i + 1}</span>
              <span className="unit-body">
                <strong>{unitText(u, lang).title}</strong>
                <small className="muted">
                  {unitText(u, lang).topic} · <span lang="zh-CN">{u.grammar}</span>
                </small>
              </span>
              {rec && <span className="tag">{rec.score}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonView({ unit, onBack }: { unit: Unit; onBack: () => void }) {
  const cache = lessonCache.use();
  const [lesson, setLesson] = useState<Lesson | null>(cache[unit.id] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'learn' | 'practice' | 'done'>('learn');
  const [score, setScore] = useState(0);
  const [attempt, setAttempt] = useState<{ id: string; correct: number; total: number } | null>(null);
  const { open: openWord, popup } = useWordPopup();
  const T = useT();
  const L = T.lessons;
  const ut = unitText(unit, useLang());

  async function load(force = false) {
    if (lesson && !force) return;
    setBusy(true);
    setError(null);
    try {
      const l = await generateJSON<Lesson>(lessonPrompt(unit), { temperature: 0.8 });
      l.exercises = (l.exercises ?? []).filter((e) => e && e.type);
      lessonCache.set((c) => ({ ...c, [unit.id]: l }));
      setLesson(l);
      setPhase('learn');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(correct: number, total: number) {
    const pct = Math.round((correct / Math.max(1, total)) * 100);
    setScore(pct);
    setAttempt({ id: uid(), correct, total });
    setPhase('done');
    progressStore.set((p) => ({ ...p, lessons: { ...p.lessons, [unit.id]: { score: Math.max(pct, p.lessons[unit.id]?.score ?? 0), completedAt: Date.now() } } }));
    award(20 + Math.round(pct / 5), 'lessons');
    logActivity('lesson', `${unitText(unit, getLang()).title} · HSK ${unit.level}`, { score: pct, xp: 20 + Math.round(pct / 5), details: { unitId: unit.id, correct, total } });
  }

  function practiceSpeaking() {
    if (!lesson) return;
    setHandoff({
      scenarioTitle: `Lesson: ${unit.title}`,
      scenarioPrompt: `Speaking practice for the lesson "${unit.title}" (topic: ${unit.topic}; grammar: ${lesson.grammar.point} — ${lesson.grammar.pattern}).
Target vocabulary: ${lesson.vocab.map((v) => v.hanzi).join('、')}.
First role-play a situation like this dialogue: ${lesson.dialogue.map((d) => d.zh).join(' ')}
Then have a freer conversation on the topic. Make the student actively use the target vocabulary and grammar pattern, and correct them when they misuse it.`,
    });
    navigate('voice');
  }

  return (
    <div>
      <button className="btn-link back" onClick={onBack}>
        {L.allLessons}
      </button>
      <PageHeader
        title={ut.title}
        zh={`HSK ${unit.level}`}
        subtitle={ut.canDo}
        actions={
          lesson && (
            <button className="btn btn-sm" onClick={() => load(true)} disabled={busy}>
              {L.regenerate}
            </button>
          )
        }
      />
      <ErrorBox error={error} onRetry={() => load(true)} />
      {busy && <Spinner label={L.preparing} />}

      {lesson && !busy && phase === 'learn' && (
        <>
          <section className="card">
            <p>{lesson.intro}</p>
          </section>

          <section className="card">
            <div className="row between wrap">
              <h3>{T.common.vocabulary}</h3>
              <button className="btn btn-sm" onClick={() => addCards(lesson.vocab, unit.title)}>
                {L.addAll}
              </button>
            </div>
            <div className="vocab-list">
              {lesson.vocab.map((v) => (
                <div key={v.hanzi} className="vocab-row">
                  <span className="vocab-hanzi" lang="zh-CN">
                    {v.hanzi}
                  </span>
                  <div className="grow">
                    <Pinyin hanzi={v.hanzi} /> <span className="muted">· {v.meaning}</span>
                    {v.example && (
                      <div className="small">
                        <Zh text={v.example} pinyin={false} onWord={openWord} /> <span className="muted">{v.exampleEn}</span>
                      </div>
                    )}
                  </div>
                  <SpeakButton text={v.hanzi} />
                  <AddCardButton word={v} deck={unit.title} />
                </div>
              ))}
            </div>
          </section>

          <section className="card grammar">
            <h3>{L.grammar(lesson.grammar.point)}</h3>
            <div className="pattern" lang="zh-CN">
              {lesson.grammar.pattern}
            </div>
            <p>{lesson.grammar.explanation}</p>
            {lesson.grammar.examples?.map((ex, i) => (
              <div key={i} className="example-row">
                <Zh text={ex.zh} onWord={openWord} />
                <SpeakButton text={ex.zh} />
                <span className="muted small">{ex.en}</span>
              </div>
            ))}
          </section>

          <section className="card">
            <div className="row between wrap">
              <h3>{L.dialogue}</h3>
              <PlayDialogue lines={lesson.dialogue} />
            </div>
            {lesson.dialogue.map((d, i) => (
              <div key={i} className={`dialogue-line ${i % 2 ? 'right' : ''}`}>
                <span className="speaker" lang="zh-CN">
                  {d.speaker}
                </span>
                <div>
                  <Zh text={d.zh} onWord={openWord} />
                  <SpeakButton text={d.zh} />
                  <div className="muted small">{d.en}</div>
                </div>
              </div>
            ))}
          </section>

          {lesson.culture && (
            <section className="card culture">
              <h3>{L.culture}</h3>
              <p>{lesson.culture}</p>
            </section>
          )}

          <div className="row center">
            <button className="btn btn-primary btn-lg" onClick={() => setPhase('practice')} disabled={!lesson.exercises.length}>
              {L.startPractice(lesson.exercises.length)}
            </button>
          </div>
        </>
      )}

      {lesson && !busy && phase === 'practice' && <Practice exercises={lesson.exercises} onFinish={finish} onBack={() => setPhase('learn')} />}

      {lesson && phase === 'done' && (
        <section className="card empty">
          <div className="big-emoji">{score >= 80 ? '🏆' : score >= 50 ? '👏' : '💪'}</div>
          <h2>{L.complete(score)}</h2>
          <p className="muted">{score >= 80 ? L.excellent : L.goodEffort}</p>
          {attempt && (
            <ShareResult
              key={attempt.id}
              result={{
                kind: 'lesson',
                title: `${unit.title} · HSK ${unit.level}`,
                score,
                details: { unitId: unit.id, level: unit.level, topic: unit.topic, grammar: unit.grammar, correct: attempt.correct, total: attempt.total },
              }}
            />
          )}
          <div className="row gap center wrap">
            <button className="btn btn-primary" onClick={practiceSpeaking}>
              {L.speakIt}
            </button>
            <button className="btn" onClick={() => setPhase('learn')}>
              {L.review}
            </button>
            <button className="btn" onClick={() => setPhase('practice')}>
              {L.retry}
            </button>
            <button className="btn" onClick={onBack}>
              {L.backToPath}
            </button>
          </div>
        </section>
      )}
      {popup}
    </div>
  );
}

function PlayDialogue({ lines }: { lines: { zh: string }[] }) {
  useLang();
  const [playing, setPlaying] = useState(false);
  return (
    <button
      className="btn btn-sm"
      disabled={playing}
      onClick={async () => {
        setPlaying(true);
        for (const l of lines) await speak(l.zh);
        setPlaying(false);
      }}
    >
      {playing ? <span className="spinner sm" /> : '▶️'} {tr().lessons.playDialogue}
    </button>
  );
}

const norm = (s: string) => s.replace(/[\s，。！？、,.!?；;：:“”"'‘’（）()]/g, '');

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Practice({ exercises, onFinish, onBack }: { exercises: Exercise[]; onFinish: (correct: number, total: number) => void; onBack: () => void }) {
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string; answer?: string } | null>(null);
  const ex = exercises[i];
  const L = useT().lessons;

  function submit(ok: boolean, message: string, answer?: string) {
    setResult({ ok, message, answer });
    if (ok) setCorrect((c) => c + 1);
  }

  function next() {
    setResult(null);
    if (i + 1 >= exercises.length) onFinish(correct, exercises.length);
    else setI(i + 1);
  }

  return (
    <section className="card practice">
      <div className="row between">
        <button className="btn-link" onClick={onBack}>
          {L.lesson}
        </button>
        <span className="muted small">
          {i + 1} / {exercises.length}
        </span>
      </div>
      <div className="progress-bar">
        <div style={{ width: `${(i / exercises.length) * 100}%` }} />
      </div>

      <ExerciseView key={i} ex={ex} locked={!!result} onSubmit={submit} />

      {result && (
        <div className={`result-bar ${result.ok ? 'ok' : 'bad'}`}>
          <div>
            <strong>{result.ok ? L.correct : L.notQuite}</strong>
            {result.answer && (
              <div>
                {L.answer} <span lang="zh-CN">{result.answer}</span>
              </div>
            )}
            {result.message && <div className="small">{result.message}</div>}
          </div>
          <button className="btn btn-primary" onClick={next} autoFocus>
            {i + 1 >= exercises.length ? L.finish : L.continue}
          </button>
        </div>
      )}
    </section>
  );
}

function ExerciseView({ ex, locked, onSubmit }: { ex: Exercise; locked: boolean; onSubmit: (ok: boolean, message: string, answer?: string) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [grading, setGrading] = useState(false);
  const chunks = useMemo(() => (ex.type === 'order' ? shuffle(ex.words.map((w, idx) => ({ w, idx }))) : []), [ex]);
  const [built, setBuilt] = useState<number[]>([]);
  const T = useT();
  const L = T.lessons;

  useEffect(() => {
    if (ex.type === 'listen') void speak(ex.zh);
  }, [ex]);

  const choose = (options: string[], answer: number, explanation?: string) => (idx: number) => {
    if (locked) return;
    setPicked(idx);
    onSubmit(idx === answer, explanation ?? '', idx === answer ? undefined : options[answer]);
  };

  const optionClass = (idx: number, answer: number) => (picked === null ? '' : idx === answer ? 'correct' : idx === picked ? 'wrong' : 'dim');

  if (ex.type === 'mc' || ex.type === 'fill' || ex.type === 'listen') {
    const onPick = choose(ex.options, ex.answer, 'explanation' in ex ? ex.explanation : undefined);
    return (
      <div className="exercise">
        {ex.type === 'mc' && <h3>{ex.prompt}</h3>}
        {ex.type === 'fill' && (
          <>
            <small className="muted">{L.fillBlank}</small>
            <h3 className="zh-lg" lang="zh-CN">
              {ex.sentence.replace(/_{2,}|（\s*）|\(\s*\)/, '＿＿')}
            </h3>
            {ex.translation && <p className="muted">{ex.translation}</p>}
          </>
        )}
        {ex.type === 'listen' && (
          <>
            <small className="muted">{L.listenChoose}</small>
            <div className="row gap">
              <SpeakButton text={ex.zh} label={T.common.listen} className="btn btn-lg" />
              <SpeakButton text={ex.zh} slow label={T.common.slow} className="btn btn-lg" />
            </div>
            {locked && <Zh text={ex.zh} />}
          </>
        )}
        <div className="options">
          {ex.options.map((o, idx) => (
            <button key={idx} className={`option ${optionClass(idx, ex.answer)}`} onClick={() => onPick(idx)} lang="zh-CN">
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (ex.type === 'order') {
    const sentence = built.map((b) => chunks[b].w).join('');
    return (
      <div className="exercise">
        <small className="muted">{L.order}</small>
        <h3>{ex.translation}</h3>
        <div className="built-line" lang="zh-CN">
          {built.map((b, k) => (
            <button key={k} className="word-chip" onClick={() => !locked && setBuilt(built.filter((_, j) => j !== k))}>
              {chunks[b].w}
            </button>
          ))}
          {!built.length && <span className="muted">{L.tapWords}</span>}
        </div>
        <div className="word-bank" lang="zh-CN">
          {chunks.map((c, k) => (
            <button key={k} className="word-chip" disabled={built.includes(k) || locked} onClick={() => setBuilt([...built, k])}>
              {c.w}
            </button>
          ))}
        </div>
        {!locked && (
          <button className="btn btn-primary" disabled={built.length !== chunks.length} onClick={() => {
            const ok = norm(sentence) === norm(ex.answer);
            onSubmit(ok, '', ok ? undefined : ex.answer);
          }}>
            {T.common.check}
          </button>
        )}
      </div>
    );
  }

  // translate
  async function grade() {
    if (ex.type !== 'translate' || !text.trim()) return;
    if (norm(text) === norm(ex.answer)) return onSubmit(true, L.perfect);
    setGrading(true);
    try {
      const r = await generateJSON<{ correct: boolean; feedback: string; corrected: string }>(
        `A Mandarin learner translated "${ex.prompt}" as: "${text}". Reference answer: "${ex.answer}".
Is the learner's translation grammatically correct and does it convey the meaning (other valid phrasings are fine; ignore punctuation; pinyin input counts as correct only if accurate with tones)?
JSON: {"correct": true/false, "feedback": "one short ${explainIn()} sentence of feedback", "corrected": "the learner's sentence minimally corrected (or unchanged if correct)"}`,
        { temperature: 0.1 },
      );
      if (!r.correct) addMistakes([{ source: 'lesson', said: text, correct: r.corrected || ex.answer, explanation: r.feedback }]);
      onSubmit(r.correct, r.feedback, r.correct ? undefined : `${r.corrected || ex.answer}  (ref: ${ex.answer})`);
    } catch (e) {
      onSubmit(false, errorText(e), ex.answer);
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="exercise">
      <small className="muted">{L.translateZh}</small>
      <h3>{ex.type === 'translate' && ex.prompt}</h3>
      <textarea className="input zh-input" rows={2} value={text} disabled={locked} placeholder="用中文写…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          void grade();
        }
      }} />
      {!locked && (
        <button className="btn btn-primary" onClick={grade} disabled={grading || !text.trim()}>
          {grading ? <span className="spinner sm" /> : null} {T.common.check}
        </button>
      )}
    </div>
  );
}
