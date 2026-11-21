/**
 * Focus sounds made on the device with Web Audio (no files, no network):
 * a soft brown/pink noise bed and a gentle end chime. Safe no-ops where
 * Web Audio is missing (tests, old browsers).
 */

export const NOISES = [
  { id: "off", label: "Тишина" },
  { id: "brown", label: "Бурый шум" },
  { id: "rain", label: "Дождь" },
] as const;
export type NoiseId = (typeof NOISES)[number]["id"];

export function isNoiseId(v: unknown): v is NoiseId {
  return NOISES.some((n) => n.id === v);
}

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let current: { stop: () => void } | null = null;

function audio(): Ctx | null {
  if (typeof window === "undefined") return null;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx ??= new C();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** Fills a looping buffer with brown noise (integrated white noise). */
function brownBuffer(c: Ctx, seconds = 4): AudioBuffer {
  const len = c.sampleRate * seconds;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

/** Starts (or switches) the noise bed. Must be called from a user gesture the first time. */
export function playNoise(id: NoiseId, volume = 0.35): void {
  stopNoise();
  if (id === "off") return;
  const c = audio();
  if (!c) return;
  const src = c.createBufferSource();
  src.buffer = brownBuffer(c);
  src.loop = true;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + 1.5);
  let node: AudioNode = src;
  if (id === "rain") {
    // Rain: brighter band-passed noise with a slow amplitude wobble.
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 400;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5000;
    src.connect(hp).connect(lp);
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = volume * 0.25;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    node = lp;
    current = {
      stop: () => {
        lfo.stop();
        fadeStop(c, gain, src);
      },
    };
  } else {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    src.connect(lp);
    node = lp;
    current = { stop: () => fadeStop(c, gain, src) };
  }
  node.connect(gain).connect(c.destination);
  src.start();
}

function fadeStop(c: Ctx, gain: GainNode, src: AudioBufferSourceNode) {
  const t = c.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(0, t + 0.6);
  src.stop(t + 0.7);
}

export function stopNoise(): void {
  current?.stop();
  current = null;
}

/** Soft two-note chime for "session over" / "break over". */
export function chime(): void {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  [660, 880].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const s = t + i * 0.35;
    g.gain.setValueAtTime(0, s);
    g.gain.linearRampToValueAtTime(0.25, s + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, s + 1.6);
    o.connect(g).connect(c.destination);
    o.start(s);
    o.stop(s + 1.7);
  });
}
