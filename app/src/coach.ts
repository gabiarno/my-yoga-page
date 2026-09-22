import { evaluate, hasChecks } from './corrections';
import { Body } from './geometry';
import type { Point, Side } from './types';

export type CoachState = 'unknown' | 'ok' | 'adjust';

export interface CoachMessage {
  kind: 'fix' | 'praise' | 'aligned';
  text: string;
  /** Lado detectado, para rellenar los marcadores del texto. */
  side: Side;
}

export interface CoachOptions {
  /** Silencio mínimo entre dos mensajes del coach. */
  cooldownMs: number;
  /** Tiempo mínimo antes de repetir la misma corrección. */
  repeatMs: number;
  /** Máximo de veces que se repite una misma corrección en una postura. */
  maxRepeats: number;
}

const PRAISE = ['¡Eso es!', 'Muy bien, así.', 'Perfecto, mantén ahí.', '¡Genial!'];
const ALIGNED = [
  'Muy bien, tu postura está bien alineada. Respira y mantén.',
  'Buena alineación. Disfruta de la postura.',
];

/**
 * Decide qué decir a partir de las evaluaciones de cada fotograma. Suaviza el resultado
 * de cada comprobación (para no reaccionar al ruido de la detección), da una única
 * corrección cada vez empezando por la más importante, felicita cuando se corrige y
 * respeta pausas entre mensajes para no saturar.
 */
export class Coach {
  private readonly opts: CoachOptions;
  private poseId = '';
  private side?: Side;
  private sided = false;
  private failRate = new Map<string, number>();
  private said = new Map<string, { count: number; at: number }>();
  private lastMessageAt = -Infinity;
  private pendingPraise: string | null = null;
  private alignedSaid = false;
  private praiseIndex = 0;
  state: CoachState = 'unknown';
  corrections = 0;

  constructor(opts: Partial<CoachOptions> = {}) {
    this.opts = { cooldownMs: 7000, repeatMs: 15000, maxRepeats: 2, ...opts };
  }

  /** Empieza a vigilar una nueva postura. `now` marca el inicio: se da un margen para colocarse. */
  reset(poseId: string, side: Side | undefined, sided: boolean, now: number): void {
    this.poseId = poseId;
    this.side = side;
    this.sided = sided;
    this.failRate.clear();
    this.said.clear();
    this.pendingPraise = null;
    this.alignedSaid = false;
    this.state = 'unknown';
    this.lastMessageAt = now - this.opts.cooldownMs + 3000;
  }

  supports(poseId: string): boolean {
    return hasChecks(poseId);
  }

  /**
   * Procesa un fotograma. Devuelve un mensaje si toca decir algo. `canSpeak` indica si el
   * narrador está libre: si no lo está, el coach sigue actualizando su estado pero calla.
   */
  update(points: Point[], aspect: number, still: boolean, now: number, canSpeak: boolean): CoachMessage | null {
    if (!hasChecks(this.poseId)) {
      this.state = 'unknown';
      return null;
    }
    const evaluation = evaluate(this.poseId, new Body(points, aspect), this.side, this.sided);
    if (evaluation.results.length === 0) {
      this.state = 'unknown';
      return null;
    }

    for (const { check, ok } of evaluation.results) {
      const prev = this.failRate.get(check.id) ?? (ok ? 0 : 1);
      this.failRate.set(check.id, prev * 0.85 + (ok ? 0 : 1) * 0.15);
    }
    const failing = evaluation.results
      .filter(({ check }) => (this.failRate.get(check.id) ?? 0) > 0.6)
      .sort((a, b) => a.check.priority - b.check.priority);
    this.state = failing.length > 0 ? 'adjust' : 'ok';

    if (this.pendingPraise && (this.failRate.get(this.pendingPraise) ?? 1) < 0.3) {
      this.pendingPraise = null;
      if (canSpeak && still) {
        this.lastMessageAt = now;
        return { kind: 'praise', text: PRAISE[this.praiseIndex++ % PRAISE.length], side: evaluation.side };
      }
    }

    if (!still || !canSpeak || now - this.lastMessageAt < this.opts.cooldownMs) return null;

    for (const { check } of failing) {
      const history = this.said.get(check.id);
      if (history && (history.count >= this.opts.maxRepeats || now - history.at < this.opts.repeatMs)) continue;
      this.said.set(check.id, { count: (history?.count ?? 0) + 1, at: now });
      this.lastMessageAt = now;
      this.pendingPraise = check.id;
      this.corrections++;
      return { kind: 'fix', text: check.fix, side: evaluation.side };
    }

    if (failing.length === 0 && !this.alignedSaid) {
      this.alignedSaid = true;
      this.lastMessageAt = now;
      return { kind: 'aligned', text: ALIGNED[this.praiseIndex++ % ALIGNED.length], side: evaluation.side };
    }
    return null;
  }
}
