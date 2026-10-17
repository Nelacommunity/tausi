import { useState } from 'react';
import { PageHeader } from '../components/ui';
import { errorText, generateText } from '../lib/gemini';
import { currentUser } from '../lib/supabase';
import { speak } from '../lib/speech';
import { cardsStore } from '../lib/srs';
import { LIVE_MODELS, TEXT_MODELS, TTS_MODELS, VOICES, mistakesStore, progressStore, settingsStore, type Settings as S } from '../lib/state';

export default function Settings() {
  const s = settingsStore.use();
  const [test, setTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const set = <K extends keyof S>(k: K, v: S[K]) => settingsStore.set((x) => ({ ...x, [k]: v }));

  async function testKey() {
    setTesting(true);
    setTest(null);
    try {
      const r = await generateText('Reply with exactly: 你好！连接成功。', { temperature: 0 });
      setTest({ ok: true, msg: `Connected ✓ — ${r.trim()}` });
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
      <PageHeader title="Settings" zh="设置" />

      <section className="card">
        <h3>👤 Your Tausi account</h3>
        <p className="small">
          Signed in as <strong>{currentUser()?.email ?? 'student'}</strong>. Your progress, flashcards and mistakes are saved to
          this account, so they follow you to any device. The AI tutor is provided by Tausi — no API key needed.
        </p>
        <div className="row gap wrap">
          <button className="btn" onClick={testKey} disabled={testing}>
            {testing ? <span className="spinner sm" /> : null} Test AI connection
          </button>
          <a className="btn" href="/learn">
            ← Back to Tausi
          </a>
        </div>
        {test && <div className={test.ok ? 'success-box' : 'error-box'}>{test.msg}</div>}
      </section>

      <section className="card">
        <h3>📤 Sharing results with your teacher</h3>
        <p className="small muted">
          Lesson scores and speaking-practice reports can go to the teachers of the classes you joined in Tausi.
        </p>
        <div className="share-modes">
          {([
            ['ask', 'Ask me each time', 'After a lesson or speaking session, you choose whether to tap “Send to teacher”.'],
            ['auto', 'Send automatically', 'Every finished lesson and speaking session is sent to your teachers.'],
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
        <h3>👤 About you</h3>
        <div className="form-grid">
          <label className="field">
            <span>Name (optional)</span>
            <input className="input" value={s.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="field">
            <span>Current level</span>
            <select className="input" value={s.level} onChange={(e) => set('level', +e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <option key={l} value={l}>
                  HSK {l} {['— beginner', '— elementary', '— pre-intermediate', '— intermediate', '— upper-intermediate', '— advanced'][l - 1]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Explanations in</span>
            <input className="input" value={s.nativeLanguage} onChange={(e) => set('nativeLanguage', e.target.value)} />
          </label>
          <label className="field span-2">
            <span>Your goal (the tutor adapts to this)</span>
            <textarea className="input" rows={2} value={s.goal} onChange={(e) => set('goal', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>🎯 Study preferences</h3>
        <div className="form-grid">
          <label className="field">
            <span>Daily XP goal</span>
            <select className="input" value={s.dailyGoal} onChange={(e) => set('dailyGoal', +e.target.value)}>
              {[20, 50, 100, 150, 250].map((g) => (
                <option key={g} value={g}>
                  {g} XP {g <= 20 ? '(casual)' : g <= 50 ? '(regular)' : g <= 100 ? '(serious)' : '(intense)'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>New flashcards per day</span>
            <input className="input" type="number" min={0} max={100} value={s.newCardsPerDay} onChange={(e) => set('newCardsPerDay', Math.max(0, +e.target.value))} />
          </label>
          <label className="field checkbox">
            <input type="checkbox" checked={s.showPinyin} onChange={(e) => set('showPinyin', e.target.checked)} />
            <span>Show pinyin above characters</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>🔊 Voice & models</h3>
        <div className="form-grid">
          <label className="field">
            <span>Tutor voice</span>
            <select className="input" value={s.tutorVoice} onChange={(e) => set('tutorVoice', e.target.value)}>
              {VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.desc}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Audio playback</span>
            <select className="input" value={s.playback} onChange={(e) => set('playback', e.target.value as S['playback'])}>
              <option value="gemini">Gemini voice (natural, uses API)</option>
              <option value="browser">Browser voice (instant, free)</option>
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn" onClick={() => speak('你好！我是你的中文老师。我们一起加油吧！')}>
              ▶️ Test voice
            </button>
          </div>
          <ModelField label="Text model (lessons, feedback, chat)" value={s.textModel} options={TEXT_MODELS} onChange={(v) => set('textModel', v)} />
          <ModelField label="Live voice model" value={s.liveModel} options={LIVE_MODELS} onChange={(v) => set('liveModel', v)} />
          <ModelField label="Text-to-speech model" value={s.ttsModel} options={TTS_MODELS} onChange={(v) => set('ttsModel', v)} />
        </div>
        <p className="muted small">You can type any model ID — handy when Google releases new models.</p>
      </section>

      <section className="card">
        <h3>💾 Your data</h3>
        <p className="muted small">Everything is stored in this browser. Export a backup to move to another device.</p>
        <div className="row gap wrap">
          <button className="btn" onClick={exportData}>
            ⬇️ Export backup
          </button>
          <label className="btn">
            ⬆️ Import backup
            <input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          </label>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Delete ALL progress, flashcards and mistakes? This cannot be undone.')) {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('shuo:') && k !== 'shuo:settings')
                  .forEach((k) => localStorage.removeItem(k));
                location.reload();
              }
            }}
          >
            Reset progress
          </button>
        </div>
      </section>
    </div>
  );
}

function ModelField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const id = `models-${label.replace(/\W/g, '')}`;
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input mono" list={id} value={value} onChange={(e) => onChange(e.target.value.trim())} />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}
