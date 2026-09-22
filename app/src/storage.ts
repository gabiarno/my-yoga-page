import type { MusicStyle } from './music';
import type { Concern, Level } from './types';

export interface Settings {
  minutes: number;
  level: Level;
  avoid: Concern[];
  camera: boolean;
  music: MusicStyle;
  musicVolume: number;
  voiceUri?: string;
  rate: number;
}

export interface HistoryEntry {
  date: string;
  seconds: number;
  poses: number;
  corrections: number;
  completed: boolean;
}

const SETTINGS_KEY = 'yoga.settings';
const HISTORY_KEY = 'yoga.history';

export const DEFAULT_SETTINGS: Settings = {
  minutes: 20,
  level: 1,
  avoid: [],
  camera: true,
  music: 'pad',
  musicVolume: 0.5,
  rate: 0.9,
};

// El almacenamiento puede no estar disponible (modo privado, bloqueos): nunca es crítico.
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function loadSettings(): Settings {
  const saved = read<Partial<Settings>>(SETTINGS_KEY, {});
  // La música de archivo no se puede recuperar entre visitas.
  if (saved.music === 'file') saved.music = DEFAULT_SETTINGS.music;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export const saveSettings = (s: Settings): void => write(SETTINGS_KEY, s);

export const loadHistory = (): HistoryEntry[] => read<HistoryEntry[]>(HISTORY_KEY, []);

export function addHistory(entry: HistoryEntry): void {
  write(HISTORY_KEY, [...loadHistory(), entry].slice(-200));
}

/** Clave de día en hora local. */
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function stats(
  history: HistoryEntry[],
  today = new Date(),
): { sessions: number; minutes: number; streak: number } {
  const days = new Set(history.map((h) => dayKey(new Date(h.date))));
  let streak = 0;
  const day = new Date(today);
  // La racha cuenta desde hoy o desde ayer (si hoy aún no se ha practicado).
  if (!days.has(dayKey(day))) day.setDate(day.getDate() - 1);
  while (days.has(dayKey(day))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return {
    sessions: history.length,
    minutes: Math.round(history.reduce((a, h) => a + h.seconds, 0) / 60),
    streak,
  };
}
