import { useEffect, useRef, useState } from 'react';
import { ErrorBox, PageHeader, Pinyin, SpeakButton, Spinner, Zh } from '../components/ui';
import { Recorder, bytesToBase64, encodeWav, levelOf, pitchContour, playSamples } from '../lib/audio';
import { errorText, generateJSON, learnerProfile } from '../lib/gemini';
import { ttsAudio, SLOW_STYLE } from '../lib/speech';
import { addMistakes, award, settingsStore } from '../lib/state';
import { syllables, toPinyin } from '../lib/zh';

const PRESETS: Record<string, string[]> = {
  'Tone pairs': ['妈麻马骂', '北京', '老师', '很好', '你好', '不客气', '一起', '四是四，十是十'],
  'HSK 1–2': ['我叫什么名字？', '我很喜欢喝茶', '今天天气怎么样？', '我已经吃过饭了', '你觉得这个贵不贵？', '因为下雨，所以我没去'],
  'HSK 3–4': ['我把作业做完了', '天气越来越热了', '除了中文以外，我还会说法语', '不管多忙，他每天都锻炼身体'],
  'HSK 5–6': ['与其在家等消息，不如主动去问问', '这个方案虽然成本高，但是长远来看很划算', '他做事一向脚踏实地，从不半途而废'],
  'Tongue twisters': ['吃葡萄不吐葡萄皮', '妈妈骑马，马慢，妈妈骂马', '石室诗士施氏，嗜狮'],
};

interface Assessment {
  heard: string;
  heardPinyin: string;
  overall: number;
  tones: number;
  sounds: number;
  fluency: number;
  syllables: { char: string; target: string; heard: string; ok: boolean; issue: string }[];
  feedback: string;
  tip: string;
}

