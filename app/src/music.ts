export type MusicStyle = 'pad' | 'bowls' | 'file' | 'none';

const DUCK_LEVEL = 0.35;

// Escala pentatónica de re (D, E, F#, A, B) para que todo combine sin disonancias.
const PENTATONIC = [146.83, 164.81, 185.0, 220.0, 246.94];
const CHORDS = [
  [146.83, 220.0, 293.66, 369.99],
  [123.47, 185.0, 246.94, 329.63],
  [164.81, 246.94, 329.63, 440.0],
  [110.0, 164.81, 220.0, 277.18],
];

/**
 * Música de relajación generada en tiempo real con Web Audio (sin problemas de licencias),
 * o un archivo de audio propio del usuario. Incluye "ducking": baja el volumen mientras
 * habla el narrador.
 */
export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private duckGain!: GainNode;
  private reverb!: ConvolverNode;
  private timer: number | undefined;
  private nextEventAt = 0;
  private chordIndex = 0;
  private audioEl: HTMLAudioElement | null = null;
  private fileUrl: string | null = null;
  private style: MusicStyle = 'none';
  private volume = 0.5;
  /** Se incrementa en cada start(): un fadeOut pendiente no debe parar una música nueva. */
  private generation = 0;

  setVolume(v: number): void {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  setFile(file: File): void {
    if (this.fileUrl) URL.revokeObjectURL(this.fileUrl);
    this.fileUrl = URL.createObjectURL(file);
    if (this.audioEl) this.audioEl.src = this.fileUrl;
  }

  get hasFile(): boolean {
    return this.fileUrl !== null;
  }

  duck(on: boolean): void {
    if (!this.ctx) return;
    this.duckGain.gain.setTargetAtTime(on ? DUCK_LEVEL : 1, this.ctx.currentTime, on ? 0.15 : 0.8);
  }

  /** Debe llamarse desde un gesto del usuario (clic) para que el navegador permita el audio. */
  async start(style: MusicStyle): Promise<void> {
    this.stop();
    this.generation++;
    this.style = style;
    if (this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    if (style === 'none') return;
    this.ensureContext();
    await this.ctx!.resume();

    if (style === 'file') {
      if (!this.fileUrl) return;
      this.audioEl ??= this.createAudioElement();
      this.audioEl.src = this.fileUrl;
      await this.audioEl.play();
      return;
    }
    this.nextEventAt = this.ctx!.currentTime + 0.1;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), 500);
  }

  pause(): void {
    void this.ctx?.suspend();
    this.audioEl?.pause();
  }

  resume(): void {
    void this.ctx?.resume();
    if (this.style === 'file') void this.audioEl?.play();
  }

  /** Baja el volumen gradualmente y para. */
  async fadeOut(seconds = 4): Promise<void> {
    if (!this.ctx) return;
    const generation = this.generation;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, seconds / 4);
    await new Promise((r) => setTimeout(r, seconds * 1000));
    if (generation === this.generation) this.stop();
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = undefined;
    this.audioEl?.pause();
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.duckGain = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(4);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    this.reverb.connect(wet).connect(this.duckGain);
    this.duckGain.connect(this.master).connect(ctx.destination);
  }

  private createAudioElement(): HTMLAudioElement {
    const el = new Audio();
    el.loop = true;
    this.ctx!.createMediaElementSource(el).connect(this.duckGain);
    return el;
  }

  /** Respuesta de impulso sintética para una reverberación amplia y suave. */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    return buffer;
  }

  /** Programa los eventos musicales de los próximos segundos. */
  private schedule(): void {
    const ctx = this.ctx!;
    while (this.nextEventAt < ctx.currentTime + 2) {
      const t = this.nextEventAt;
      if (this.style === 'pad') {
        this.padChord(t, 12);
        if (Math.random() < 0.6) this.chime(t + 3 + Math.random() * 4);
        this.nextEventAt += 9;
      } else {
        this.bowl(t, PENTATONIC[Math.floor(Math.random() * 3)] / 2);
        this.nextEventAt += 7 + Math.random() * 6;
      }
    }
  }

  private output(dry: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const dryGain = ctx.createGain();
    dryGain.gain.value = dry;
    g.connect(dryGain).connect(this.duckGain);
    g.connect(this.reverb);
    return g;
  }

  private padChord(t: number, duration: number): void {
    const ctx = this.ctx!;
    const chord = CHORDS[this.chordIndex++ % CHORDS.length];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(1100, t + duration / 2);
    filter.frequency.linearRampToValueAtTime(500, t + duration);
    const env = this.output(0.5);
    filter.connect(env);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.08, t + 4);
    env.gain.setValueAtTime(0.08, t + duration - 4);
    env.gain.linearRampToValueAtTime(0, t + duration);
    for (const freq of chord) {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + duration + 0.1);
      }
    }
  }

  private chime(t: number): void {
    const ctx = this.ctx!;
    const freq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)] * 4;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const env = this.output(0.3);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.03, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    osc.connect(env);
    osc.start(t);
    osc.stop(t + 5.1);
  }

  /** Cuenco tibetano: parciales inarmónicos con ligera desafinación que produce el "batido". */
  private bowl(t: number, base: number): void {
    const ctx = this.ctx!;
    const partials: [ratio: number, gain: number, decay: number][] = [
      [1, 0.12, 14],
      [2.71, 0.06, 10],
      [5.15, 0.025, 7],
      [8.43, 0.01, 4],
    ];
    const env = this.output(0.6);
    env.gain.value = 1;
    for (const [ratio, gain, decay] of partials) {
      for (const beat of [0, 1.5]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = base * ratio + beat;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain / 2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.connect(g).connect(env);
        osc.start(t);
        osc.stop(t + decay + 0.1);
      }
    }
  }
}
