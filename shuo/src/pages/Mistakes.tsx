import { useState } from 'react';
import { ErrorBox, PageHeader, SpeakButton, Spinner, Zh } from '../components/ui';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { award, mistakesStore, explainIn } from '../lib/state';
import { logActivity } from '../lib/history';
import { locale, useT } from '../lib/i18n';

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
  const T = useT();
  const M = T.mistakes;
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
Find the 2–4 underlying patterns (e.g. word order of time phrases, misuse of 了, measure words, tones), explain each clearly in ${explainIn()}, and give a short study plan.
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
Each question: a Chinese sentence with a gap or a "which is correct?" choice. JSON: {"items":[{"prompt":"","options":["4 options"],"answer":0,"explanation":"${explainIn()}"}]}`,
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
    if (Object.keys(next).length === quiz.length) {
      const correct = quiz.filter((q, i) => next[i] === q.answer).length;
      award(5 + correct * 2, 'drills');
      logActivity('mistakes', M.quizTitle, { score: (correct / Math.max(1, quiz.length)) * 100, xp: 5 + correct * 2, details: { correct, total: quiz.length } });
    }
  }

  const toggle = (id: string) => mistakesStore.set((all) => all.map((m) => (m.id === id ? { ...m, mastered: !m.mastered } : m)));

  return (
    <div>
      <PageHeader
        title={M.title}
        zh="错题本"
        subtitle={M.subtitle}
        actions={
          <>
            <button className="btn" onClick={analyze} disabled={!open.length || !!busy}>
              {M.patterns}
            </button>
            <button className="btn btn-primary" onClick={makeQuiz} disabled={!open.length || !!busy}>
              {M.quiz}
            </button>
          </>
        }
      />
      <ErrorBox error={error} />
      {busy && <Spinner label={busy === 'quiz' ? M.building : M.analyzing} />}

      {analysis && (
        <section className="card">
          <h3>{M.yourPatterns}</h3>
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
          <h4>{M.plan}</h4>
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
            {M.quizTitle} {Object.keys(picks).length === quiz.length && `· ${quiz.filter((q, i) => picks[i] === q.answer).length}/${quiz.length}`}
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
            {f === 'open' ? M.toFix(open.length) : f === 'mastered' ? M.mastered(mistakes.length - open.length) : T.common.all}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <section className="card empty">
          <p className="muted">{filter === 'open' ? M.noneOpen : M.nothing}</p>
        </section>
      ) : (
        <div className="mistake-list">
          {list.map((m) => (
            <div key={m.id} className={`card mistake ${m.mastered ? 'mastered' : ''}`}>
              <div className="row between">
                <span className="muted small">
                  {SOURCE_ICON[m.source]} {M.sources[m.source] ?? m.source} · {new Date(m.created).toLocaleDateString(locale())}
                </span>
                <div className="row gap">
                  <button className="btn btn-sm" onClick={() => toggle(m.id)}>
                    {m.mastered ? M.reopen : M.markMastered}
                  </button>
                  <button className="btn-icon" title={T.common.delete} onClick={() => mistakesStore.set((all) => all.filter((x) => x.id !== m.id))}>
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