export default function Pronunciation() {
  const settings = settingsStore.use();
  const [target, setTarget] = useState('你好');
  const [draft, setDraft] = useState('');
  const [native, setNative] = useState<number[] | null>(null);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [mine, setMine] = useState<number[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [clip, setClip] = useState<Float32Array | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const rec = useRef<Recorder | null>(null);
  const meter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNative(null);
    setMine(null);
    setClip(null);
    setResult(null);
  }, [target]);

  useEffect(() => () => void rec.current?.stop(), []);

  async function listen(slow = false) {
    setError(null);
    setNativeBusy(true);
    try {
      const a = await ttsAudio(target, slow ? SLOW_STYLE : undefined);
      if (!slow || !native) setNative(pitchContour(a.samples, a.rate));
      await playSamples(a.samples, a.rate);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setNativeBusy(false);
    }
  }

  async function startRec() {
    setError(null);
    setResult(null);
    try {
      const r = new Recorder();
      rec.current = r;
      await r.start();
      setRecording(true);
      const analyser = await r.analyser;
      const loop = () => {
        if (rec.current !== r) return;
        if (meter.current) meter.current.style.width = `${Math.round(levelOf(analyser) * 100)}%`;
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function stopRec() {
    const r = rec.current;
    rec.current = null;
    setRecording(false);
    if (!r) return;
    const samples = r.stop();
    if (samples.length < 16000 * 0.3) {
      setError('That was too short or too quiet — try again, closer to the mic.');
      return;
    }
    setClip(samples);
    setMine(pitchContour(samples, 16000));
    if (!native) {
      ttsAudio(target)
        .then((a) => setNative(pitchContour(a.samples, a.rate)))
        .catch(() => {});
    }
    await assess(samples);
  }

  async function assess(samples: Float32Array) {
    setAssessing(true);
    try {
      const wav = bytesToBase64(encodeWav(samples, 16000));
      const r = await generateJSON<Assessment>(
        [
          {
            text: `You are an expert, honest Mandarin pronunciation coach. ${learnerProfile()}
The student tried to say: "${target}" (pinyin: ${toPinyin(target)}).
Listen very carefully to the attached recording. Judge tones (including tone sandhi), initials/finals (e.g. zh/z, q/ch, x/sh, ü, -n/-ng), and fluency. Do not assume they said it correctly — report what you actually hear.
Return JSON:
{"heard": "characters of what you actually heard", "heardPinyin": "tone-marked pinyin of what you heard",
 "overall": 0-100, "tones": 0-100, "sounds": 0-100, "fluency": 0-100,
 "syllables": [{"char": "one target character", "target": "target pinyin", "heard": "pinyin you heard", "ok": true/false, "issue": "short issue or empty"}],
 "feedback": "2–3 sentences of specific feedback in ${settings.nativeLanguage}",
 "tip": "one concrete physical tip to fix the biggest problem"}
Include one syllables entry per Chinese character of the target, in order.`,
          },
          { inlineData: { mimeType: 'audio/wav', data: wav } },
        ],
        { temperature: 0.2 },
      );
      setResult(r);
      award(3, 'drills');
      if (r.overall < 70) {
        addMistakes([{ source: 'pronunciation', said: r.heardPinyin || r.heard, correct: target, pinyin: toPinyin(target), explanation: r.feedback }]);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAssessing(false);
    }
  }

  async function newPhrase() {
    setGenerating(true);
    setError(null);
    try {
      const r = await generateJSON<{ zh: string }>(
        `Give one short Mandarin sentence (4–12 characters) for pronunciation practice for a HSK ${settings.level} learner. Include a tricky tone combination or sound (3rd-tone sandhi, 一/不 sandhi, zh/ch/sh, ü, etc.). Pick something different each time; randomness seed ${Math.random()}. JSON: {"zh": "sentence"}`,
        { temperature: 1 },
      );
      setTarget(r.zh.trim());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader title="Tone Lab" zh="声调实验室" subtitle="See your pitch next to a native speaker's, and get syllable-by-syllable AI feedback on your tones and sounds." />
      <ErrorBox error={error} />

      <section className="card">
        <div className="preset-groups">
          {Object.entries(PRESETS).map(([group, items]) => (
            <div key={group} className="preset-group">
              <small className="muted">{group}</small>
              <div className="chips">
                {items.map((p) => (
                  <button key={p} className={`chip ${p === target ? 'active' : ''}`} onClick={() => setTarget(p)} lang="zh-CN">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="row gap wrap">
          <input
            className="input grow"
            placeholder="Type any Chinese phrase to practise…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && draft.trim() && (setTarget(draft.trim()), setDraft(''))}
          />
          <button className="btn" onClick={() => draft.trim() && (setTarget(draft.trim()), setDraft(''))}>
            Use
          </button>
          <button className="btn" onClick={newPhrase} disabled={generating}>
            {generating ? <span className="spinner sm" /> : '🎲'} AI phrase
          </button>
        </div>
      </section>

      <section className="card lab">
        <div className="lab-target">
          <Zh text={target} pinyin size="xl" />
          <div className="tone-legend">
            {syllables(target)
              .filter((s) => s.tone >= 0)
              .map((s, i) => (
                <span key={i} className={`tone-dot t${s.tone}`} title={`${s.py}`}>
                  {s.tone || '·'}
                </span>
              ))}
          </div>
        </div>

        <div className="lab-controls">
          <button className="btn btn-lg" onClick={() => listen()} disabled={nativeBusy}>
            {nativeBusy ? <span className="spinner sm" /> : '🔊'} Listen
          </button>
          <button className="btn btn-lg" onClick={() => listen(true)} disabled={nativeBusy}>
            🐢 Slow
          </button>
          {!recording ? (
            <button className="btn btn-lg btn-primary" onClick={startRec} disabled={assessing}>
              🎤 Record
            </button>
          ) : (
            <button className="btn btn-lg btn-danger pulse" onClick={stopRec}>
              ⏹ Stop
            </button>
          )}
          {clip && !recording && (
            <button className="btn btn-lg" onClick={() => playSamples(clip, 16000)}>
              ▶️ My voice
            </button>
          )}
        </div>
        {recording && (
          <div className="meter">
            <div ref={meter} />
          </div>
        )}

        <PitchChart native={native} mine={mine} />
        <div className="chart-legend">
          <span>
            <i className="lg-native" /> Native (Gemini)
          </span>
          <span>
            <i className="lg-mine" /> You
          </span>
          <span className="muted small">Pitch relative to each speaker's average — compare the shapes, not the height.</span>
        </div>
      </section>

      {assessing && <Spinner label="Listening to your pronunciation…" />}
      {result && (
        <section className="card report">
          <div className="score-row">
            {(['overall', 'tones', 'sounds', 'fluency'] as const).map((k) => (
              <div key={k} className="score">
                <div className="score-ring" style={{ ['--p' as string]: result[k] ?? 0 }}>
                  <span>{result[k]}</span>
                </div>
                <small>{k}</small>
              </div>
            ))}
          </div>
          <p>
            <strong>Heard:</strong> <span lang="zh-CN">{result.heard}</span> <span className="muted">({result.heardPinyin})</span>
          </p>
          <div className="syllable-grid">
            {result.syllables?.map((s, i) => (
              <div key={i} className={`syl ${s.ok ? 'ok' : 'bad'}`} title={s.issue}>
                <span className="syl-char" lang="zh-CN">
                  {s.char}
                </span>
                <span className="syl-py">{s.target}</span>
                {!s.ok && <span className="syl-heard">heard {s.heard}</span>}
              </div>
            ))}
          </div>
          {result.syllables?.some((s) => !s.ok && s.issue) && (
            <ul className="issues">
              {result.syllables
                .filter((s) => !s.ok && s.issue)
                .map((s, i) => (
                  <li key={i}>
                    <b lang="zh-CN">{s.char}</b> — {s.issue}
                  </li>
                ))}
            </ul>
          )}
          <p>{result.feedback}</p>
          <p className="tip">💡 {result.tip}</p>
        </section>
      )}

      <ToneGuide />
    </div>
  );
}

function PitchChart({ native, mine }: { native: number[] | null; mine: number[] | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(c);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = css.getPropertyValue('--line');
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (h * i) / 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const range = 9; // ± semitones
    const draw = (data: number[] | null, color: string, width: number) => {
      if (!data?.length) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      let pen = false;
      data.forEach((v, i) => {
        if (Number.isNaN(v)) {
          pen = false;
          return;
        }
        const x = 12 + ((w - 24) * i) / Math.max(1, data.length - 1);
        const y = h / 2 - (Math.max(-range, Math.min(range, v)) / range) * (h / 2 - 10);
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      });
      ctx.stroke();
    };
    draw(native, css.getPropertyValue('--native-line'), 6);
    draw(mine, css.getPropertyValue('--mine-line'), 3);
    if (!native?.length && !mine?.length) {
      ctx.fillStyle = css.getPropertyValue('--muted');
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Press Listen and Record to see pitch curves', w / 2, h / 2);
    }
  }, [native, mine]);
  return <canvas ref={canvas} className="pitch-chart" />;
}

function ToneGuide() {
  const tones = [
    { n: 1, name: 'High & flat', path: 'M5,10 L95,10', ex: '妈', py: 'mā', m: 'mother' },
    { n: 2, name: 'Rising', path: 'M5,40 L95,8', ex: '麻', py: 'má', m: 'hemp' },
    { n: 3, name: 'Low dip', path: 'M5,30 Q40,58 70,50 T95,20', ex: '马', py: 'mǎ', m: 'horse' },
    { n: 4, name: 'Sharp fall', path: 'M5,8 L95,52', ex: '骂', py: 'mà', m: 'to scold' },
  ];
  return (
    <section className="card">
      <h3>The four tones</h3>
      <div className="tone-guide">
        {tones.map((t) => (
          <div key={t.n} className={`tone-card t${t.n}`}>
            <svg viewBox="0 0 100 60">
              <path d={t.path} />
            </svg>
            <div className="row between">
              <span className="tone-ex" lang="zh-CN">
                {t.ex}
              </span>
              <SpeakButton text={t.ex} />
            </div>
            <Pinyin pinyin={`${t.py} · ${t.m}`} />
            <small className="muted">
              Tone {t.n} · {t.name}
            </small>
          </div>
        ))}
      </div>
      <details>
        <summary>Tone sandhi rules</summary>
        <ul>
          <li>
            <b>3 + 3 → 2 + 3</b>: 你好 is said <i>ní hǎo</i>.
          </li>
          <li>
            <b>不 bù</b> becomes <i>bú</i> before a 4th tone: 不是 <i>bú shì</i>.
          </li>
          <li>
            <b>一 yī</b> becomes <i>yí</i> before a 4th tone (一个 yí gè) and <i>yì</i> before tones 1–3 (一起 yìqǐ).
          </li>
          <li>
            A 3rd tone before any non-3rd tone is usually a <b>low half-tone</b> (just the dip, no rise): 老师 <i>lǎoshī</i>.
          </li>
        </ul>
      </details>
    </section>
  );
}
