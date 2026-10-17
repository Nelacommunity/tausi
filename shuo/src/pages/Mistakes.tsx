import { useState } from 'react';
import { ErrorBox, PageHeader, SpeakButton, Spinner, Zh } from '../components/ui';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { award, mistakesStore, settingsStore } from '../lib/state';

interface Analysis {
  patterns: { title: string; explanation: string; examples: string[] }[];
  plan: string[];
}
interface QuizItem {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

const SOURCE_ICON: Record<string, string> = { voice: '🎙️', chat: '💬', lesson: '📚', pronunciation: '🎵', reader: '📖' };

export default function Mistakes() {
  const mistakes = mistakesStore.use();
  const settings = settingsStore.use();
  const [filter, setFilter] = useState<'open' | 'mastered' | 'all'>('open');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [quiz, setQuiz] = useState<QuizItem[] | null>(null);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = mistakes.filter((m) => !m.mastered);
  const list = mistakes.filter((m) => (filter === 'all' ? true : filter === 'open' ? !m.mastered : m.mastered));
  const sample = open
    .slice(0, 25)
    .map((m) => `- said: "${m.said}" → correct: "${m.correct}" (${m.explanation})`)
    .join('\n');

  async function analyze() {
    setBusy('analyze');
    setError(null);
    try {
      setAnalysis(
        await generateJSON<Analysis>(
          `These are a Mandarin learner's recent mistakes. ${learnerProfile()}
${sample}
Find the 2–4 underlying patterns (e.g. word order of time phrases, misuse of 了, measure words, tones), explain each clearly in ${settings.nativeLanguage}, and give a short study plan.
JSON: {"patterns":[{"title":"","explanation":"","examples":["correct Chinese example"]}],"plan":["concrete step"]}`,
        ),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  async function makeQuiz() {
    setBusy('quiz');
    setError(null);
    setPicks({});
    try {
      const r = await generateJSON<{ items: QuizItem[] }>(
        `Create a 6-question multiple-choice quiz that drills exactly the grammar/vocabulary behind these learner mistakes (use NEW sentences, not the same ones). ${learnerProfile()}
${sample}
Each question: a Chinese sentence with a gap or a "which is correct?" choice. JSON: {"items":[{"prompt":"","options":["4 options"],"answer":0,"explanation":"${settings.nativeLanguage}"}]}`,
      );
      setQuiz(r.items);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  function pick(qi: number, oi: number) {
    if (picks[qi] !== undefined || !quiz) return;
    const next = { ...picks, [qi]: oi };
    setPicks(next);
    if (Object.keys(next).length === quiz.length) award(5 + quiz.filter((q, i) => next[i] === q.answer).length * 2, 'drills');
  }

  const toggle = (id: string) => mistakesStore.set((all) => all.map((m) => (m.id === id ? { ...m, mastered: !m.mastered } : m)));

  return (
    <div>
      <PageHeader
        title="Mistake Notebook"
        zh="错题本"
        subtitle="Every correction from your conversations, lessons and pronunciation drills — collected so you can fix them for good."
        actions={
          <>
            <button className="btn" onClick={analyze} disabled={!open.length || !!busy}>
              🔍 Find my patterns
            </button>
            <button className="btn btn-primary" onClick={makeQuiz} disabled={!open.length || !!busy}>
              🎯 Quiz my weak spots
            </button>
          </>
        }
      />
      <ErrorBox error={error} />
      {busy && <Spinner label={busy === 'quiz' ? 'Building your personal quiz…' : 'Analyzing your mistakes…'} />}

      {analysis && (
        <section className="card">
          <h3>Your patterns</h3>
          {analysis.patterns.map((p, i) => (
            <div key={i} className="pattern-card">
              <strong>{p.title}</strong>
              <p>{p.explanation}</p>
              {p.examples?.map((ex, j) => (
                <div key={j} className="example-row">
                  <Zh text={ex} /> <SpeakButton text={ex} />
                </div>
              ))}
            </div>
          ))}
          <h4>Study plan</h4>
          <ol>
            {analysis.plan.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      {quiz && (
        <section className="card">
          <h3>
            Weak-spot quiz {Object.keys(picks).length === quiz.length && `· ${quiz.filter((q, i) => picks[i] === q.answer).length}/${quiz.length}`}
          </h3>
          {quiz.map((q, qi) => (
            <div key={qi} className="question">
              <p lang="zh-CN">
                <b>{qi + 1}.</b> {q.prompt}
              </p>
              <div className="options">
                {q.options.map((o, oi) => {
                  const c = picks[qi];
                  const cls = c === undefined ? '' : oi === q.answer ? 'correct' : oi === c ? 'wrong' : 'dim';
                  return (
                    <button key={oi} className={`option ${cls}`} onClick={() => pick(qi, oi)} lang="zh-CN">
                      {o}
                    </button>
                  );
                })}
              </div>
              {picks[qi] !== undefined && <p className="muted small">{q.explanation}</p>}
            </div>
          ))}
        </section>
      )}

      <div className="segmented">
        {(['open', 'mastered', 'all'] as const).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'open' ? `To fix (${open.length})` : f === 'mastered' ? `Mastered (${mistakes.length - open.length})` : 'All'}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="card empty">
          <p className="muted">{filter === 'open' ? 'No open mistakes. Go make some — that\'s how you learn! 😄' : 'Nothing here yet.'}</p>
        </section>
      ) : (
        <div className="mistake-list">
          {list.map((m) => (
            <div key={m.id} className={`card mistake ${m.mastered ? 'mastered' : ''}`}>
              <div className="row between">
                <span className="muted small">
                  {SOURCE_ICON[m.source]} {m.source} · {new Date(m.created).toLocaleDateString()}
                </span>
                <div className="row gap">
                  <button className="btn btn-sm" onClick={() => toggle(m.id)}>
                    {m.mastered ? 'Reopen' : '✓ Mastered'}
                  </button>
                  <button className="btn-icon" title="Delete" onClick={() => mistakesStore.set((all) => all.filter((x) => x.id !== m.id))}>
                    🗑
                  </button>
                </div>
              </div>
              <div className="said" lang="zh-CN">
                ✗ {m.said}
              </div>
              <div className="fixed">
                ✓ <Zh text={m.correct} /> <SpeakButton text={m.correct} />
              </div>
              {m.explanation && <p className="muted small">{m.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
