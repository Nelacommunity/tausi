import { CURRICULUM } from '../data/curriculum';
import { cardsStore, dueCards } from '../lib/srs';
import { liveStreak, mistakesStore, progressStore, sessionsStore, settingsStore, today } from '../lib/state';
import { todayKey } from '../lib/store';
import { useEffect, useState } from 'react';
import { loadHistory, type Activity } from '../lib/history';
import { locale, useLang, useT } from '../lib/i18n';
import { unitText } from '../locales/content';
import { ActivityRow } from './History';

export default function Dashboard() {
  const settings = settingsStore.use();
  const progress = progressStore.use();
  const cards = cardsStore.use();
  const mistakes = mistakesStore.use();
  const sessions = sessionsStore.use();
  const T = useT();
  const lang = useLang();
  const D = T.dashboard;
  const [recent, setRecent] = useState<Activity[] | null>(null);
  useEffect(() => {
    loadHistory(undefined, 5).then(setRecent).catch(() => setRecent([]));
  }, []);
  const t = today(progress);
  const { due, fresh } = dueCards(cards);
  const streak = liveStreak(progress);
  const nextUnit = CURRICULUM.find((u) => u.level >= settings.level && !progress.lessons[u.id]);
  const learned = cards.filter((c) => c.state === 'review').length;
  const openMistakes = mistakes.filter((m) => !m.mastered).length;
  const pct = Math.min(100, Math.round((t.xp / settings.dailyGoal) * 100));

  const hour = new Date().getHours();
  const greet = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  // Last 7 days of XP
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString(locale(), { weekday: 'short' }), xp: progress.days[todayKey(d)]?.xp ?? 0 };
  });
  const maxXp = Math.max(settings.dailyGoal, ...week.map((w) => w.xp));

  const nextTitle = nextUnit ? unitText(nextUnit, lang).title : '';
  const plan = [
    { done: t.cards >= Math.min(20, due.length + t.cards) && t.cards > 0, label: D.planCards(due.length + fresh.length), href: '#/cards', icon: '🃏' },
    { done: t.lessons > 0, label: nextUnit ? D.planLesson(nextTitle) : D.planCustom, href: '#/lessons', icon: '📚' },
    { done: t.voiceSeconds >= 300, label: D.planSpeak(Math.floor(t.voiceSeconds / 60)), href: '#/voice', icon: '🎙️' },
    { done: t.drills > 0, label: D.planDrill, href: '#/pronounce', icon: '🎵' },
    { done: t.reading > 0 || t.writing > 0, label: D.planRead, href: '#/read', icon: '📖' },
  ];
  const planDone = plan.filter((p) => p.done).length;

  return (
    <div className="dashboard">
      <section className="hero card">
        <div>
          <p className="hero-greet" lang="zh-CN">
            {greet}{settings.name ? `，${settings.name}` : ''}！
          </p>
          <h1>{D.title}</h1>
          <p className="muted">{D.summary(settings.level, progress.xp.toLocaleString(locale()), progress.bestStreak)}</p>
          <div className="row gap wrap">
            <a className="btn btn-primary btn-lg" href="#/voice">
              {D.talk}
            </a>
            {nextUnit && (
              <a className="btn btn-lg" href="#/lessons">
                {D.continue(nextTitle)}
              </a>
            )}
          </div>
        </div>
        <div className="goal-ring" style={{ ['--p' as string]: pct }}>
          <div>
            <strong>{t.xp}</strong>
            <small>/ {settings.dailyGoal} XP</small>
          </div>
        </div>
      </section>

      <div className="stat-row">
        <div className="card stat">
          <span className="stat-icon">🔥</span>
          <strong>{streak}</strong>
          <small>{D.dayStreak}</small>
        </div>
        <a className="card stat" href="#/cards">
          <span className="stat-icon">🃏</span>
          <strong>{due.length + fresh.length}</strong>
          <small>{D.toReview}</small>
        </a>
        <div className="card stat">
          <span className="stat-icon">🧠</span>
          <strong>{learned}</strong>
          <small>{D.learned}</small>
        </div>
        <a className="card stat" href="#/mistakes">
          <span className="stat-icon">📓</span>
          <strong>{openMistakes}</strong>
          <small>{D.toFix}</small>
        </a>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="row between">
            <h3>{D.todaysPlan}</h3>
            <span className="tag">
              {planDone}/{plan.length}
            </span>
          </div>
          <div className="plan">
            {plan.map((p) => (
              <a key={p.label} href={p.href} className={`plan-item ${p.done ? 'done' : ''}`}>
                <span className="plan-check">{p.done ? '✓' : p.icon}</span>
                <span>{p.label}</span>
                <span className="muted">→</span>
              </a>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>{D.thisWeek}</h3>
          <div className="week-chart">
            {week.map((w, i) => (
              <div key={i} className="week-col" title={`${w.xp} XP`}>
                <div className="week-bar-wrap">
                  <div className={`week-bar ${w.xp >= settings.dailyGoal ? 'hit' : ''}`} style={{ height: `${(w.xp / maxXp) * 100}%` }} />
                  <div className="week-goal" style={{ bottom: `${(settings.dailyGoal / maxXp) * 100}%` }} />
                </div>
                <small>{w.label}</small>
              </div>
            ))}
          </div>
          <h3>{D.speaking}</h3>
          {sessions.length === 0 ? (
            <p className="muted small">{D.noSessions}</p>
          ) : (
            <div className="sessions">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="session-row">
                  <span className="score-pill">{s.overall}</span>
                  <div>
                    <strong>{s.scenario}</strong>
                    <div className="muted small">
                      {new Date(s.date).toLocaleDateString(locale())} · {Math.round(s.seconds / 60)} {D.min} · {s.estimatedLevel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <div className="row between">
          <h3>{D.recent}</h3>
          <a className="btn-link" href="#/history">{D.seeAll}</a>
        </div>
        {recent === null ? (
          <span className="spinner sm" />
        ) : recent.length === 0 ? (
          <p className="muted small">{D.noRecent}</p>
        ) : (
          <div className="history-list">
            {recent.map((a) => <ActivityRow key={a.id} a={a} />)}
          </div>
        )}
      </section>

      <section className="card why">
        <h3>{D.why}</h3>
        <div className="why-grid">
          {([[D.why1, D.why1d], [D.why2, D.why2d], [D.why3, D.why3d], [D.why4, D.why4d]] as const).map(([h, p]) => (
            <div key={h}>
              <b>{h}</b>
              <p className="muted small">{p}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
