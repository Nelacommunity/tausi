import { MODELS, settingsStore, explainIn } from './state';
import { tr } from './i18n';

// All Gemini requests go through Tausi's server (/api/shuo/gemini), which
// holds the API key, checks the student is signed in and rate-limits. No key
// is ever present in the browser.
const PROXY = '/api/shuo/gemini';

export interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  thought?: boolean;
}
export interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

export class GeminiError extends Error {}

async function call(model: string, body: unknown, signal?: AbortSignal) {
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, body }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent('/shuo' + window.location.hash)}`);
    throw new GeminiError(tr().errors.signIn);
  }
  if (!res.ok || data.error) {
    const msg = typeof data.error === 'string' ? data.error : data?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) throw new GeminiError(tr().errors.tooFast);
    if (res.status === 404 || res.status >= 500) throw new GeminiError(`${tr().errors.unavailable} (${msg})`);
    throw new GeminiError(msg);
  }
  return data;
}

function textOf(data: any): string {
  const parts: Part[] = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join('');
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    throw new GeminiError(`${tr().errors.empty}${reason ? ` (${reason})` : ''}`);
  }
  return text;
}

export interface GenOptions {
  system?: string;
  temperature?: number;
  model?: string;
  signal?: AbortSignal;
}

/** Free-form text generation. `input` may be a prompt string or a full conversation. */
export async function generateText(input: string | Content[], opts: GenOptions = {}): Promise<string> {
  const contents: Content[] = typeof input === 'string' ? [{ role: 'user', parts: [{ text: input }] }] : input;
  const data = await call(
    opts.model || MODELS.text,
    {
      contents,
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      generationConfig: { temperature: opts.temperature ?? 0.8 },
    },
    opts.signal,
  );
  return textOf(data);
}

/** JSON-mode generation. Describe the expected shape in the prompt. */
export async function generateJSON<T>(input: string | Content[] | Part[], opts: GenOptions = {}): Promise<T> {
  let contents: Content[];
  if (typeof input === 'string') contents = [{ role: 'user', parts: [{ text: input }] }];
  else if (input.length && 'parts' in input[0]) contents = input as Content[];
  else contents = [{ role: 'user', parts: input as Part[] }];

  const data = await call(
    opts.model || MODELS.text,
    {
      contents,
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      generationConfig: { temperature: opts.temperature ?? 0.7, responseMimeType: 'application/json' },
    },
    opts.signal,
  );
  return parseJSON<T>(textOf(data));
}

export function parseJSON<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new GeminiError(tr().errors.malformed);
  }
}

/** Gemini text-to-speech. Returns 16-bit PCM (base64) and its sample rate. */
export async function synthesize(text: string, opts: { voice?: string; style?: string } = {}) {
  const s = settingsStore.get();
  const style = opts.style ?? 'Read this aloud in clear, natural standard Mandarin (Putonghua), at a calm teaching pace';
  const data = await call(MODELS.tts, {
    contents: [{ role: 'user', parts: [{ text: `${style}:\n${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice || s.tutorVoice } } },
    },
  });
  const part: Part | undefined = data?.candidates?.[0]?.content?.parts?.find((p: Part) => p.inlineData);
  if (!part?.inlineData) throw new GeminiError(tr().errors.noAudio);
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
  return { data: part.inlineData.data, rate };
}

/** AI is always available: Tausi's server provides it to signed-in students. */
export function hasKey() {
  return true;
}

/** Shared learner context injected into prompts. */
export function learnerProfile(): string {
  const s = settingsStore.get();
  return `Learner profile: HSK level ${s.level} (on a 1–6 scale), native language ${explainIn()}. Goal: ${s.goal}.`;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));
