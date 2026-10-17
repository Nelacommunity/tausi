import { CURRICULUM } from '../data/curriculum';
import { cardsStore, dueCards } from '../lib/srs';
import { liveStreak, mistakesStore, progressStore, sessionsStore, settingsStore, today } from '../lib/state';
import { todayKey } from '../lib/store';

export default function Dashboard() {
  const settings = settingsStore.use();
  const progress = progressStore.use();
  const cards = cardsStore.use();
  const mistakes = mistakesStore.use();
  const sessions = sessionsStore.use();
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
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), xp: progress.days[todayKey(d)]?.xp ?? 0 };
  });
  const maxXp = Math.max(settings.dailyGoal, ...week.map((w) => w.xp));

  const plan = [
    { done: t.cards >= Math.min(20, due.length + t.cards) && t.cards > 0, label: `Review flashcards (${due.length + fresh.length} waiting)`, href: '#/cards', icon: '🃏' },
    { done: t.lessons > 0, label: nextUnit ? `Lesson: ${nextUnit.title}` : 'Create a custom lesson', href: '#/lessons', icon: '📚' },
    { done: t.voiceSeconds >= 300, label: `Speak for 5 minutes (${Math.floor(t.voiceSeconds / 60)}/5 min)`, href: '#/voice', icon: '🎙️' },
    { done: t.drills > 0, label: 'One Tone Lab drill', href: '#/pronounce', icon: '🎵' },
    { done: t.reading > 0 || t.writing > 0, label: 'Read a story or write characters', href: '#/read', icon: '📖' },
  ];
  const planDone = plan.filter((p) => p.done).length;

  return (
    <div className="dashboard">
      <section className="hero card">
        <div>
          <p className="hero-greet" lang="zh-CN">
            {greet}{settings.name ? `，${settings.name}` : ''}！
          </p>
          <h1>Let's get you speaking Chinese.</h1>
          <p className="muted">
            HSK {settings.level} · {progress.xp.toLocaleString()} XP total · best streak {progress.bestStreak} days
          </p>
          <div className="row gap wrap">
            <a className="btn btn-primary btn-lg" href="#/voice">
              🎙️ Talk to your tutor
            </a>
            {nextUnit && (
              <a className="btn btn-lg" href="#/lessons">
                📚 Continue: {nextUnit.title}
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
          <small>day streak</small>
        </div>
        <a className="card stat" href="#/cards">
          <span className="stat-icon">🃏</span>
          <strong>{due.length + fresh.length}</strong>
          <small>cards to review</small>
        </a>
        <div className="card stat">
          <span className="stat-icon">🧠</span>
          <strong>{learned}</strong>
          <small>words learned</small>
        </div>
        <a className="card stat" href="#/mistakes">
          <span className="stat-icon">📓</span>
          <strong>{openMistakes}</strong>
          <small>mistakes to fix</small>
        </a>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="row between">
            <h3>Today's plan</h3>
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
          <h3>This week</h3>
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
          <h3>Speaking progress</h3>
          {sessions.length === 0 ? (
            <p className="muted small">Finish a voice session and get a feedback report to track your speaking scores here.</p>
          ) : (
            <div className="sessions">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="session-row">
                  <span className="score-pill">{s.overall}</span>
                  <div>
                    <strong>{s.scenario}</strong>
                    <div className="muted small">
                      {new Date(s.date).toLocaleDateString()} · {Math.round(s.seconds / 60)} min · {s.estimatedLevel}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card why">
        <h3>Why Shuō works</h3>
        <div className="why-grid">
          <div>
            <b>🎙️ Unlimited speaking</b>
            <p className="muted small">A native-level voice tutor available 24/7 that you can interrupt, like a real call — at a fraction of a private teacher's cost.</p>
          </div>
          <div>
            <b>🎯 Built around your mistakes</b>
            <p className="muted small">Every correction feeds your notebook, quizzes and flashcards, so weak spots get fixed instead of repeated.</p>
          </div>
          <div>
            <b>🎵 Tones you can see</b>
            <p className="muted small">Pitch curves compare your voice with a native speaker's, plus AI scoring for every syllable.</p>
          </div>
          <div>
            <b>📈 Real progression</b>
            <p className="muted small">HSK 1→6 curriculum, graded reading, spaced repetition and handwriting — all adapted to your level.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
