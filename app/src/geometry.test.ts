import { describe, expect, it } from 'vitest';
import { Body, angle, tiltFromHorizontal, tiltFromVertical } from './geometry';
import { STANDING, makePoints } from './test/bodies';

describe('geometry', () => {
  it('computes joint angles', () => {
    expect(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(angle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180);
  });

  it('computes tilts', () => {
    expect(tiltFromHorizontal({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(tiltFromHorizontal({ x: 1, y: 0 }, { x: 0, y: 0.0001 })).toBeCloseTo(0, 1);
    expect(tiltFromVertical({ x: 0, y: 1 }, { x: 0, y: 0 })).toBeCloseTo(0);
    expect(tiltFromVertical({ x: 0, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(45);
  });

  it('corrects x by the aspect ratio', () => {
    // En un vídeo 16:9 una unidad normalizada de x mide más que una de y.
    const points = makePoints({ leftHip: [0.5, 0.5], leftKnee: [0.6, 0.6], leftAnkle: [0.6, 0.9] });
    expect(new Body(points, 1).joint('knee', 'left')).toBeCloseTo(135);
    expect(new Body(points, 16 / 9).joint('knee', 'left')).toBeCloseTo(119.4, 0);
  });

  it('returns null for joints that are not visible', () => {
    const b = new Body(makePoints({ leftHip: [0.5, 0.5], leftKnee: [0.5, 0.7] }));
    expect(b.joint('knee', 'left')).toBeNull();
  });

  it('measures a straight standing leg and the torso', () => {
    const b = new Body(makePoints(STANDING));
    expect(b.joint('knee', 'left')).toBeCloseTo(180);
    expect(b.torsoLength()).toBeCloseTo(0.23);
  });
});
