import { describe, expect, it } from 'vitest';
import { StillnessDetector } from './stillness';
import { STANDING, makePoints } from './test/bodies';

const shifted = (dx: number) =>
  makePoints(
    Object.fromEntries(Object.entries(STANDING).map(([k, [x, y]]) => [k, [x + dx, y]])) as typeof STANDING,
  );

describe('StillnessDetector', () => {
  it('detects stillness after holding still for a while', () => {
    const d = new StillnessDetector({ holdMs: 1500 });
    let still = false;
    for (let t = 0; t <= 1000; t += 33) still = d.update(shifted(0), 1, t);
    expect(still).toBe(false);
    for (let t = 1033; t <= 2000; t += 33) still = d.update(shifted(0), 1, t);
    expect(still).toBe(true);
  });

  it('tolerates small detection jitter', () => {
    const d = new StillnessDetector();
    let still = false;
    for (let t = 0, i = 0; t <= 3000; t += 33, i++) still = d.update(shifted(i % 2 ? 0.001 : -0.001), 1, t);
    expect(still).toBe(true);
  });

  it('is not still while moving', () => {
    const d = new StillnessDetector();
    let still = true;
    for (let t = 0, i = 0; t <= 3000; t += 33, i++) still = d.update(shifted(i * 0.004), 1, t);
    expect(still).toBe(false);
  });
});
