import { describe, expect, it } from 'vitest';
import { stats, type HistoryEntry } from './storage';

const entry = (date: Date, seconds = 600): HistoryEntry => ({
  date: date.toISOString(),
  seconds,
  poses: 10,
  corrections: 2,
  completed: true,
});

describe('stats', () => {
  const today = new Date(2026, 8, 22, 18);
  const daysAgo = (n: number) => new Date(2026, 8, 22 - n, 10);

  it('counts sessions, minutes and the current streak', () => {
    const history = [entry(daysAgo(0)), entry(daysAgo(1)), entry(daysAgo(2)), entry(daysAgo(4))];
    expect(stats(history, today)).toEqual({ sessions: 4, minutes: 40, streak: 3 });
  });

  it('keeps the streak alive if today has not been practised yet', () => {
    expect(stats([entry(daysAgo(1)), entry(daysAgo(2))], today).streak).toBe(2);
  });

  it('has no streak without recent practice', () => {
    expect(stats([entry(daysAgo(3))], today).streak).toBe(0);
  });
});
