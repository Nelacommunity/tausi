import { Component, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { progressStore, settingsStore, liveStreak, today } from './lib/state';
import { stopPlayback } from './lib/audio';
import Dashboard from './pages/Dashboard';
import VoiceTutor from './pages/VoiceTutor';
import ChatTutor from './pages/ChatTutor';
import Lessons from './pages/Lessons';
import Pronunciation from './pages/Pronunciation';
import Flashcards from './pages/Flashcards';
import Characters from './pages/Characters';
import Reader from './pages/Reader';
import Mistakes from './pages/Mistakes';
import Settings from './pages/Settings';
import History from './pages/History';
import { LANGS, setLang, tr, useLang, useT } from './lib/i18n';
import type { Dict } from './locales/en';

const ROUTES: { path: string; key: keyof Dict['nav']; icon: string; zh: string; page: () => ReactElement; mobile?: boolean }[] = [
  { path: '', key: 'home', icon: '🏠', zh: '首页', page: Dashboard, mobile: true },
  { path: 'voice', key: 'voice', icon: '🎙️', zh: '口语', page: VoiceTutor, mobile: true },
  { path: 'lessons', key: 'lessons', icon: '📚', zh: '课程', page: Lessons, mobile: true },
  { path: 'chat', key: 'chat', icon: '💬', zh: '聊天', page: ChatTutor },
  { path: 'pronounce', key: 'pronounce', icon: '🎵', zh: '声调', page: Pronunciation },
  { path: 'cards', key: 'cards', icon: '🃏', zh: '生词', page: Flashcards, mobile: true },
  { path: 'write', key: 'write', icon: '✍️', zh: '写字', page: Characters },
  { path: 'read', key: 'read', icon: '📖', zh: '阅读', page: Reader },
  { path: 'mistakes', key: 'mistakes', icon: '📓', zh: '错题本', page: Mistakes },
  { path: 'history', key: 'history', icon: '🗂️', zh: '记录', page: History },
  { path: 'settings', key: 'settings', icon: '⚙️', zh: '设置', page: Settings, mobile: true },
];

const current = () => window.location.hash.replace(/^#\/?/, '').split('?')[0];

export default function App() {
  const [path, setPath] = useState(current);
  const [moreOpen, setMoreOpen] = useState(false);
  const settings = settingsStore.use();
  const progress = progressStore.use();
  const T = useT();
  const lang = useLang();

  useEffect(() => {
    const onHash = () => {
      stopPlayback();
      setPath(current());
      setMoreOpen(false);
      document.querySelector('main')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const route = ROUTES.find((r) => r.path === path) ?? ROUTES[0];
  const Page = route.page;
  const t = today(progress);
  const pct = Math.min(100, Math.round((t.xp / settings.dailyGoal) * 100));

  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark">说</span>
          <span>
            <strong>Shuō</strong>
            <small>{T.app.tagline}</small>
          </span>
        </a>
        <nav>
          {ROUTES.map((r) => (
            <a key={r.path} href={`#/${r.path}`} className={r.path === route.path ? 'active' : ''}>
              <span className="nav-icon">{r.icon}</span>
              <span className="nav-label">{T.nav[r.key]}</span>
              {lang !== 'zh' && <span className="nav-zh">{r.zh}</span>}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="lang-switch" role="group" aria-label={T.app.language}>
            {LANGS.map((l) => (
              <button key={l.id} className={lang === l.id ? 'active' : ''} onClick={() => setLang(l.id)} title={l.label} lang={l.id}>
                {l.short}
              </button>
            ))}
          </div>
          <a className="back-to-tausi" href="/learn">{T.app.backToTausi}</a>
          <div className="streak-pill" title={T.app.dayStreak}>
            🔥 {T.app.days(liveStreak(progress))}
          </div>
          <div className="goal-bar" title={T.app.xpToday(t.xp, settings.dailyGoal)}>
            <div style={{ width: `${pct}%` }} />
          </div>
          <small className="muted">
            {T.app.xpToday(t.xp, settings.dailyGoal)} · HSK {settings.level}
          </small>
        </div>
      </aside>

      <main>
        <div className="page" key={route.path}>
          <PageBoundary>
            <Page />
          </PageBoundary>
        </div>
      </main>

      <nav className="bottom-nav">
        {ROUTES.filter((r) => r.mobile).map((r) => (
          <a key={r.path} href={`#/${r.path}`} className={r.path === route.path ? 'active' : ''}>
            <span>{r.icon}</span>
            <small>{T.nav[r.key].split(' ')[0]}</small>
          </a>
        ))}
        <button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen((o) => !o)}>
          <span>☰</span>
          <small>{T.nav.more}</small>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet" onClick={() => setMoreOpen(false)}>
          <div className="more-grid" onClick={(e) => e.stopPropagation()}>
            {ROUTES.map((r) => (
              <a key={r.path} href={`#/${r.path}`} onClick={() => setMoreOpen(false)}>
                <span>{r.icon}</span>
                {T.nav[r.key]}
              </a>
            ))}
            <div className="lang-switch more-lang" role="group" aria-label={T.app.language}>
              {LANGS.map((l) => (
                <button key={l.id} className={lang === l.id ? 'active' : ''} onClick={() => setLang(l.id)} lang={l.id}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Keeps one broken page from blanking the whole app. */
class PageBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card empty">
        <div className="big-emoji">😵</div>
        <h2>{tr().app.pageError}</h2>
        <p className="muted">{this.state.error.message}</p>
        <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
          {tr().app.tryAgain}
        </button>
      </div>
    );
  }
}
