import { describe, expect, it } from 'vitest';
import { CHECKS, evaluate } from './corrections';
import { Body } from './geometry';
import { POSES } from './poses';
import { STANDING, WARRIOR2_RIGHT, WARRIOR2_RIGHT_STRAIGHT_KNEE, makePoints, mirror } from './test/bodies';

const failing = (poseId: string, coords: Parameters<typeof makePoints>[0], side?: 'left' | 'right', sided = true) =>
  evaluate(poseId, new Body(makePoints(coords)), side, sided)
    .results.filter((r) => !r.ok)
    .map((r) => r.check.id);

describe('corrections', () => {
  it('only defines checks for poses that exist', () => {
    const ids = new Set(POSES.map((p) => p.id));
    for (const id of Object.keys(CHECKS)) expect(ids).toContain(id);
  });

  it('accepts a well-aligned Warrior II', () => {
    expect(failing('guerrero-2', WARRIOR2_RIGHT, 'right')).toEqual([]);
  });

  it('asks to bend the front knee when it is almost straight', () => {
    expect(failing('guerrero-2', WARRIOR2_RIGHT_STRAIGHT_KNEE, 'right')).toContain('front-knee-bent');
  });

  it('detects arms that are not level', () => {
    const coords = { ...WARRIOR2_RIGHT, leftWrist: [0.72, 0.5] as [number, number] };
    expect(failing('guerrero-2', coords, 'right')).toContain('arms-level');
  });

  it('evaluates the side the person is actually doing', () => {
    const leftVersion = mirror(WARRIOR2_RIGHT);
    // El narrador dice "derecha" pero la persona lo hace a la izquierda: no se le corrige en falso.
    const evaluation = evaluate('guerrero-2', new Body(makePoints(leftVersion)), 'right', true);
    expect(evaluation.side).toBe('left');
    expect(evaluation.results.every((r) => r.ok)).toBe(true);
  });

  it('accepts a good Mountain pose and flags a wide stance', () => {
    expect(failing('tadasana', STANDING, undefined, false)).toEqual([]);
    const wide = { ...STANDING, leftAnkle: [0.75, 0.9] as [number, number], rightAnkle: [0.25, 0.9] as [number, number] };
    expect(failing('tadasana', wide, undefined, false)).toContain('feet-width');
  });

  it('flags a foot resting on the knee in Tree pose', () => {
    // Pierna derecha elevada: el tobillo derecho a la altura de la rodilla izquierda.
    const tree = {
      ...STANDING,
      rightKnee: [0.36, 0.66] as [number, number],
      rightAnkle: [0.5, 0.72] as [number, number],
    };
    const fails = failing('vrksasana', tree, 'right');
    expect(fails).toContain('foot-not-on-knee');
    expect(fails).not.toContain('foot-lifted');
  });

  it('returns no results when the body is not visible', () => {
    expect(evaluate('guerrero-2', new Body(makePoints({})), 'right', true).results).toEqual([]);
  });
});
