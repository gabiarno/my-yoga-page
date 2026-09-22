import type { Point, Side } from './types';

/** Índices de los landmarks de MediaPipe Pose. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFoot: 31,
  rightFoot: 32,
} as const;

export type Joint = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle' | 'foot';

const JOINT_INDEX: Record<Joint, [left: number, right: number]> = {
  shoulder: [LM.leftShoulder, LM.rightShoulder],
  elbow: [LM.leftElbow, LM.rightElbow],
  wrist: [LM.leftWrist, LM.rightWrist],
  hip: [LM.leftHip, LM.rightHip],
  knee: [LM.leftKnee, LM.rightKnee],
  ankle: [LM.leftAnkle, LM.rightAnkle],
  foot: [LM.leftFoot, LM.rightFoot],
};

export const other = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** Punto sin dependencia de visibilidad, en coordenadas "cuadradas" (x corregida por el aspecto). */
export interface Vec {
  x: number;
  y: number;
}

/** Ángulo en grados en el vértice b formado por a-b-c. */
export function angle(a: Vec, b: Vec, c: Vec): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/** Inclinación de la recta a→b respecto a la horizontal, en grados [0, 90]. */
export function tiltFromHorizontal(a: Vec, b: Vec): number {
  const deg = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
  return deg > 90 ? 180 - deg : deg;
}

/** Inclinación de la recta a→b respecto a la vertical, en grados [0, 90]. */
export function tiltFromVertical(a: Vec, b: Vec): number {
  return 90 - tiltFromHorizontal(a, b);
}

export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

const MIN_VISIBILITY = 0.5;

/**
 * Acceso cómodo a los landmarks de un fotograma. Las coordenadas x se escalan por el
 * aspecto del vídeo para que los ángulos sean reales (MediaPipe normaliza x e y por
 * separado). y crece hacia abajo.
 */
export class Body {
  constructor(
    private readonly points: readonly Point[],
    private readonly aspect = 1,
  ) {}

  raw(index: number): Point {
    return this.points[index];
  }

  /** Punto por índice de landmark, o null si no se ve bien. */
  at(index: number): Vec | null {
    const p = this.points[index];
    if (!p || p.visibility < MIN_VISIBILITY) return null;
    return { x: p.x * this.aspect, y: p.y };
  }

  /** Punto de una articulación, o null si no se ve bien. */
  get(joint: Joint, side: Side): Vec | null {
    const p = this.points[JOINT_INDEX[joint][side === 'left' ? 0 : 1]];
    if (!p || p.visibility < MIN_VISIBILITY) return null;
    return { x: p.x * this.aspect, y: p.y };
  }

  /** Ángulo en la articulación central, o null si alguno de los tres puntos no se ve. */
  angle(a: [Joint, Side], b: [Joint, Side], c: [Joint, Side]): number | null {
    const pa = this.get(...a);
    const pb = this.get(...b);
    const pc = this.get(...c);
    return pa && pb && pc ? angle(pa, pb, pc) : null;
  }

  /** Ángulo de una articulación con sus vecinas naturales del mismo lado. */
  joint(joint: 'elbow' | 'knee' | 'hip' | 'shoulder', side: Side): number | null {
    switch (joint) {
      case 'elbow':
        return this.angle(['shoulder', side], ['elbow', side], ['wrist', side]);
      case 'knee':
        return this.angle(['hip', side], ['knee', side], ['ankle', side]);
      case 'hip':
        return this.angle(['shoulder', side], ['hip', side], ['knee', side]);
      case 'shoulder':
        return this.angle(['hip', side], ['shoulder', side], ['elbow', side]);
    }
  }

  midpoint(joint: Joint): Vec | null {
    const l = this.get(joint, 'left');
    const r = this.get(joint, 'right');
    return l && r ? mid(l, r) : null;
  }

  /** Lado más visible (útil cuando la persona está de perfil a la cámara). */
  nearSide(): Side {
    const score = (s: Side) =>
      (['shoulder', 'hip', 'knee', 'ankle'] as Joint[]).reduce(
        (acc, j) => acc + (this.points[JOINT_INDEX[j][s === 'left' ? 0 : 1]]?.visibility ?? 0),
        0,
      );
    return score('left') >= score('right') ? 'left' : 'right';
  }

  /** Longitud aproximada del torso (hombros a caderas), para normalizar distancias. */
  torsoLength(): number | null {
    const s = this.midpoint('shoulder');
    const h = this.midpoint('hip');
    if (s && h) return dist(s, h);
    const side = this.nearSide();
    const s1 = this.get('shoulder', side);
    const h1 = this.get('hip', side);
    return s1 && h1 ? dist(s1, h1) : null;
  }
}
