import { ShareResult } from '../components/ShareResult';
import { useEffect, useRef, useState } from 'react';
import { AddCardButton, ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh, useWordPopup } from '../components/ui';
import { SCENARIOS, TUTOR_MODES, type TutorMode } from '../data/scenarios';
import { levelOf } from '../lib/audio';
import { errorText, generateJSON, generateText } from '../lib/gemini';
import { LiveSession, type LiveStatus } from '../lib/live';
import { reportPrompt, tutorSystemPrompt } from '../lib/prompts';
import { addCards } from '../lib/srs';
import { VOICES, addMistakes, award, sessionsStore, settingsStore, takeHandoff, MODELS, explainIn } from '../lib/state';
import { uid } from '../lib/store';
import { logActivity } from '../lib/history';
import { useLang, useT } from '../lib/i18n';
import { scenarioSub, scenarioTitle as scTitle } from '../locales/content';

interface Entry {
  id: string;
  role: 'user' | 'model';
  text: string;
  final: boolean;
  translation?: string;
}

interface Report {
  /** Set when the report is created — one share per report. */
  id?: string;
  scenarioTitle?: string;
  seconds?: number;
  summary: string;
  scores: { overall: number; fluency: number; accuracy: number; vocabulary: number; pronunciation: number };
  estimatedLevel: string;
  strengths: string[];
  mistakes: { said: string; correct: string; pinyin: string; explanation: string }[];
  betterExpressions: { basic: string; native: string; pinyin: string; meaning: string }[];
  vocabulary: { hanzi: string; pinyin: string; meaning: string }[];
  nextSteps: string[];
}

interface Suggestion {
  zh: string;
  pinyin: string;
  en: string;
}

