import { TICK_RATE } from "./types";

export type TickCallback = () => void;

/**
 * Standalone game loop running a tick callback at a fixed rate.
 * Independent of React, DOM, or any rendering framework.
 */
export class GameLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private _paused = false;
  private readonly tickRate: number;
  private readonly onTick: TickCallback;

  constructor(onTick: TickCallback, tickRate: number = TICK_RATE) {
    this.onTick = onTick;
    this.tickRate = tickRate;
  }

  /** True when actively ticking (started and not paused). */
  get running(): boolean {
    return this._running && !this._paused;
  }

  /** True when started but temporarily paused. */
  get paused(): boolean {
    return this._running && this._paused;
  }

  /** True when started (running or paused). */
  get active(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._paused = false;
    this.schedule();
  }

  stop(): void {
    this._running = false;
    this._paused = false;
    this.clear();
  }

  pause(): void {
    if (!this._running || this._paused) return;
    this._paused = true;
    this.clear();
  }

  resume(): void {
    if (!this._running || !this._paused) return;
    this._paused = false;
    this.schedule();
  }

  private schedule(): void {
    this.clear();
    this.intervalId = setInterval(() => this.onTick(), 1000 / this.tickRate);
  }

  private clear(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
