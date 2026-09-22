import { describe, expect, it } from 'vitest';
import { Coach, type CoachMessage } from './coach';
import { WARRIOR2_RIGHT, WARRIOR2_RIGHT_STRAIGHT_KNEE, makePoints } from './test/bodies';

function feed(coach: Coach, coords: Parameters<typeof makePoints>[0], from: number, to: number, still = true) {
  const messages: (CoachMessage & { at: number })[] = [];
  const points = makePoints(coords);
  for (let t = from; t < to; t += 33) {
    const m = coach.update(points, 1, still, t, true);
    if (m) messages.push({ ...m, at: t });
  }
  return messages;
}

describe('Coach', () => {
  it('waits a moment, then gives the most important correction', () => {
    const coach = new Coach();
    coach.reset('guerrero-2', 'right', true, 0);
    const messages = feed(coach, WARRIOR2_RIGHT_STRAIGHT_KNEE, 0, 5000);
    expect(messages).toHaveLength(1);
    expect(messages[0].kind).toBe('fix');
    expect(messages[0].text).toMatch(/^Flexiona más la rodilla \{pierna\}/);
    expect(messages[0].at).toBeGreaterThanOrEqual(3000);
    expect(coach.state).toBe('adjust');
    expect(coach.corrections).toBe(1);
  });

  it('praises when the correction is applied', () => {
    const coach = new Coach();
    coach.reset('guerrero-2', 'right', true, 0);
    feed(coach, WARRIOR2_RIGHT_STRAIGHT_KNEE, 0, 5000);
    const messages = feed(coach, WARRIOR2_RIGHT, 5000, 7000);
    expect(messages[0]?.kind).toBe('praise');
    expect(coach.state).toBe('ok');
  });

  it('says nothing while the person is moving', () => {
    const coach = new Coach();
    coach.reset('guerrero-2', 'right', true, 0);
    expect(feed(coach, WARRIOR2_RIGHT_STRAIGHT_KNEE, 0, 10000, false)).toEqual([]);
  });

  it('confirms a good alignment only once', () => {
    const coach = new Coach();
    coach.reset('guerrero-2', 'right', true, 0);
    const messages = feed(coach, WARRIOR2_RIGHT, 0, 30000);
    expect(messages.map((m) => m.kind)).toEqual(['aligned']);
  });

  it('does not repeat the same correction too often', () => {
    const coach = new Coach();
    coach.reset('guerrero-2', 'right', true, 0);
    const messages = feed(coach, WARRIOR2_RIGHT_STRAIGHT_KNEE, 0, 60000);
    const kneeFixes = messages.filter((m) => m.text.startsWith('Flexiona más la rodilla'));
    expect(kneeFixes).toHaveLength(2);
    expect(kneeFixes[1].at - kneeFixes[0].at).toBeGreaterThanOrEqual(15000);
  });

  it('ignores poses without checks', () => {
    const coach = new Coach();
    coach.reset('savasana', undefined, false, 0);
    expect(feed(coach, WARRIOR2_RIGHT, 0, 10000)).toEqual([]);
    expect(coach.state).toBe('unknown');
  });
});
