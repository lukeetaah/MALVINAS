"use client";

import type { WeatherType } from "@malvinas/simulation";

/**
 * Procedural Tactical Audio Engine using Web Audio API.
 * Synthesizes military soundscapes, weapon discharges, and atmospheric wind.
 */
export class TacticalAudioManager {
  private static instance: TacticalAudioManager | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private isMuted = false;
  private masterVolume = 0.7;

  private constructor() {}

  public static getInstance(): TacticalAudioManager {
    if (!TacticalAudioManager.instance) {
      TacticalAudioManager.instance = new TacticalAudioManager();
    }
    return TacticalAudioManager.instance;
  }

  /**
   * Initializes AudioContext on first user gesture.
   */
  public init(): boolean {
    if (typeof window === "undefined") return false;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime,
      );
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Calculates audio attenuation based on distance from viewport camera center.
   */
  public calculateDistanceGain(distance: number, maxAudibleDistance = 800): number {
    if (distance <= 0) return 1.0;
    if (distance >= maxAudibleDistance) return 0.05;
    return Math.max(0.05, 1.0 - (distance / maxAudibleDistance) * 0.9);
  }

  /**
   * Procedural Rifle Fire (7.62mm FAL / SLR L1A1).
   */
  public playRifleShot(distance = 0): void {
    if (!this.init() || !this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const distGain = this.calculateDistanceGain(distance);

    // 1. Noise transient (gunshot crack)
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(800, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * distGain, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    // 2. Low-frequency punch (barrel resonance)
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.1);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.8 * distGain, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    noise.start(t);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Procedural Machine Gun Burst (FN MAG 7.62 / 12.7mm).
   */
  public playMachineGunBurst(burstCount = 4, distance = 0): void {
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        this.playRifleShot(distance);
      }, i * 75);
    }
  }

  /**
   * Procedural Heavy Artillery / Mortar Blast (105mm / 81mm).
   */
  public playArtilleryBlast(distance = 0): void {
    if (!this.init() || !this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const distGain = this.calculateDistanceGain(distance, 1200);

    // Sub-bass thump
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.6);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(1.0 * distGain, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    // Explosive debris noise
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(350, t);
    filter.frequency.linearRampToValueAtTime(80, t + 0.4);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9 * distGain, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.6);
  }

  /**
   * Tactical Radio Chirp / Squelch on order dispatch.
   */
  public playRadioChirp(): void {
    if (!this.init() || !this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1175, t + 0.03);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Objective capture chime.
   */
  public playSectorSecured(): void {
    if (!this.init() || !this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const freqs = [440, 554.37, 659.25]; // A major chord

    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t + idx * 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.45);
    });
  }

  /**
   * Continuous atmospheric wind & blizzard soundscape.
   */
  public updateAtmosphere(weatherType: WeatherType = "clear"): void {
    if (!this.init() || !this.ctx || !this.ambientGain) return;

    if (!this.windSource) {
      // Create seamless looping pink/brown noise
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        data[i] = (b0 + b1 + b2) * 0.3;
      }

      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = buffer;
      this.windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = "lowpass";
      this.windFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.ambientGain);

      this.windSource.start();
    }

    if (this.windFilter && this.windGain && this.ctx) {
      const t = this.ctx.currentTime;
      let targetFreq = 250;
      let targetVol = 0.1;

      if (weatherType === "gale-winds" || weatherType === "snow-blizzard") {
        targetFreq = 750;
        targetVol = 0.35;
      } else if (weatherType === "rain" || weatherType === "dense-fog") {
        targetFreq = 450;
        targetVol = 0.2;
      }

      this.windFilter.frequency.setTargetAtTime(targetFreq, t, 1.5);
      this.windGain.gain.setTargetAtTime(targetVol, t, 1.5);
    }
  }

  public stopAtmosphere(): void {
    if (this.windSource) {
      try {
        this.windSource.stop();
        this.windSource.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      this.windSource = null;
      this.windGain = null;
      this.windFilter = null;
    }
  }
}
