import { Aborted, PausableClock } from './clock';
import type { Narrator } from './narrator';
import { fillSide, sessionDuration } from './sequencer';
import type { SessionStep } from './types';

export type Phase = 'intro' | 'enter' | 'hold' | 'outro';

export interface Tick {
  index: number;
  phase: Phase;
  /** Segundos restantes de permanencia (solo en fase "hold"). */
  holdRemaining: number;
  holdTotal: number;
  elapsed: number;
  total: number;
}

export interface SessionSummary {
  completed: boolean;
  seconds: number;
  posesDone: number;
}

export interface SessionHandlers {
  onStep(index: number, step: SessionStep, phase: Phase): void;
  onTick(tick: Tick): void;
  onEnd(summary: SessionSummary): void;
}

const RELEASE = ['Suelta despacio.', 'Muy bien. Deshaz la postura.', 'Y suelta, con calma.'];
const MIN_CUE_GAP = 12;

export class Session {
  readonly clock = new PausableClock();
  readonly total: number;
  index = 0;
  phase: Phase = 'intro';
  private holdStart = 0;
  private holdEnd = 0;
  private abortStep = false;
  private stopped = false;
  private posesDone = 0;
  private ticker: number | undefined;

  constructor(
    readonly steps: SessionStep[],
    private readonly narrator: Narrator,
    private readonly handlers: SessionHandlers,
    private readonly intro: string[],
  ) {
    this.total = sessionDuration(steps);
  }

  get paused(): boolean {
    return this.clock.paused;
  }

  get current(): SessionStep {
    return this.steps[this.index];
  }

  async run(): Promise<void> {
    this.ticker = window.setInterval(() => this.tick(), 250);
    try {
      for (const line of this.intro) await this.say(line);
    } catch (e) {
      if (!(e instanceof Aborted)) throw e;
    }

    for (this.index = 0; this.index < this.steps.length && !this.stopped; this.index++) {
      this.abortStep = false;
      try {
        await this.runStep(this.index);
        this.posesDone++;
      } catch (e) {
        if (!(e instanceof Aborted)) throw e;
      }
    }

    if (!this.stopped) {
      this.phase = 'outro';
      this.abortStep = false;
      try {
        await this.say('Empieza a mover suavemente los dedos de las manos y de los pies.');
        await this.say('Cuando quieras, gira hacia un lado y sube despacio hasta sentarte.');
        await this.say('Gracias por practicar. Namasté.');
      } catch (e) {
        if (!(e instanceof Aborted)) throw e;
      }
    }
    window.clearInterval(this.ticker);
    this.handlers.onEnd({
      completed: !this.stopped,
      seconds: Math.round(this.clock.now() / 1000),
      posesDone: this.posesDone,
    });
  }

  pause(): void {
    this.clock.pause();
    this.narrator.pause();
    this.tick();
  }

  resume(): void {
    this.clock.resume();
    this.narrator.resume();
  }

  /** Pasa a la siguiente postura. */
  skip(): void {
    if (this.paused) this.resume();
    this.abortStep = true;
    this.narrator.stop();
  }

  stop(): void {
    this.stopped = true;
    this.skip();
  }

  private isAborted = () => this.abortStep || this.stopped;

  private async say(text: string): Promise<void> {
    if (this.isAborted()) throw new Aborted();
    await this.narrator.say(text);
    if (this.isAborted()) throw new Aborted();
  }

  private async runStep(i: number): Promise<void> {
    const step = this.steps[i];
    const prev = this.steps[i - 1];
    const next = this.steps[i + 1];
    const { pose, side } = step;

    this.phase = 'enter';
    this.handlers.onStep(i, step, 'enter');
    const sideChange = prev?.pose.id === pose.id && prev.side !== step.side;
    const lines = sideChange ? ['Cambiamos de lado.', ...pose.enter] : [`${pose.name}.`, ...pose.enter];
    for (const line of lines) await this.say(fillSide(line, side));

    this.phase = 'hold';
    this.holdStart = this.clock.now();
    this.holdEnd = this.holdStart + step.hold * 1000;
    this.handlers.onStep(i, step, 'hold');

    // Indicaciones repartidas durante la permanencia, sin saturar las posturas cortas.
    const count = Math.min(pose.cues.length, Math.floor(step.hold / MIN_CUE_GAP));
    for (let k = 0; k < count; k++) {
      await this.clock.waitUntil(this.holdStart + (step.hold * 1000 * (k + 1)) / (count + 1), this.isAborted);
      await this.say(fillSide(pose.cues[k], side));
    }
    await this.clock.waitUntil(this.holdEnd, this.isAborted);

    const changingSide = next?.pose.id === pose.id;
    if (next && !changingSide) await this.say(RELEASE[i % RELEASE.length]);
  }

  private tick(): void {
    const step = this.current;
    const holdTotal = step?.hold ?? 0;
    const holdRemaining =
      this.phase === 'hold' ? Math.max(0, Math.ceil((this.holdEnd - this.clock.now()) / 1000)) : holdTotal;
    this.handlers.onTick({
      index: this.index,
      phase: this.phase,
      holdRemaining,
      holdTotal,
      elapsed: this.clock.now() / 1000,
      total: this.total,
    });
  }
}
