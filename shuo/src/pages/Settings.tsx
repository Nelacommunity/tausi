import { useState } from 'react';
import { PageHeader } from '../components/ui';
import { errorText, generateText } from '../lib/gemini';
import { currentUser, supabase } from '../lib/supabase';
import { speak } from '../lib/speech';
import { cardsStore } from '../lib/srs';
import { VOICES, mistakesStore, progressStore, settingsStore, type Settings as S } from '../lib/state';
import { LANGS, setLang, useLang, useT } from '../lib/i18n';

/** Clears progress here and in the account (settings are kept), then reloads. */
async function resetProgress() {
  const user = currentUser();
  if (user) {
    await Promise.all([
      supabase.from('shuo_state').delete().eq('user_id', user.id).neq('key', 'settings'),
      supabase.from('shuo_activity').delete().eq('user_id', user.id),
    ]);
  }
  const prefix = `shuo:${user?.id ?? 'anon'}:`;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix) && k !== `${prefix}settings`)
    .forEach((k) => localStorage.removeItem(k));
  location.reload();
}

const EXPLAIN_OPTIONS = ['auto', 'English', 'Kiswahili', 'Simplified Chinese'];

export default function Settings() {
  const s = settingsStore.use();
  const T = useT();
  const L = T.settings;
  const lang = useLang();
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const set = <K extends keyof S>(k: K, v: S[K]) => settingsStore.set((x) => ({ ...x, [k]: v }));

  async function testKey() {
    setTesting(true);
    setTest(null);
    try {
      const r = await generateText('Reply with exactly: 你好！连接成功。', { temperature: 0 });
      setTest({ ok: true, msg: `${L.connected} — ${r.trim()}` });
    } catch (e) {
      setTest({ ok: false, msg: errorText(e) });
    } finally {
      setTesting(false);
    }
  }

  function exportData() {
    const data = JSON.stringify({ settings: s, progress: progressStore.get(), cards: cardsStore.get(), mistakes: mistakesStore.get() }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `shuo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file: File) {
    file.text().then((t) => {
      const d = JSON.parse(t);
      if (d.progress) progressStore.set(d.progress);
      if (d.cards) cardsStore.set(d.cards);
      if (d.mistakes) mistakesStore.set(d.mistakes);
      if (d.settings) settingsStore.set((x) => ({ ...x, ...d.settings }));
    });
  }

  return (
    <div className="settings">
      <PageHeader title={L.title} zh="设置" />

      <section className="card">
        <h3>{L.language}</h3>
        <p className="small muted">{L.languageNote}</p>
        <div className="lang-switch lg" role="group" aria-label={T.app.language}>
          {LANGS.map((l) => (
            <button
              key={l.id}
              className={lang === l.id ? 'active' : ''}
              lang={l.id}
              onClick={() => {
                setLang(l.id);
                set('nativeLanguage', 'auto');
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>{L.account}</h3>
        <p className="small">
          {L.signedInAs} <strong>{currentUser()?.email ?? L.student}</strong>. {L.accountNote}
        </p>
        <div className="row gap wrap">
          <button className="btn" onClick={testKey} disabled={testing}>
            {testing ? <span className="spinner sm" /> : null} {L.testAi}
          </button>
          <a className="btn" href="/learn">
            {T.app.backToTausi}
          </a>
        </div>
        {test && <div className={test.ok ? 'success-box' : 'error-box'}>{test.msg}</div>}
      </section>

      <section className="card">
        <h3>{L.sharing}</h3>
        <p className="small muted">{L.sharingNote}</p>
        <div className="share-modes">
          {([
            ['ask', L.askTitle, L.askDesc],
            ['auto', L.autoTitle, L.autoDesc],
          ] as const).map(([mode, title, desc]) => (
            <label key={mode} className={`share-mode ${s.shareMode === mode ? 'active' : ''}`}>
              <input type="radio" name="shareMode" checked={s.shareMode === mode} onChange={() => set('shareMode', mode)} />
              <span>
                <strong>{title}</strong>
                <small className="muted">{desc}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>{L.about}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{L.name}</span>
            <input className="input" value={s.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="field">
            <span>{L.level}</span>
            <select className="input" value={s.level} onChange={(e) => set('level', +e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <option key={l} value={l}>
                  HSK {l} — {L.levels[l - 1]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{L.explainIn}</span>
            <select className="input" value={EXPLAIN_OPTIONS.includes(s.nativeLanguage) ? s.nativeLanguage : 'auto'} onChange={(e) => set('nativeLanguage', e.target.value)}>
              <option value="auto">{L.explainAuto}</option>
              <option value="English">English</option>
              <option value="Kiswahili">Kiswahili</option>
              <option value="Simplified Chinese">中文</option>
            </select>
          </label>
          <label className="field span-2">
            <span>{L.goal}</span>
            <textarea className="input" rows={2} value={s.goal} onChange={(e) => set('goal', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>{L.study}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{L.dailyGoal}</span>
            <select className="input" value={s.dailyGoal} onChange={(e) => set('dailyGoal', +e.target.value)}>
              {[20, 50, 100, 150, 250].map((g) => (
                <option key={g} value={g}>
                  {g} XP ({L.goalNames[g <= 20 ? 0 : g <= 50 ? 1 : g <= 100 ? 2 : 3]})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{L.newCards}</span>
            <input className="input" type="number" min={0} max={100} value={s.newCardsPerDay} onChange={(e) => set('newCardsPerDay', Math.max(0, +e.target.value))} />
          </label>
          <label className="field checkbox">
            <input type="checkbox" checked={s.showPinyin} onChange={(e) => set('showPinyin', e.target.checked)} />
            <span>{L.showPinyin}</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>{L.voiceSection}</h3>
        <div className="form-grid">
          <label className="field">
            <span>{L.tutorVoice}</span>
            <select className="input" value={s.tutorVoice} onChange={(e) => set('tutorVoice', e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {T.voices[v.id] ?? v.desc}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{L.playback}</span>
            <select className="input" value={s.playback} onChange={(e) => set('playback', e.target.value as S['playback'])}>
              <option value="gemini">{L.playbackAi}</option>
              <option value="browser">{L.playbackBrowser}</option>
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn" onClick={() => speak('你好！我是你的中文老师。我们一起加油吧！')}>
              {L.testVoice}
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>{L.data}</h3>
        <p className="muted small">{L.dataNote}</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>
            {L.export}
          </button>
          <label className="btn">
            {L.import}
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm(L.resetConfirm)) {
                void resetProgress();
              }
            }}
          >
            {L.reset}
          </button>
        </div>
      </section>
    </div>
  );
}
