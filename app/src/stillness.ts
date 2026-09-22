import { Body, LM } from './geometry';
import type { Point } from './types';

const TRACKED = [
  LM.leftShoulder, LM.rightShoulder, LM.leftElbow, LM.rightElbow, LM.leftWrist, LM.rightWrist,
  LM.leftHip, LM.rightHip, LM.leftKnee, LM.rightKnee, LM.leftAnkle, LM.rightAnkle,
];

export interface StillnessOptions {
  /** Velocidad media máxima, en longitudes de torso por segundo, para considerarse quieto. */
  maxSpeed: number;
  /** Tiempo que hay que mantenerse por debajo de ese umbral. */
  holdMs: number;
}

/**
 * Detecta cuándo la persona ha dejado de moverse: mide la velocidad media de las
 * articulaciones principales (normalizada por el tamaño del torso, para que no dependa
 * de la distancia a la cámara), la suaviza y exige que se mantenga baja un rato.
 */
export class StillnessDetector {
  private prev: { points: Point[]; t: number } | null = null;
  private speed = Infinity;
  private stillSince: number | null = null;
  private readonly opts: StillnessOptions;

  constructor(opts: Partial<StillnessOptions> = {}) {
    this.opts = { maxSpeed: 0.35, holdMs: 1500, ...opts };
  }

  reset(): void {
    this.prev = null;
    this.speed = Infinity;
    this.stillSince = null;
  }

  /** Velocidad suavizada actual (torsos/segundo). */
  get currentSpeed(): number {
    return this.speed;
  }

  update(points: Point[], aspect: number, now: number): boolean {
    const torso = new Body(points, aspect).torsoLength();
    const prev = this.prev;
    this.prev = { points, t: now };
    if (!prev || !torso) return this.isStill(now);

    const dt = (now - prev.t) / 1000;
    if (dt <= 0 || dt > 1) {
      this.stillSince = null;
      return false;
    }

    let total = 0;
    let n = 0;
    for (const i of TRACKED) {
      const a = points[i];
      const b = prev.points[i];
      if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) continue;
      total += Math.hypot((a.x - b.x) * aspect, a.y - b.y);
      n++;
    }
    if (n < 4) {
      this.stillSince = null;
      return false;
    }

    const instant = total / n / torso / dt;
    this.speed = this.speed === Infinity ? instant : this.speed * 0.8 + instant * 0.2;

    if (this.speed < this.opts.maxSpeed) this.stillSince ??= now;
    else this.stillSince = null;
    return this.isStill(now);
  }

  private isStill(now: number): boolean {
    return this.stillSince !== null && now - this.stillSince >= this.opts.holdMs;
  }
}
