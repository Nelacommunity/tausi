import { Mic, StreamPlayer, bytesToBase64, floatToPcm16, resample } from './audio';

// Ephemeral-token endpoint: the browser connects with a single-use, short-lived
// token minted by Tausi's server (/api/shuo/live-token), never with the API key.
const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';

async function liveToken(model: string): Promise<string> {
  const res = await fetch('/api/shuo/live-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent('/shuo' + window.location.hash)}`);
    throw new Error('Please sign in again.');
  }
  if (!res.ok || !data.token) throw new Error(data.error || 'Could not start a voice session — try again.');
  return data.token as string;
}

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'closed' | 'error';

export interface LiveCallbacks {
  onStatus: (s: LiveStatus, detail?: string) => void;
  onTranscript: (role: 'user' | 'model', chunk: string) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
}

export interface LiveOptions {
  model: string;
  voice: string;
  systemPrompt: string;
  kickoff?: string;
}

/** Real-time voice conversation with Gemini over the Live API WebSocket. */
export class LiveSession {
  private ws: WebSocket | null = null;
  private mic: Mic | null = null;
  readonly player = new StreamPlayer();
  private pending: Float32Array[] = [];
  private pendingLen = 0;
  private muted = false;
  private closedByUser = false;
  micAnalyser: AnalyserNode | null = null;

  constructor(
    private opts: LiveOptions,
    private cb: LiveCallbacks,
  ) {}

  async connect() {
    this.cb.onStatus('connecting');
    const token = await liveToken(this.opts.model);
    const ws = new WebSocket(`${WS_URL}?access_token=${encodeURIComponent(token)}`);
    ws.binaryType = 'arraybuffer'; // decode synchronously so audio chunks stay in order
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      let setupDone = false;
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${this.opts.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.opts.voice } } },
              },
              systemInstruction: { parts: [{ text: this.opts.systemPrompt }] },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              contextWindowCompression: { slidingWindow: {} },
            },
          }),
        );
      };
      ws.onmessage = (ev) => {
        const msg = parseMessage(ev.data);
        if (!msg) return;
        if (msg.setupComplete && !setupDone) {
          setupDone = true;
          resolve();
          return;
        }
        this.handle(msg);
      };
      ws.onerror = () => {
        if (!setupDone) reject(new Error('Could not connect to the voice tutor. Check your network and try again.'));
      };
      ws.onclose = (ev) => {
        this.stopMic();
        if (!setupDone) {
          reject(new Error(ev.reason || `Connection closed (code ${ev.code}). Try another voice model in Settings.`));
          return;
        }
        if (this.closedByUser) this.cb.onStatus('closed');
        else this.cb.onStatus(ev.code === 1000 ? 'closed' : 'error', ev.reason || `Connection closed (code ${ev.code})`);
      };
    });

    this.mic = new Mic((samples, rate) => this.onMicFrame(samples, rate));
    await this.mic.start();
    this.micAnalyser = await this.mic.analyserReady;
    this.cb.onStatus('live');
    if (this.opts.kickoff) this.sendText(this.opts.kickoff);
  }

  private handle(msg: any) {
    const sc = msg.serverContent;
    if (sc) {
      if (sc.interrupted) {
        this.player.interrupt();
        this.cb.onInterrupted();
      }
      for (const part of sc.modelTurn?.parts ?? []) {
        const d = part.inlineData;
        if (d?.data && String(d.mimeType ?? 'audio').startsWith('audio')) {
          const rate = Number(/rate=(\d+)/.exec(d.mimeType ?? '')?.[1] ?? 24000);
          this.player.push(d.data, rate);
        }
      }
      if (sc.inputTranscription?.text) this.cb.onTranscript('user', sc.inputTranscription.text);
      if (sc.outputTranscription?.text) this.cb.onTranscript('model', sc.outputTranscription.text);
      if (sc.turnComplete) this.cb.onTurnComplete();
    }
    if (msg.goAway) this.cb.onStatus('live', 'Session will end soon (server time limit).');
  }

  private onMicFrame(samples: Float32Array, rate: number) {
    if (this.muted || this.ws?.readyState !== WebSocket.OPEN) return;
    const s16 = resample(samples, rate, 16000);
    this.pending.push(s16);
    this.pendingLen += s16.length;
    if (this.pendingLen < 1600) return; // ~100 ms chunks
    const merged = new Float32Array(this.pendingLen);
    let o = 0;
    for (const c of this.pending) {
      merged.set(c, o);
      o += c.length;
    }
    this.pending = [];
    this.pendingLen = 0;
    this.ws.send(
      JSON.stringify({
        realtimeInput: { audio: { data: bytesToBase64(floatToPcm16(merged)), mimeType: 'audio/pcm;rate=16000' } },
      }),
    );
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ realtimeInput: { text } }));
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }
  }

  private stopMic() {
    this.mic?.stop();
    this.mic = null;
    this.micAnalyser = null;
  }

  close() {
    this.closedByUser = true;
    this.stopMic();
    this.player.close();
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) this.ws.close(1000);
    this.ws = null;
  }
}

function parseMessage(data: unknown): any | null {
  try {
    if (typeof data === 'string') return JSON.parse(data);
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data));
  } catch {
    /* ignore */
  }
  return null;
}
