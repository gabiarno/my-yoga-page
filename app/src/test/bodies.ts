import { LM } from '../geometry';
import type { Point } from '../types';

type Coords = Partial<Record<keyof typeof LM, [number, number]>>;

/** Crea un fotograma de 33 landmarks: los indicados, visibles; el resto, invisibles. */
export function makePoints(coords: Coords): Point[] {
  const points: Point[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  for (const [name, xy] of Object.entries(coords)) {
    const [x, y] = xy as [number, number];
    points[LM[name as keyof typeof LM]] = { x, y, visibility: 0.99 };
  }
  return points;
}

/**
 * De pie, de frente a la cámara. Coordenadas de imagen sin espejar: el lado izquierdo de
 * la persona aparece a la derecha de la imagen (x mayor).
 */
export const STANDING: Coords = {
  nose: [0.5, 0.2],
  leftShoulder: [0.55, 0.32],
  rightShoulder: [0.45, 0.32],
  leftElbow: [0.56, 0.44],
  rightElbow: [0.44, 0.44],
  leftWrist: [0.57, 0.55],
  rightWrist: [0.43, 0.55],
  leftHip: [0.54, 0.55],
  rightHip: [0.46, 0.55],
  leftKnee: [0.54, 0.72],
  rightKnee: [0.46, 0.72],
  leftAnkle: [0.54, 0.9],
  rightAnkle: [0.46, 0.9],
};

/** Guerrero II bien hecho con la pierna derecha delante (a la izquierda de la imagen). */
export const WARRIOR2_RIGHT: Coords = {
  nose: [0.5, 0.22],
  leftShoulder: [0.55, 0.35],
  rightShoulder: [0.45, 0.35],
  leftElbow: [0.65, 0.35],
  rightElbow: [0.35, 0.35],
  leftWrist: [0.75, 0.35],
  rightWrist: [0.25, 0.35],
  leftHip: [0.54, 0.55],
  rightHip: [0.46, 0.55],
  rightKnee: [0.3, 0.56],
  rightAnkle: [0.3, 0.85],
  leftKnee: [0.62, 0.7],
  leftAnkle: [0.7, 0.85],
};

/** El mismo Guerrero II pero con la rodilla delantera casi estirada. */
export const WARRIOR2_RIGHT_STRAIGHT_KNEE: Coords = {
  ...WARRIOR2_RIGHT,
  rightKnee: [0.38, 0.7],
};

/** Imagen especular: Guerrero II con la pierna izquierda delante. */
export function mirror(coords: Coords): Coords {
  const swap = (name: string) =>
    name.startsWith('left') ? name.replace('left', 'right') : name.startsWith('right') ? name.replace('right', 'left') : name;
  return Object.fromEntries(
    Object.entries(coords).map(([name, xy]) => [swap(name), [1 - (xy as number[])[0], (xy as number[])[1]]]),
  ) as Coords;
}
