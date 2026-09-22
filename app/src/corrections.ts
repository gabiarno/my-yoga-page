import { Body, LM, angle, dist, other, tiltFromHorizontal, tiltFromVertical, type Vec } from './geometry';
import type { Side } from './types';

/**
 * Una comprobación de alineación. `test` devuelve true si está bien, false si hay que
 * corregir y null si no se puede evaluar (puntos no visibles, ángulo de cámara...).
 * `side` es el lado que trabaja en posturas asimétricas; en las simétricas vistas de
 * perfil es el lado más cercano a la cámara.
 */
export interface Check {
  id: string;
  /** Menor número = más importante. */
  priority: number;
  test(b: Body, side: Side): boolean | null;
  /** Texto de corrección. Admite los marcadores de lado de fillSide(). */
  fix: string;
}

export interface CheckResult {
  check: Check;
  ok: boolean;
}

export interface Evaluation {
  side: Side;
  results: CheckResult[];
}

// ── Utilidades ──────────────────────────────────────────────

const all = (...values: unknown[]): boolean => values.every((v) => v !== null);

/** Dirección horizontal (+1/-1) desde el pie de atrás hacia el pie de delante. */
function frontDirection(b: Body, front: Side): number | null {
  const fa = b.get('ankle', front);
  const ba = b.get('ankle', other(front));
  return fa && ba ? Math.sign(fa.x - ba.x) || 1 : null;
}

function shoulders(b: Body, side: Side): Vec | null {
  return b.midpoint('shoulder') ?? b.get('shoulder', side);
}

function hips(b: Body, side: Side): Vec | null {
  return b.midpoint('hip') ?? b.get('hip', side);
}

const bent = (maxAngle: number) => (a: number | null) => (a === null ? null : a <= maxAngle);
const straight = (minAngle: number) => (a: number | null) => (a === null ? null : a >= minAngle);

// ── Comprobaciones reutilizables ───────────────────────────

const frontKneeBent = (max: number, fix: string): Check => ({
  id: 'front-knee-bent',
  priority: 1,
  test: (b, s) => bent(max)(b.joint('knee', s)),
  fix,
});

const backLegStraight: Check = {
  id: 'back-leg-straight',
  priority: 3,
  test: (b, s) => straight(155)(b.joint('knee', other(s))),
  fix: 'Estira la pierna de atrás y presiona el borde externo del pie.',
};

const frontKneeNotPastAnkle = (fix: string): Check => ({
  id: 'front-knee-over-ankle',
  priority: 2,
  test: (b, s) => {
    const knee = b.get('knee', s);
    const ankle = b.get('ankle', s);
    const dir = frontDirection(b, s);
    const torso = b.torsoLength();
    if (!all(knee, ankle, dir, torso)) return null;
    return (knee!.x - ankle!.x) * dir! < 0.3 * torso!;
  },
  fix,
});

const armsOverhead: Check = {
  id: 'arms-overhead',
  priority: 4,
  test: (b, s) => {
    const side = b.get('wrist', s) ? s : b.nearSide();
    const wrist = b.get('wrist', side);
    const shoulder = b.get('shoulder', side);
    const torso = b.torsoLength();
    if (!all(wrist, shoulder, torso)) return null;
    return shoulder!.y - wrist!.y > 0.6 * torso!;
  },
  fix: 'Sube los brazos junto a las orejas, estirándolos hacia el cielo.',
};

// ── Posturas ────────────────────────────────────────────────

