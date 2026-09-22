export type Side = 'left' | 'right';
export type Level = 1 | 2;
export type Block = 'centering' | 'warmup' | 'standing' | 'balance' | 'floor' | 'relax';
export type Concern = 'knees' | 'lowback' | 'wrists' | 'balance';
/** Orientación recomendada respecto a la cámara para poder evaluar la postura. */
export type CameraView = 'front' | 'side';

export interface Point {
  x: number;
  y: number;
  visibility: number;
}

export interface PoseDef {
  id: string;
  name: string;
  sanskrit: string;
  block: Block;
  level: Level;
  /** Si es asimétrica: se hace a la derecha y luego a la izquierda. */
  sided: boolean;
  /** Tiempo de permanencia base en segundos (por lado). */
  hold: number;
  /** Instrucciones para entrar. Admite el marcador {lado}. */
  enter: string[];
  /** Indicaciones durante la permanencia. */
  cues: string[];
  view?: CameraView;
  avoid?: Concern[];
  /** Muestra la animación de respiración durante la permanencia. */
  breathing?: boolean;
}

export interface SessionStep {
  pose: PoseDef;
  side?: Side;
  /** Segundos de permanencia (sin contar la narración de entrada). */
  hold: number;
}

export interface SessionOptions {
  minutes: number;
  level: Level;
  avoid: Concern[];
}
