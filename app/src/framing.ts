import { LM } from './geometry';
import type { Point } from './types';

export interface FramingResult {
  ok: boolean;
  message: string;
}

const visible = (p?: Point) => !!p && p.visibility >= 0.5;

/**
 * Comprueba que el cuerpo entero se ve bien en el encuadre (de pie, al inicio de la clase).
 * Las coordenadas son las de la imagen sin espejar: x pequeña = izquierda de la imagen,
 * que es la derecha de la persona.
 */
export function assessFraming(points: Point[] | null): FramingResult {
  if (!points || !visible(points[LM.leftShoulder]) || !visible(points[LM.rightShoulder])) {
    return { ok: false, message: 'No te veo bien. Colócate frente a la cámara.' };
  }
  if (!visible(points[LM.leftHip]) || !visible(points[LM.rightHip])) {
    return { ok: false, message: 'Aléjate de la cámara: necesito verte de cuerpo entero.' };
  }
  if (!visible(points[LM.leftAnkle]) || !visible(points[LM.rightAnkle])) {
    return { ok: false, message: 'Aléjate un poco más: necesito ver tus pies.' };
  }

  const nose = points[LM.nose];
  if (visible(nose) && nose.y < 0.04) {
    return { ok: false, message: 'Aléjate un poco: se corta tu cabeza.' };
  }

  const centerX = (points[LM.leftHip].x + points[LM.rightHip].x) / 2;
  if (centerX < 0.25) return { ok: false, message: 'Muévete un poco hacia tu izquierda.' };
  if (centerX > 0.75) return { ok: false, message: 'Muévete un poco hacia tu derecha.' };

  const top = visible(nose) ? nose.y : Math.min(points[LM.leftShoulder].y, points[LM.rightShoulder].y);
  const bottom = Math.max(points[LM.leftAnkle].y, points[LM.rightAnkle].y);
  if (bottom - top < 0.4) {
    return { ok: false, message: 'Acércate un poco a la cámara.' };
  }
  return { ok: true, message: '¡Perfecto! Te veo de cuerpo entero.' };
}
