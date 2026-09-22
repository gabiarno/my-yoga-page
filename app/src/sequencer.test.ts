import { describe, expect, it } from 'vitest';
import { buildSession, fillSide, sessionDuration } from './sequencer';
import type { Concern, Level } from './types';

describe('buildSession', () => {
  const durations = [10, 20, 30, 45, 60];
  const combos: { level: Level; avoid: Concern[] }[] = [
    { level: 1, avoid: [] },
    { level: 2, avoid: [] },
    { level: 1, avoid: ['knees', 'lowback', 'wrists', 'balance'] },
  ];

  for (const minutes of durations) {
    for (const { level, avoid } of combos) {
      it(`fits ${minutes} min (level ${level}, avoiding ${avoid.join(',') || 'nothing'})`, () => {
        const steps = buildSession({ minutes, level, avoid });
        const duration = sessionDuration(steps);
        expect(Math.abs(duration - minutes * 60)).toBeLessThanOrEqual(Math.max(60, minutes * 60 * 0.1));
        expect(steps[0].pose.id).toBe('sukhasana');
        expect(steps.at(-1)!.pose.id).toBe('savasana');
        for (const step of steps) {
          expect(step.pose.level).toBeLessThanOrEqual(level);
          for (const c of avoid) expect(step.pose.avoid ?? []).not.toContain(c);
          expect(step.hold).toBeGreaterThanOrEqual(5);
        }
      });
    }
  }

  it('does both sides of asymmetric poses, right first', () => {
    const steps = buildSession({ minutes: 30, level: 1, avoid: [] });
    steps.forEach((step, i) => {
      if (step.side === 'right') {
        expect(steps[i + 1].pose.id).toBe(step.pose.id);
        expect(steps[i + 1].side).toBe('left');
      }
    });
  });

  it('includes intermediate poses only at level 2', () => {
    const ids = (level: Level) => buildSession({ minutes: 45, level, avoid: [] }).map((s) => s.pose.id);
    expect(ids(1)).not.toContain('guerrero-3');
    expect(ids(2)).toContain('guerrero-3');
  });

  it('longer classes include more poses', () => {
    const count = (minutes: number) => buildSession({ minutes, level: 1, avoid: [] }).length;
    expect(count(60)).toBeGreaterThan(count(20));
    expect(count(20)).toBeGreaterThan(count(10));
  });
});

describe('fillSide', () => {
  it('fills side placeholders', () => {
    const text = 'Pie {pie}, pie {otro}, pierna {pierna}, pierna {otra}.';
    expect(fillSide(text, 'right')).toBe('Pie derecho, pie izquierdo, pierna derecha, pierna izquierda.');
    expect(fillSide(text, 'left')).toBe('Pie izquierdo, pie derecho, pierna izquierda, pierna derecha.');
  });
});