export const CHECKS: Record<string, Check[]> = {
  tadasana: [
    {
      id: 'legs-straight',
      priority: 2,
      test: (b) => {
        const l = b.joint('knee', 'left');
        const r = b.joint('knee', 'right');
        return l === null || r === null ? null : Math.min(l, r) >= 160;
      },
      fix: 'Estira las piernas, sin bloquear las rodillas.',
    },
    {
      id: 'shoulders-level',
      priority: 3,
      test: (b) => {
        const l = b.get('shoulder', 'left');
        const r = b.get('shoulder', 'right');
        return l && r ? tiltFromHorizontal(l, r) < 6 : null;
      },
      fix: 'Nivela los hombros: relaja el que está más alto.',
    },
    {
      id: 'feet-width',
      priority: 4,
      test: (b) => {
        const la = b.get('ankle', 'left');
        const ra = b.get('ankle', 'right');
        const lh = b.get('hip', 'left');
        const rh = b.get('hip', 'right');
        if (!all(la, ra, lh, rh)) return null;
        return dist(la!, ra!) <= 2 * dist(lh!, rh!);
      },
      fix: 'Acerca los pies, más o menos a la anchura de las caderas.',
    },
    {
      id: 'head-centered',
      priority: 5,
      test: (b) => {
        const nose = b.at(LM.nose);
        const hip = b.midpoint('hip');
        const torso = b.torsoLength();
        if (!all(nose, hip, torso)) return null;
        return Math.abs(nose!.x - hip!.x) < 0.25 * torso!;
      },
      fix: 'Centra la cabeza sobre la pelvis y reparte el peso entre los dos pies.',
    },
  ],

  utkatasana: [
    {
      id: 'knees-bent',
      priority: 1,
      test: (b) => bent(145)(b.joint('knee', b.nearSide())),
      fix: 'Baja más la cadera, como si te sentaras en una silla.',
    },
    {
      id: 'knees-behind-toes',
      priority: 2,
      test: (b) => {
        const s = b.nearSide();
        const knee = b.get('knee', s);
        const ankle = b.get('ankle', s);
        const foot = b.get('foot', s);
        const torso = b.torsoLength();
        if (!all(knee, ankle, foot, torso)) return null;
        const facing = Math.sign(foot!.x - ankle!.x) || 1;
        return (knee!.x - foot!.x) * facing < 0.1 * torso!;
      },
      fix: 'Lleva el peso a los talones: que las rodillas no pasen de la punta de los pies.',
    },
    {
      id: 'chest-up',
      priority: 3,
      test: (b) => {
        const s = b.nearSide();
        const sh = b.get('shoulder', s);
        const hip = b.get('hip', s);
        return sh && hip ? tiltFromVertical(hip, sh) < 50 : null;
      },
      fix: 'Levanta el pecho y alarga la espalda.',
    },
    { ...armsOverhead, priority: 4 },
  ],

  'guerrero-1': [
    frontKneeBent(125, 'Flexiona más la rodilla {pierna}, buscando un ángulo recto.'),
    frontKneeNotPastAnkle('Tu rodilla delantera se pasa del tobillo: alarga un poco el paso.'),
    backLegStraight,
    {
      id: 'torso-upright',
      priority: 4,
      test: (b, s) => {
        const sh = shoulders(b, s);
        const hip = hips(b, s);
        return sh && hip ? tiltFromVertical(hip, sh) < 20 : null;
      },
      fix: 'Mantén el torso vertical, sin inclinarte hacia delante.',
    },
    { ...armsOverhead, priority: 5 },
  ],

  'guerrero-2': [
    frontKneeBent(120, 'Flexiona más la rodilla {pierna}, hacia los noventa grados.'),
    frontKneeNotPastAnkle('La rodilla delantera se pasa del tobillo: abre un poco más las piernas.'),
    {
      id: 'front-knee-out',
      priority: 2,
      test: (b, s) => {
        const knee = b.get('knee', s);
        const ankle = b.get('ankle', s);
        const dir = frontDirection(b, s);
        const torso = b.torsoLength();
        if (!all(knee, ankle, dir, torso)) return null;
        return (ankle!.x - knee!.x) * dir! < 0.25 * torso!;
      },
      fix: 'Lleva la rodilla {pierna} hacia fuera, alineada sobre el tobillo.',
    },
    backLegStraight,
    {
      id: 'arms-level',
      priority: 4,
      test: (b) => {
        const tilts = (['left', 'right'] as Side[]).map((s) => {
          const sh = b.get('shoulder', s);
          const wr = b.get('wrist', s);
          return sh && wr ? tiltFromHorizontal(sh, wr) : null;
        });
        return tilts.includes(null) ? null : Math.max(...(tilts as number[])) < 15;
      },
      fix: 'Brazos a la altura de los hombros, paralelos al suelo.',
    },
    {
      id: 'arms-straight',
      priority: 5,
      test: (b) => {
        const l = b.joint('elbow', 'left');
        const r = b.joint('elbow', 'right');
        return l === null || r === null ? null : Math.min(l, r) >= 150;
      },
      fix: 'Estira los brazos de punta a punta de los dedos.',
    },
    {
      id: 'torso-vertical',
      priority: 3,
      test: (b, s) => {
        const sh = shoulders(b, s);
        const hip = hips(b, s);
        return sh && hip ? tiltFromVertical(hip, sh) < 12 : null;
      },
      fix: 'Mantén el torso vertical: no te inclines hacia la pierna delantera.',
    },
  ],

  trikonasana: [
    {
      id: 'front-leg-straight',
      priority: 1,
      test: (b, s) => straight(155)(b.joint('knee', s)),
      fix: 'Estira la pierna {pierna}, sin bloquear la rodilla.',
    },
    backLegStraight,
    {
      id: 'torso-lateral',
      priority: 2,
      test: (b, s) => {
        const sh = b.midpoint('shoulder');
        const hip = b.midpoint('hip');
        const dir = frontDirection(b, s);
        if (!all(sh, hip, dir)) return null;
        return tiltFromVertical(hip!, sh!) > 35 && (sh!.x - hip!.x) * dir! > 0;
      },
      fix: 'Alarga más el tronco hacia el lado {pie}, como si alguien tirara de tu mano.',
    },
    {
      id: 'arms-vertical',
      priority: 3,
      test: (b) => {
        const l = b.get('wrist', 'left');
        const r = b.get('wrist', 'right');
        return l && r ? tiltFromVertical(l, r) < 20 : null;
      },
      fix: 'Alinea los brazos en una línea vertical: uno hacia el suelo y otro hacia el cielo.',
    },
    {
      id: 'top-arm-straight',
      priority: 4,
      test: (b, s) => straight(150)(b.joint('elbow', other(s))),
      fix: 'Estira el brazo de arriba hacia el cielo.',
    },
  ],

  vrksasana: [
    {
      id: 'foot-lifted',
      priority: 1,
      test: (b, s) => {
        const lifted = b.get('ankle', s);
        const standing = b.get('ankle', other(s));
        const torso = b.torsoLength();
        if (!all(lifted, standing, torso)) return null;
        return standing!.y - lifted!.y > 0.2 * torso!;
      },
      fix: 'Levanta el pie {pie} y apoya la planta en la otra pierna.',
    },
    {
      id: 'standing-leg-straight',
      priority: 2,
      test: (b, s) => straight(165)(b.joint('knee', other(s))),
      fix: 'Estira la pierna de apoyo, sin bloquear la rodilla.',
    },
    {
      id: 'foot-not-on-knee',
      priority: 2,
      test: (b, s) => {
        const lifted = b.get('ankle', s);
        const knee = b.get('knee', other(s));
        const torso = b.torsoLength();
        if (!all(lifted, knee, torso)) return null;
        return Math.abs(lifted!.y - knee!.y) > 0.12 * torso!;
      },
      fix: 'Evita apoyar el pie sobre la rodilla: colócalo por encima o por debajo.',
    },
    {
      id: 'knee-open',
      priority: 3,
      test: (b, s) => {
        const knee = b.get('knee', s);
        const hip = b.get('hip', s);
        const torso = b.torsoLength();
        if (!all(knee, hip, torso)) return null;
        return Math.abs(knee!.x - hip!.x) > 0.3 * torso!;
      },
      fix: 'Abre la rodilla {pierna} hacia el lado.',
    },
    {
      id: 'hips-level',
      priority: 4,
      test: (b) => {
        const l = b.get('hip', 'left');
        const r = b.get('hip', 'right');
        return l && r ? tiltFromHorizontal(l, r) < 8 : null;
      },
      fix: 'Nivela las caderas, sin dejar caer ninguna.',
    },
    {
      id: 'torso-upright',
      priority: 5,
      test: (b, s) => {
        const sh = shoulders(b, s);
        const hip = hips(b, s);
        return sh && hip ? tiltFromVertical(hip, sh) < 10 : null;
      },
      fix: 'Crece hacia arriba, con el torso recto sobre la pierna de apoyo.',
    },
  ],

  'guerrero-3': [
    {
      id: 'standing-leg-straight',
      priority: 3,
      test: (b, s) => straight(155)(b.joint('knee', other(s))),
      fix: 'Estira la pierna de apoyo, sin bloquearla.',
    },
    {
      id: 'leg-lifted',
      priority: 1,
      test: (b, s) => {
        const hip = b.get('hip', s);
        const ankle = b.get('ankle', s);
        if (!all(hip, ankle)) return null;
        return ankle!.y <= hip!.y || tiltFromHorizontal(hip!, ankle!) < 20;
      },
      fix: 'Sube la pierna {pierna} hasta la altura de la cadera.',
    },
    {
      id: 'torso-horizontal',
      priority: 2,
      test: (b, s) => {
        const sh = shoulders(b, s);
        const hip = hips(b, s);
        return sh && hip ? tiltFromHorizontal(hip, sh) < 25 : null;
      },
      fix: 'Baja el pecho hasta que el torso quede paralelo al suelo.',
    },
    {
      id: 'straight-line',
      priority: 4,
      test: (b, s) => {
        const sh = shoulders(b, s);
        const hip = b.get('hip', s);
        const ankle = b.get('ankle', s);
        if (!all(sh, hip, ankle)) return null;
        return angle(sh!, hip!, ankle!) >= 155;
      },
      fix: 'Forma una línea recta desde la cabeza hasta el talón.',
    },
  ],

  'perro-abajo': [
    {
      id: 'hips-high',
      priority: 1,
      test: (b) => {
        const s = b.nearSide();
        const hip = b.get('hip', s);
        const sh = b.get('shoulder', s);
        const ankle = b.get('ankle', s);
        if (!all(hip, sh, ankle)) return null;
        return hip!.y < sh!.y && hip!.y < ankle!.y;
      },
      fix: 'Eleva la cadera hacia el techo.',
    },
    {
      id: 'arms-straight',
      priority: 2,
      test: (b) => straight(155)(b.joint('elbow', b.nearSide())),
      fix: 'Estira los brazos y empuja el suelo con las manos.',
    },
    {
      id: 'back-long',
      priority: 3,
      test: (b) => {
        const s = b.nearSide();
        return straight(150)(b.angle(['hip', s], ['shoulder', s], ['wrist', s]));
      },
      fix: 'Lleva el pecho hacia los muslos para alargar la espalda.',
    },
    {
      id: 'legs-long',
      priority: 5,
      test: (b) => straight(150)(b.joint('knee', b.nearSide())),
      fix: 'Si puedes, estira un poco más las piernas. Si no, flexiónalas sin redondear la espalda.',
    },
  ],

  setu: [
    {
      id: 'hips-up',
      priority: 1,
      test: (b) => straight(145)(b.joint('hip', b.nearSide())),
      fix: 'Eleva más la cadera, empujando con los pies.',
    },
    {
      id: 'heels-close',
      priority: 2,
      test: (b) => bent(115)(b.joint('knee', b.nearSide())),
      fix: 'Acerca un poco los talones a los glúteos.',
    },
    {
      id: 'heels-not-too-close',
      priority: 3,
      test: (b) => {
        const a = b.joint('knee', b.nearSide());
        return a === null ? null : a >= 60;
      },
      fix: 'Aleja un poco los pies de los glúteos.',
    },
  ],

  bhujangasana: [
    {
      id: 'chest-lifted',
      priority: 1,
      test: (b) => {
        const s = b.nearSide();
        const sh = b.get('shoulder', s);
        const hip = b.get('hip', s);
        const torso = b.torsoLength();
        if (!all(sh, hip, torso)) return null;
        return hip!.y - sh!.y > 0.3 * torso!;
      },
      fix: 'Al inhalar, eleva un poco más el pecho.',
    },
    {
      id: 'elbows-soft',
      priority: 2,
      test: (b) => {
        const a = b.joint('elbow', b.nearSide());
        return a === null ? null : a <= 170;
      },
      fix: 'Flexiona un poco los codos y usa la fuerza de la espalda, no de los brazos.',
    },
  ],
};

export const hasChecks = (poseId: string): boolean => poseId in CHECKS;

function run(checks: Check[], b: Body, side: Side): CheckResult[] {
  const results: CheckResult[] = [];
  for (const check of checks) {
    const ok = check.test(b, side);
    if (ok !== null) results.push({ check, ok });
  }
  return results;
}

const score = (r: CheckResult[]) => r.filter((x) => x.ok).length;

/**
 * Evalúa la postura. En las asimétricas prueba ambos lados y se queda con el que mejor
 * encaja, por si la persona ha empezado por el otro lado: así no se le corrige en falso.
 */
export function evaluate(poseId: string, b: Body, side: Side | undefined, sided: boolean): Evaluation {
  const checks = CHECKS[poseId] ?? [];
  const main: Side = side ?? b.nearSide();
  const results = run(checks, b, main);
  if (!sided) return { side: main, results };
  const alt = run(checks, b, other(main));
  return score(alt) > score(results) ? { side: other(main), results: alt } : { side: main, results };
}
