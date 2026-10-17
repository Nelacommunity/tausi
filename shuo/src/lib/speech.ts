import { pcm16ToFloat, playSamples, stopPlayback } from './audio';
import { synthesize } from './gemini';
import { settingsStore, MODELS } from './state';

export const SLOW_STYLE =
  'Read this aloud very slowly and clearly in standard Mandarin, pronouncing every tone carefully, like a teacher for a beginner';

const cache = new Map<string, { samples: Float32Array; rate: number }>();

/** Fetch (and cache) Gemini TTS audio for a phrase. */
export async function ttsAudio(text: string, style?: string) {
  const s = settingsStore.get();
  const key = `${MODELS.tts}|${s.tutorVoice}|${style ?? ''}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { data, rate } = await synthesize(text, { style });
  const audio = { samples: pcm16ToFloat(data), rate };
  cache.set(key, audio);
  return audio;
}

function browserSpeak(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = rate;
    const voice = synth.getVoices().find((v) => /zh[-_]CN/i.test(v.lang)) ?? synth.getVoices().find((v) => v.lang.startsWith('zh'));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

/** Speak Chinese text with the user's preferred engine, falling back to the browser voice. */
export async function speak(text: string, opts: { slow?: boolean } = {}) {
  stopPlayback();
  const s = settingsStore.get();
  if (s.playback === 'gemini') {
    try {
      const { samples, rate } = await ttsAudio(text, opts.slow ? SLOW_STYLE : undefined);
      return await playSamples(samples, rate);
    } catch (e) {
      console.warn('AI voice failed, using browser voice', e);
    }
  }
  return browserSpeak(text, opts.slow ? 0.6 : 0.9);
}

export { stopPlayback };
