// Audio utilities: PCM <-> base64, playback, microphone capture, WAV encoding, pitch tracking.

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function pcm16ToFloat(b64: string): Float32Array<ArrayBuffer> {
  const bytes = base64ToBytes(b64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.byteLength / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = view.getInt16(i * 2, true) / 32768;
  return out;
}

export function floatToPcm16(samples: Float32Array): Uint8Array {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

/** Linear-interpolation resampler (good enough for speech). */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const len = Math.floor(input.length / ratio);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const pcm = floatToPcm16(samples);
  const buf = new ArrayBuffer(44 + pcm.length);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Uint8Array(buf);
}

// ---------- Playback ----------
let playCtx: AudioContext | null = null;
export function playbackContext(): AudioContext {
  if (!playCtx || playCtx.state === 'closed') playCtx = new AudioContext();
  if (playCtx.state === 'suspended') void playCtx.resume();
  return playCtx;
}

let current: AudioBufferSourceNode | null = null;

/** Play mono float samples; resolves when playback finishes or is stopped. */
export function playSamples(samples: Float32Array, rate: number, playbackRate = 1): Promise<void> {
  stopPlayback();
  const ctx = playbackContext();
  const buffer = ctx.createBuffer(1, samples.length, rate);
  buffer.copyToChannel(new Float32Array(samples), 0);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = playbackRate;
  src.connect(ctx.destination);
  current = src;
  return new Promise((resolve) => {
    src.onended = () => {
      if (current === src) current = null;
      resolve();
    };
    src.start();
  });
}

export function stopPlayback() {
  try {
    current?.stop();
  } catch {
    /* already stopped */
  }
  current = null;
  window.speechSynthesis?.cancel();
}

/** Gapless streaming player for the Live API (24 kHz PCM chunks). */
export class StreamPlayer {
  private ctx = playbackContext();
  private nextTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  readonly analyser: AnalyserNode;

  constructor() {
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.connect(this.ctx.destination);
  }

  push(b64: string, rate = 24000) {
    const samples = pcm16ToFloat(b64);
    if (!samples.length) return;
    const buffer = this.ctx.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.analyser);
    const start = Math.max(this.ctx.currentTime + 0.03, this.nextTime);
    src.start(start);
    this.nextTime = start + buffer.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  get playing() {
    return this.sources.size > 0;
  }

  interrupt() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* noop */
      }
    });
    this.sources.clear();
    this.nextTime = 0;
  }

  close() {
    this.interrupt();
    this.analyser.disconnect();
  }
}

// ---------- Microphone ----------
const WORKLET = `
class Capture extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('shuo-capture', Capture);
`;

export class Mic {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  readonly analyserReady: Promise<AnalyserNode>;
  private resolveAnalyser!: (a: AnalyserNode) => void;
  sampleRate = 48000;

  constructor(private onFrame: (samples: Float32Array, rate: number) => void) {
    this.analyserReady = new Promise((r) => (this.resolveAnalyser = r));
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone not available in this browser (use https or localhost).');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    this.ctx = new AudioContext();
    this.sampleRate = this.ctx.sampleRate;
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'shuo-capture');
    this.node.port.onmessage = (e) => this.onFrame(e.data as Float32Array, this.sampleRate);
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    source.connect(this.node);
    // Worklet must be pulled by the graph; route through a muted gain.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
    this.resolveAnalyser(analyser);
  }

  stop() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.stream = null;
    this.node = null;
  }
}

/** Record a clip; `stop()` returns 16 kHz mono samples. */
export class Recorder {
  private chunks: Float32Array[] = [];
  private mic: Mic;
  constructor() {
    this.mic = new Mic((s) => this.chunks.push(s));
  }
  get analyser() {
    return this.mic.analyserReady;
  }
  start() {
    return this.mic.start();
  }
  stop(): Float32Array {
    const rate = this.mic.sampleRate;
    this.mic.stop();
    const total = this.chunks.reduce((n, c) => n + c.length, 0);
    const all = new Float32Array(total);
    let o = 0;
    for (const c of this.chunks) {
      all.set(c, o);
      o += c.length;
    }
    return trimSilence(resample(all, rate, 16000), 16000);
  }
}

function trimSilence(s: Float32Array, rate: number): Float32Array {
  const win = Math.floor(rate * 0.02);
  const thresh = 0.012;
  let start = 0;
  let end = s.length;
  const rms = (i: number) => {
    let sum = 0;
    for (let j = i; j < Math.min(i + win, s.length); j++) sum += s[j] * s[j];
    return Math.sqrt(sum / win);
  };
  while (start < s.length && rms(start) < thresh) start += win;
  while (end > start && rms(Math.max(0, end - win)) < thresh) end -= win;
  const pad = Math.floor(rate * 0.15);
  return s.subarray(Math.max(0, start - pad), Math.min(s.length, end + pad));
}

/** Current input level 0..1 from an analyser. */
export function levelOf(analyser: AnalyserNode, buf = new Uint8Array(analyser.fftSize)): number {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / buf.length) * 4);
}

// ---------- Pitch tracking (for the tone visualizer) ----------
/**
 * Returns a pitch contour in semitones relative to the speaker's median pitch
 * (NaN where unvoiced), one value per 10 ms hop.
 */
export function pitchContour(samples: Float32Array, rate: number): number[] {
  const s = rate === 16000 ? samples : resample(samples, rate, 16000);
  const sr = 16000;
  const frame = 640; // 40 ms
  const hop = 160; // 10 ms
  const minLag = Math.floor(sr / 450);
  const maxLag = Math.floor(sr / 70);
  const hz: number[] = [];
  for (let start = 0; start + frame + maxLag < s.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < frame; i++) energy += s[start + i] * s[start + i];
    const rms = Math.sqrt(energy / frame);
    if (rms < 0.015) {
      hz.push(NaN);
      continue;
    }
    let best = 0;
    let bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let num = 0;
      let e1 = 0;
      let e2 = 0;
      for (let i = 0; i < frame; i++) {
        const a = s[start + i];
        const b = s[start + i + lag];
        num += a * b;
        e1 += a * a;
        e2 += b * b;
      }
      const r = num / Math.sqrt(e1 * e2 + 1e-9);
      if (r > best) {
        best = r;
        bestLag = lag;
      }
    }
    hz.push(best > 0.6 ? sr / bestLag : NaN);
  }
  // Median filter to kill octave jumps.
  const smooth = hz.map((_, i) => {
    const win = hz.slice(Math.max(0, i - 2), i + 3).filter((v) => !Number.isNaN(v));
    if (Number.isNaN(hz[i]) || win.length < 2) return NaN;
    win.sort((a, b) => a - b);
    return win[Math.floor(win.length / 2)];
  });
  const voiced = smooth.filter((v) => !Number.isNaN(v)).sort((a, b) => a - b);
  if (!voiced.length) return [];
  const median = voiced[Math.floor(voiced.length / 2)];
  // Trim leading/trailing unvoiced frames.
  let a = 0;
  let b = smooth.length;
  while (a < b && Number.isNaN(smooth[a])) a++;
  while (b > a && Number.isNaN(smooth[b - 1])) b--;
  return smooth.slice(a, b).map((v) => (Number.isNaN(v) ? NaN : 12 * Math.log2(v / median)));
}
