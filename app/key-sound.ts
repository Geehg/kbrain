// Short, original switch synthesis: bottom-out thock, spring tick and release.
// No recordings, external requests or continuously running oscillators.
export function mechanicalKeySamples(sampleRate: number, seed = 1): Float32Array<ArrayBuffer> {
  const samples = new Float32Array(Math.ceil(sampleRate * .24));
  let random = seed >>> 0, low = 0;
  for (let i = 0; i < samples.length; i++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const noise = random / 2147483648 - 1;
    low += .18 * (noise - low);
    const time = i / sampleRate;
    let value = 0;
    for (const [onset, strength, frequency] of [[0, .68, 235], [.16, .33, 420]]) {
      const t = time - onset;
      if (t < 0) continue;
      const attack = Math.min(t / .0008, 1);
      const body = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t / .017);
      const tick = (noise - low) * Math.exp(-t / .0035);
      const spring = Math.sin(2 * Math.PI * 2650 * t) * Math.exp(-t / .008);
      value += strength * attack * (.52 * body + .23 * low * Math.exp(-t / .013) + .22 * tick + .035 * spring);
    }
    samples[i] = value * Math.min((samples.length - 1 - i) / (sampleRate * .005), 1);
  }
  return samples;
}

export class MechanicalKeyAudio {
  private context: AudioContext | null = null;
  private voices = new Set<AudioBufferSourceNode>();
  private buffer: AudioBuffer | null = null;
  private generation = 0;
  constructor(private createContext = () => new AudioContext()) {}

  // Call only from a click/tap/keyboard activation, never matrix polling or RAF.
  async play(volume: number): Promise<boolean> {
    if (!Number.isFinite(volume) || volume <= 0) return true;
    const generation = this.generation;
    try {
      const context = this.context ?? (this.context = this.createContext());
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation) return true;
      if (context.state !== 'running') return false;
      if (!this.buffer) {
        this.buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .24), context.sampleRate);
        this.buffer.copyToChannel(mechanicalKeySamples(context.sampleRate), 0);
      }
      if (this.voices.size >= 8) this.stopVoice(this.voices.values().next().value!);
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = this.buffer;
      source.playbackRate.value = .98 + Math.random() * .04;
      gain.gain.value = Math.max(0, Math.min(volume, 1));
      source.connect(gain); gain.connect(context.destination);
      this.voices.add(source);
      source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
      return true;
    } catch { return false; } // Audio failure must never block key selection.
  }
  private stopVoice(source: AudioBufferSourceNode) {
    try { source.stop(); } catch { /* already ended */ }
    this.voices.delete(source);
  }
  stop() { this.generation++; for (const voice of this.voices) this.stopVoice(voice); }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; this.buffer = null; }
}
