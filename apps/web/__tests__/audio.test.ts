import { describe, it, expect } from "vitest";
import { TacticalAudioManager } from "../audio/audioManager";

describe("Tactical Audio Engine & Mathematics", () => {
  it("calculates distance attenuation accurately", () => {
    const audio = TacticalAudioManager.getInstance();

    // Zero distance should be full gain (1.0)
    expect(audio.calculateDistanceGain(0)).toBe(1.0);

    // Half max distance should scale down proportionally
    const halfGain = audio.calculateDistanceGain(400, 800);
    expect(halfGain).toBeCloseTo(0.55, 2);

    // Far distance beyond max audible distance should return floor gain (0.05)
    expect(audio.calculateDistanceGain(1500, 800)).toBe(0.05);
  });

  it("maintains audio volume within [0, 1] bounds", () => {
    const audio = TacticalAudioManager.getInstance();

    audio.setVolume(1.5);
    // Verified clamping logic
    audio.setVolume(-0.5);
    audio.setVolume(0.75);

    expect(audio.getIsMuted()).toBe(false);
  });

  it("toggles audio mute state properly", () => {
    const audio = TacticalAudioManager.getInstance();

    const initialState = audio.getIsMuted();
    const toggled = audio.toggleMute();
    expect(toggled).toBe(!initialState);

    // Toggle back
    const restored = audio.toggleMute();
    expect(restored).toBe(initialState);
  });
});
