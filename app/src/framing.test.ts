import { describe, expect, it } from 'vitest';
import { assessFraming } from './framing';
import { STANDING, makePoints } from './test/bodies';

describe('assessFraming', () => {
  it('asks the person to get in front of the camera when nobody is detected', () => {
    expect(assessFraming(null).ok).toBe(false);
  });

  it('accepts a full body in the centre', () => {
    expect(assessFraming(makePoints(STANDING))).toEqual({ ok: true, message: expect.any(String) });
  });

  it('asks to step back when the feet are not visible', () => {
    const { leftAnkle, rightAnkle, ...noFeet } = STANDING;
    expect(assessFraming(makePoints(noFeet)).message).toMatch(/pies/);
  });

  it('guides sideways movement from the person’s point of view', () => {
    // Caderas a la izquierda de la imagen = la persona está desplazada hacia su derecha.
    const left = Object.fromEntries(Object.entries(STANDING).map(([k, [x, y]]) => [k, [x - 0.35, y]]));
    expect(assessFraming(makePoints(left)).message).toMatch(/izquierda/);
  });
});
