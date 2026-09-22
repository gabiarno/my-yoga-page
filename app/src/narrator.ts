import { estimateSpeech } from './sequencer';

interface Pending {
  text: string;
  resolve: () => void;
}

/**
 * Narrador con la síntesis de voz del navegador. Habla frases de una en una (en cola),
 * permite pausar y reanudar (repitiendo la frase interrumpida) y avisa cuando empieza y
 * termina de hablar para poder bajar la música.
 */
export class Narrator {
  private queue: Pending[] = [];
  private current: Pending | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private fallbackTimer: number | undefined;
  private paused = false;
  voice: SpeechSynthesisVoice | null = null;
  rate = 0.9;
  volume = 1;
  onSpeakingChange: (speaking: boolean) => void = () => {};
  onText: (text: string) => void = () => {};

  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /** Voces en español disponibles (se cargan de forma asíncrona en algunos navegadores). */
  async voices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.supported) return [];
    const pick = () => speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
    if (speechSynthesis.getVoices().length > 0) return pick();
    return new Promise((resolve) => {
      const done = () => resolve(pick());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }

  /** Elige la voz guardada o, si no, la mejor en español (preferencia por es-ES y voces "naturales"). */
  async selectVoice(uri?: string): Promise<void> {
    const voices = await this.voices();
    const rank = (v: SpeechSynthesisVoice) =>
      (v.lang === 'es-ES' ? 4 : 0) + (/natural|neural|google|premium|enhanced/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    this.voice = voices.find((v) => v.voiceURI === uri) ?? [...voices].sort((a, b) => rank(b) - rank(a))[0] ?? null;
  }

  get speaking(): boolean {
    return this.current !== null || this.queue.length > 0;
  }

  /** Añade una frase a la cola. La promesa se resuelve cuando termina de decirse (o se detiene). */
  say(text: string): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ text, resolve });
      if (!this.current && !this.paused) this.next();
    });
  }

  /** Dice la frase solo si el narrador está libre. Devuelve si la ha dicho. */
  sayIfIdle(text: string): boolean {
    if (this.speaking || this.paused) return false;
    void this.say(text);
    return true;
  }

  pause(): void {
    this.paused = true;
    this.interruptCurrent();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.current) this.speak(this.current);
    else this.next();
  }

  /** Corta todo y resuelve las frases pendientes. */
  stop(): void {
    this.interruptCurrent();
    const pending = [...(this.current ? [this.current] : []), ...this.queue];
    this.current = null;
    this.queue = [];
    this.paused = false;
    pending.forEach((p) => p.resolve());
    this.onSpeakingChange(false);
  }

  private interruptCurrent(): void {
    window.clearTimeout(this.fallbackTimer);
    this.utterance = null;
    if (this.supported) speechSynthesis.cancel();
  }

  private next(): void {
    const item = this.queue.shift();
    if (!item) {
      this.current = null;
      this.onSpeakingChange(false);
      return;
    }
    this.current = item;
    this.onSpeakingChange(true);
    this.speak(item);
  }

  private finish(item: Pending): void {
    if (this.current !== item) return;
    window.clearTimeout(this.fallbackTimer);
    this.utterance = null;
    this.current = null;
    item.resolve();
    if (!this.paused) this.next();
  }

  private speak(item: Pending): void {
    this.onText(item.text);
    // Red de seguridad: algunos navegadores no disparan "end" de forma fiable.
    const expected = (estimateSpeech([item.text]) / this.rate) * 1000;
    this.fallbackTimer = window.setTimeout(() => this.finish(item), expected * 2 + 4000);

    if (!this.supported) {
      // Sin voz: se muestran los subtítulos durante el tiempo estimado.
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = window.setTimeout(() => this.finish(item), expected);
      return;
    }
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = this.voice?.lang ?? 'es-ES';
    if (this.voice) u.voice = this.voice;
    u.rate = this.rate;
    u.volume = this.volume;
    u.onend = u.onerror = () => {
      if (this.utterance === u) this.finish(item);
    };
    this.utterance = u;
    speechSynthesis.speak(u);
  }
}