export default function VoiceTutor() {
  const settings = settingsStore.use();
  const [handoff] = useState(takeHandoff);
  const [scenarioId, setScenarioId] = useState(handoff ? 'custom' : 'free');
  const [custom, setCustom] = useState(handoff?.scenarioPrompt ?? '');
  const [mode, setMode] = useState<TutorMode>('guided');
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [typed, setTyped] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [hinting, setHinting] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [reporting, setReporting] = useState(false);
  const [modelSpeaking, setModelSpeaking] = useState(false);

  const session = useRef<LiveSession | null>(null);
  const orb = useRef<HTMLDivElement>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const { open: openWord, popup } = useWordPopup();
  const T = useT();
  const lang = useLang();
  const V = T.voice;

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  const scenarioTitle = (scenario && scTitle(scenario, lang)) ?? handoff?.scenarioTitle ?? V.customScenario;
  const live = status === 'live' || status === 'connecting';

  // Timer
  useEffect(() => {
    if (status !== 'live') return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Orb animation from audio levels
  useEffect(() => {
    if (status !== 'live') return;
    let raf = 0;
    const tick = () => {
      const s = session.current;
      if (s && orb.current) {
        const model = levelOf(s.player.analyser);
        const mic = s.micAnalyser ? levelOf(s.micAnalyser) : 0;
        orb.current.style.setProperty('--model', model.toFixed(3));
        orb.current.style.setProperty('--mic', (muted ? 0 : mic).toFixed(3));
        setModelSpeaking(s.player.playing);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, muted]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [entries]);

  useEffect(() => () => session.current?.close(), []);

  // Award speaking XP whenever a live call ends (user hang-up or server disconnect).
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'live' && status !== 'live' && seconds > 10) {
      award(Math.max(3, Math.round((seconds / 60) * 3)), 'voiceSeconds', seconds);
      logActivity('voice', `Voice · ${scenarioTitle}`, { xp: Math.max(3, Math.round((seconds / 60) * 3)), details: { seconds, scenario: scenarioTitle } });
    }
    prevStatus.current = status;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const appendTranscript = (role: 'user' | 'model', chunk: string) =>
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && !last.final) {
        return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
      }
      const closed = prev.map((e) => (e.final ? e : { ...e, final: true }));
      return [...closed, { id: uid(), role, text: chunk.trimStart(), final: false }];
    });

  async function start() {
    setError(null);
    setDetail(null);
    setReport(null);
    setEntries([]);
    setSuggestions(null);
    setSeconds(0);
    const scenarioText = scenarioId === 'custom' ? custom || 'Free conversation' : `${scenario!.title}. ${scenario!.prompt}`;
    const s = new LiveSession(
      {
        model: MODELS.live,
        voice: settings.tutorVoice,
        systemPrompt: tutorSystemPrompt({ scenario: scenarioText, mode }),
        kickoff: 'The call has just connected. Greet the student warmly in Chinese and start the session.',
      },
      {
        onStatus: (st, d) => {
          setStatus(st);
          if (d) setDetail(d);
        },
        onTranscript: appendTranscript,
        onTurnComplete: () => setEntries((prev) => prev.map((e) => ({ ...e, final: true }))),
        onInterrupted: () => setEntries((prev) => prev.map((e) => ({ ...e, final: true }))),
      },
    );
    session.current = s;
    try {
      await s.connect();
    } catch (e) {
      s.close();
      session.current = null;
      setStatus('error');
      setError(errorText(e));
    }
  }

  function stop() {
    session.current?.close();
    session.current = null;
    setStatus('closed');
    setMuted(false);
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    session.current?.setMuted(m);
  }

  function sendTyped() {
    const text = typed.trim();
    if (!text || !session.current) return;
    session.current.sendText(text);
    setEntries((prev) => [...prev.map((e) => ({ ...e, final: true })), { id: uid(), role: 'user', text, final: true }]);
    setTyped('');
  }

  const transcriptText = () => entries.map((e) => `${e.role === 'model' ? 'Tutor' : 'Student'}: ${e.text}`).join('\n');

  async function hint() {
    setHinting(true);
    setSuggestions(null);
    try {
      const r = await generateJSON<{ suggestions: Suggestion[] }>(
        `A HSK ${settings.level} student is in a spoken Chinese conversation (${scenarioTitle}). Conversation so far:
${transcriptText() || '(just started)'}

Suggest 3 natural things the STUDENT could say next, at their level (one simple, one medium, one slightly challenging).
Return JSON: {"suggestions": [{"zh": "Chinese", "pinyin": "tone-marked pinyin", "en": "${explainIn()} meaning"}]}`,
      );
      setSuggestions(r.suggestions);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setHinting(false);
    }
  }

  async function translate(entry: Entry) {
    try {
      const t = await generateText(`Translate this Chinese into natural ${explainIn()}. Reply with the translation only:\n${entry.text}`, {
        temperature: 0.2,
      });
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, translation: t.trim() } : e)));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function makeReport() {
    setReporting(true);
    setError(null);
    try {
      const r = await generateJSON<Report>(reportPrompt(transcriptText(), scenarioTitle), { temperature: 0.4 });
      setReport({ ...r, id: uid(), scenarioTitle, seconds });
      addMistakes((r.mistakes ?? []).map((m) => ({ ...m, source: 'voice' as const })));
      sessionsStore.set((all) =>
        [
          {
            id: uid(),
            date: Date.now(),
            scenario: scenarioTitle,
            seconds,
            overall: r.scores?.overall ?? 0,
            fluency: r.scores?.fluency ?? 0,
            accuracy: r.scores?.accuracy ?? 0,
            estimatedLevel: r.estimatedLevel ?? '',
            summary: r.summary ?? '',
          },
          ...all,
        ].slice(0, 100),
      );
      award(10, 'drills', 0);
      logActivity('speaking', `Speaking report · ${scenarioTitle}`, {
        score: r.scores?.overall ?? 0, xp: 10,
        details: { scores: r.scores, estimatedLevel: r.estimatedLevel, summary: r.summary, seconds },
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setReporting(false);
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="voice-page">
      <PageHeader
        title={V.title}
        zh="口语陪练"
        subtitle={V.subtitle}
      />
      <ErrorBox error={error} />

      {!live && status !== 'closed' && (
        <section className="card">
          <h3>{V.chooseScenario}</h3>
          <div className="scenario-grid">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={`scenario ${scenarioId === s.id ? 'selected' : ''}`}
                onClick={() => setScenarioId(s.id)}
                title={s.prompt}
              >
                <span className="scenario-icon">{s.icon}</span>
                <span className="scenario-title">{scTitle(s, lang)}</span>
                <span className="scenario-zh">{scenarioSub(s, lang)}</span>
                {s.minLevel > settings.level && <span className="tag tag-warn">HSK {s.minLevel}+</span>}
              </button>
            ))}
            <button className={`scenario ${scenarioId === 'custom' ? 'selected' : ''}`} onClick={() => setScenarioId('custom')}>
              <span className="scenario-icon">✨</span>
              <span className="scenario-title">{V.custom}</span>
              {lang !== 'zh' && <span className="scenario-zh">自定义</span>}
            </button>
          </div>
          {scenarioId === 'custom' && (
            <textarea
              className="input"
              rows={3}
              placeholder={V.customPlaceholder}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          )}

          <h3>{V.style}</h3>
          <div className="segmented">
            {TUTOR_MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => setMode(m.id)} title={V.modes[m.id]?.[1] ?? m.desc}>
                {V.modes[m.id]?.[0] ?? m.label}
              </button>
            ))}
          </div>
          <p className="muted small">{V.modes[mode]?.[1]}</p>

          <div className="row wrap gap">
            <label className="field">
              <span>{T.common.voice}</span>
              <select className="input" value={settings.tutorVoice} onChange={(e) => settingsStore.set((s) => ({ ...s, tutorVoice: e.target.value }))}>
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.id} — {T.voices[v.id] ?? v.desc}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{T.common.yourLevel}</span>
              <select className="input" value={settings.level} onChange={(e) => settingsStore.set((s) => ({ ...s, level: +e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <option key={l} value={l}>
                    HSK {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button className="btn btn-primary btn-lg" onClick={start}>
            {V.start}
          </button>
          <p className="muted small">{V.headphones}</p>
        </section>
      )}

      {(live || status === 'closed' || entries.length > 0) && (
        <div className="call-layout">
          <section className="card call-panel">
            <div ref={orb} className={`orb ${status} ${modelSpeaking ? 'speaking' : ''}`}>
              <div className="orb-core">说</div>
            </div>
            <div className="call-meta">
              <strong>{scenarioTitle}</strong>
              <span className="muted">
                {status === 'connecting' ? V.connecting : status === 'live' ? (muted ? V.muted : modelSpeaking ? V.teacherSpeaking : V.listening) : V.ended} · {mmss}
              </span>
              {detail && <span className="muted small">{detail}</span>}
            </div>
            {live ? (
              <div className="call-controls">
                <button className={`btn ${muted ? 'btn-warn' : ''}`} onClick={toggleMute}>
                  {muted ? V.unmute : V.mute}
                </button>
                <button className="btn" onClick={hint} disabled={hinting}>
                  {hinting ? <span className="spinner sm" /> : '💡'} {V.whatSay}
                </button>
                <button className="btn btn-danger" onClick={stop}>
                  {V.end}
                </button>
              </div>
            ) : (
              <div className="call-controls">
                <button className="btn btn-primary" onClick={makeReport} disabled={reporting || entries.length < 2 || !!report}>
                  {reporting ? <span className="spinner sm" /> : '📊'} {V.getReport}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setStatus('idle');
                    setEntries([]);
                    setReport(null);
                  }}
                >
                  {V.newSession}
                </button>
              </div>
            )}
            {live && (
              <div className="row gap">
                <input
                  className="input"
                  placeholder={V.typePlaceholder}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTyped()}
                />
                <button className="btn" onClick={sendTyped}>
                  {T.common.send}
                </button>
              </div>
            )}
            {suggestions && (
              <div className="suggestions">
                <div className="row between">
                  <strong>{V.trySaying}</strong>
                  <button className="btn-link" onClick={() => setSuggestions(null)}>
                    {V.hide}
                  </button>
                </div>
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion">
                    <Zh text={s.zh} pinyin />
                    <SpeakButton text={s.zh} />
                    <span className="muted small">{s.en}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card transcript">
            <h3>{V.transcript}</h3>
            {entries.length === 0 && <p className="muted">{V.transcriptEmpty}</p>}
            {entries.map((e) => (
              <div key={e.id} className={`bubble ${e.role}`}>
                {e.role === 'model' ? <Zh text={e.text} onWord={openWord} /> : <span lang="zh-CN">{e.text}</span>}
                {e.role === 'model' && e.final && (
                  <div className="bubble-tools">
                    <SpeakButton text={e.text} />
                    {e.translation ? (
                      <span className="translation">{e.translation}</span>
                    ) : (
                      <button className="btn-link" onClick={() => translate(e)}>
                        {T.common.translate}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={transcriptEnd} />
          </section>
        </div>
      )}

      {reporting && <Spinner label={V.analyzing} />}
      {report && <ReportView report={report} />}
      {popup}
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const sc = report.scores ?? ({} as Report['scores']);
  const T = useT();
  const V = T.voice;
  return (
    <section className="card report">
      <div className="row between wrap">
        <h2>{V.report}</h2>
        <span className="tag">{V.estLevel(report.estimatedLevel)}</span>
      </div>
      <p>{report.summary}</p>
      {report.id && (
        <ShareResult
          key={report.id}
          result={{
            kind: 'speaking',
            title: report.scenarioTitle ?? V.practice,
            score: sc.overall ?? 0,
            details: {
              scenario: report.scenarioTitle, seconds: report.seconds, estimatedLevel: report.estimatedLevel,
              scores: sc, summary: report.summary, mistakes: (report.mistakes ?? []).length,
            },
          }}
        />
      )}
      <div className="score-row">
        {(['overall', 'fluency', 'accuracy', 'vocabulary', 'pronunciation'] as const).map((k) => (
          <div key={k} className="score">
            <div className="score-ring" style={{ ['--p' as string]: sc[k] ?? 0 }}>
              <span>{sc[k] ?? '–'}</span>
            </div>
            <small>{V.scores[k] ?? k}</small>
          </div>
        ))}
      </div>
      {report.strengths?.length > 0 && (
        <>
          <h3>{V.strengths}</h3>
          <ul>
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
      {report.mistakes?.length > 0 && (
        <>
          <h3>{V.corrections}</h3>
          <p className="muted small">{V.savedToNotebook}</p>
          {report.mistakes.map((m, i) => (
            <div key={i} className="correction">
              <div className="said">✗ {m.said}</div>
              <div className="fixed">
                ✓ <Zh text={m.correct} /> <SpeakButton text={m.correct} />
              </div>
              <div className="muted small">{m.explanation}</div>
            </div>
          ))}
        </>
      )}
      {report.betterExpressions?.length > 0 && (
        <>
          <h3>{V.native}</h3>
          {report.betterExpressions.map((b, i) => (
            <div key={i} className="correction">
              <div className="said">{V.you} {b.basic}</div>
              <div className="fixed">
                {V.nativeLabel} <Zh text={b.native} /> <SpeakButton text={b.native} />
              </div>
              <div className="muted small">{b.meaning}</div>
            </div>
          ))}
        </>
      )}
      {report.vocabulary?.length > 0 && (
        <>
          <div className="row between wrap">
            <h3>{T.common.vocabulary}</h3>
            <button className="btn btn-sm" onClick={() => addCards(report.vocabulary, 'Voice sessions')}>
              {T.common.addAllCards}
            </button>
          </div>
          <div className="vocab-grid">
            {report.vocabulary.map((v, i) => (
              <div key={i} className="vocab-item">
                <span className="vocab-hanzi" lang="zh-CN">
                  {v.hanzi}
                </span>
                <Pinyin hanzi={v.hanzi} />
                <span className="muted small">{v.meaning}</span>
                <AddCardButton word={v} deck="Voice sessions" />
              </div>
            ))}
          </div>
        </>
      )}
      {report.nextSteps?.length > 0 && (
        <>
          <h3>{V.nextSteps}</h3>
          <ul>
            {report.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
