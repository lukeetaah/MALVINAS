import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameLoop } from "../loop";

describe("GameLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onTick at the configured tick rate", () => {
    const onTick = vi.fn();
    const loop = new GameLoop(onTick, 10);
    loop.start();
    vi.advanceTimersByTime(1000);
    loop.stop();
    expect(onTick).toHaveBeenCalledTimes(10);
  });

  it("does not tick when stopped", () => {
    const onTick = vi.fn();
    const loop = new GameLoop(onTick, 10);
    loop.start();
    vi.advanceTimersByTime(300);
    loop.stop();
    const count = onTick.mock.calls.length;
    vi.advanceTimersByTime(700);
    expect(onTick).toHaveBeenCalledTimes(count);
  });

  it("pauses and resumes correctly", () => {
    const onTick = vi.fn();
    const loop = new GameLoop(onTick, 10);
    loop.start();
    vi.advanceTimersByTime(500);
    const beforePause = onTick.mock.calls.length;
    loop.pause();
    expect(loop.paused).toBe(true);
    expect(loop.running).toBe(false);
    expect(loop.active).toBe(true);
    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalledTimes(beforePause);
    loop.resume();
    vi.advanceTimersByTime(500);
    loop.stop();
    expect(onTick.mock.calls.length).toBeGreaterThan(beforePause);
  });

  it("reports lifecycle state accurately", () => {
    const loop = new GameLoop(() => {}, 10);
    expect(loop.running).toBe(false);
    expect(loop.paused).toBe(false);
    expect(loop.active).toBe(false);

    loop.start();
    expect(loop.running).toBe(true);
    expect(loop.active).toBe(true);

    loop.pause();
    expect(loop.running).toBe(false);
    expect(loop.paused).toBe(true);
    expect(loop.active).toBe(true);

    loop.stop();
    expect(loop.running).toBe(false);
    expect(loop.paused).toBe(false);
    expect(loop.active).toBe(false);
  });

  it("ignores duplicate start calls", () => {
    const onTick = vi.fn();
    const loop = new GameLoop(onTick, 10);
    loop.start();
    loop.start(); // should be a no-op
    vi.advanceTimersByTime(1000);
    loop.stop();
    // Should still be exactly 10, not 20
    expect(onTick).toHaveBeenCalledTimes(10);
  });
});
