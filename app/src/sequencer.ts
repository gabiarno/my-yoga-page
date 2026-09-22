import { POSES } from './poses';
import type { Block, PoseDef, SessionOptions, SessionStep, Side } from './types';

/** Peso de cada bloque sobre la duración total de la clase. */
const BLOCK_WEIGHTS: [Block, number][] = [
  ['centering', 0.1],
  ['warmup', 0.15],
  ['standing', 0.3],
  ['balance', 0.15],
  ['floor', 0.15],
  ['relax', 0.15],
];

const MIN_HOLD_FACTOR = 0.7;
const MAX_HOLD_FACTOR = 2.5;
/** A partir de este alargamiento de las permanencias, mejor repetir la secuencia. */
const REPEAT_FACTOR = 1.8;
const MIN_SAVASANA = 60;

/** Sustituye los marcadores de lado ({pie}, {otro}, {pierna}, {otra}). */
export function fillSide(text: string, side?: Side): string {
  if (!side) return text;
  const right = side === 'right';
  return text
    .replaceAll('{pie}', right ? 'derecho' : 'izquierdo')
    .replaceAll('{otro}', right ? 'izquierdo' : 'derecho')
    .replaceAll('{pierna}', right ? 'derecha' : 'izquierda')
    .replaceAll('{otra}', right ? 'izquierda' : 'derecha');
}

/** Estimación de lo que tarda el narrador en decir un texto, en segundos. */
export function estimateSpeech(lines: string[]): number {
  return lines.reduce((acc, line) => acc + line.split(/\s+/).length / 2.5 + 0.8, 0);
}

/** Duración total estimada de un paso (narración de entrada + permanencia). */
export function stepDuration(step: SessionStep): number {
  return estimateSpeech(step.pose.enter) + step.hold;
}

const roundTo5 = (s: number) => Math.max(5, Math.round(s / 5) * 5);

function poseCost(pose: PoseDef, holdFactor: number): number {
  const once = estimateSpeech(pose.enter) + pose.hold * holdFactor;
  return pose.sided ? once * 2 : once;
}

function expand(pose: PoseDef, hold: number): SessionStep[] {
  return pose.sided
    ? [
        { pose, side: 'right', hold },
        { pose, side: 'left', hold },
      ]
    : [{ pose, hold }];
}

/**
 * Rellena el presupuesto de un bloque: añade las posturas en orden mientras quepan y
 * alarga las permanencias para ajustarse al tiempo. Solo repite la secuencia si aun así
 * sobra mucho tiempo (y el bloque tiene variedad suficiente).
 */
function fillBlock(candidates: PoseDef[], budget: number): SessionStep[] {
  const chosen: PoseDef[] = [];
  let used = 0;
  const addRound = () => {
    for (const pose of candidates) {
      const cost = poseCost(pose, MIN_HOLD_FACTOR);
      if (used + cost <= budget) {
        chosen.push(pose);
        used += cost;
      }
    }
  };
  const factorFor = () => {
    const speech = chosen.reduce((a, p) => a + (p.sided ? 2 : 1) * estimateSpeech(p.enter), 0);
    const baseHold = chosen.reduce((a, p) => a + (p.sided ? 2 : 1) * p.hold, 0);
    return (budget - speech) / baseHold;
  };

  addRound();
  if (chosen.length === 0 && candidates.length > 0) chosen.push(candidates[0]);
  if (candidates.length >= 3 && factorFor() > REPEAT_FACTOR) addRound();

  const factor = Math.min(MAX_HOLD_FACTOR, Math.max(MIN_HOLD_FACTOR, factorFor()));
  return chosen.flatMap((p) => expand(p, roundTo5(p.hold * factor)));
}

export function buildSession(options: SessionOptions, library: PoseDef[] = POSES): SessionStep[] {
  const total = options.minutes * 60;
  const allowed = library.filter(
    (p) => p.level <= options.level && !(p.avoid ?? []).some((c) => options.avoid.includes(c)),
  );
  const byBlock = (block: Block) => allowed.filter((p) => p.block === block);

  // Los bloques sin posturas disponibles ceden su tiempo al resto.
  const active = BLOCK_WEIGHTS.filter(([block]) => byBlock(block).length > 0);
  const weightSum = active.reduce((a, [, w]) => a + w, 0);

  const steps: SessionStep[] = [];
  // El tiempo que un bloque no puede aprovechar pasa al siguiente.
  let carry = 0;
  for (const [block, weight] of active) {
    if (block === 'relax') continue;
    const budget = (total * weight) / weightSum + carry;
    const blockSteps = fillBlock(byBlock(block), budget);
    steps.push(...blockSteps);
    carry = budget - blockSteps.reduce((a, s) => a + stepDuration(s), 0);
  }

  // La relajación final absorbe lo que quede para cuadrar la duración total.
  const savasana = byBlock('relax')[0];
  if (savasana) {
    const used = steps.reduce((a, s) => a + stepDuration(s), 0);
    const remaining = total - used - estimateSpeech(savasana.enter);
    steps.push({ pose: savasana, hold: roundTo5(Math.max(MIN_SAVASANA, remaining)) });
  }
  return steps;
}

export function sessionDuration(steps: SessionStep[]): number {
  return steps.reduce((a, s) => a + stepDuration(s), 0);
}
