/** Error usado para abortar un paso de la clase (saltar postura o terminar). */
export class Aborted extends Error {
  constructor() {
    super('aborted');
  }
}

/** Reloj que no avanza mientras está en pausa. */
export class PausableClock {
  private startedAt = performance.now();
  private pausedAt: number | null = null;
  private pausedTotal = 0;

  get paused(): boolean {
    return this.pausedAt !== null;
  }

  /** Milisegundos transcurridos sin contar las pausas. */
  now(): number {
    const end = this.pausedAt ?? performance.now();
    return end - this.startedAt - this.pausedTotal;
  }

  pause(): void {
    this.pausedAt ??= performance.now();
  }

  resume(): void {
    if (this.pausedAt === null) return;
    this.pausedTotal += performance.now() - this.pausedAt;
    this.pausedAt = null;
  }

  /** Espera hasta que el reloj alcance `until` (ms). Lanza Aborted si `isAborted()` pasa a true. */
  async waitUntil(until: number, isAborted: () => boolean): Promise<void> {
    while (this.now() < until) {
      if (isAborted()) throw new Aborted();
      await new Promise((r) => setTimeout(r, 100));
    }
    if (isAborted()) throw new Aborted();
  }
}
