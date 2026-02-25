// SoundSystem — manages sound effects for Marble Mayhem
// Uses Web Audio API directly (through Phaser's audio context).

import Phaser from 'phaser';
import { SurfaceType } from '../types/LevelDef';

export class SoundSystem {
  private scene: Phaser.Scene;
  private audioContext: AudioContext;
  private rollingSource: AudioBufferSourceNode | null = null;
  private rollingFilter: BiquadFilterNode | null = null;
  private rollingGain: GainNode | null = null;
  private rollingBuffer: AudioBuffer | null = null;
  private lastSurface: SurfaceType | null = null;
  private rollingSpeed = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.audioContext = (scene.sound as Phaser.Sound.WebAudioSoundManager).context;
    this.generateBuffers();
  }

  private generateBuffers(): void {
    // Generate a brown noise buffer for rolling sound (2 seconds loop)
    this.rollingBuffer = this.createBrownNoiseBuffer(2.0);
  }

  private createBrownNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.audioContext;
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise filter: low-pass with feedback
      lastOut = (lastOut + white * 0.02) / 1.02;
      data[i] = lastOut * 3.0; // gain
    }
    return buffer;
  }

  // Helper to play a simple sine tone with optional frequency and duration
  private playTone(frequency: number, duration: number, volume = 0.5, type: OscillatorType = 'sine'): void {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.value = volume;
    // envelope
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  // Helper to play a noise burst with filter
  private playNoise(duration: number, filterFreq: number, volume = 0.5): void {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    gain.gain.value = volume;
    const now = this.audioContext.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    source.start(now);
    source.stop(now + duration);
  }

  // Public API
  public updateRolling(speed: number): void {
    this.rollingSpeed = speed;
    const shouldPlay = speed > 10;
    const isPlaying = this.rollingSource !== null;

    if (shouldPlay && !isPlaying) {
      this.startRolling();
    } else if (!shouldPlay && isPlaying) {
      this.stopRolling();
    }

    if (this.rollingSource && this.rollingFilter && this.rollingGain) {
      // Adjust filter frequency based on speed (higher speed -> higher pitch)
      const minFreq = 100;
      const maxFreq = 800;
      const freq = minFreq + (speed / 420) * (maxFreq - minFreq);
      this.rollingFilter.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.1);
      // Adjust volume based on speed
      const volume = Math.min(0.5, 0.1 + speed / 1000);
      this.rollingGain.gain.setTargetAtTime(volume, this.audioContext.currentTime, 0.1);
    }
  }

  private startRolling(): void {
    if (!this.rollingBuffer) return;
    this.stopRolling();
    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    source.buffer = this.rollingBuffer;
    source.loop = true;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    gain.gain.value = 0.1;
    source.start();
    this.rollingSource = source;
    this.rollingFilter = filter;
    this.rollingGain = gain;
  }

  private stopRolling(): void {
    if (this.rollingSource) {
      this.rollingSource.stop();
      this.rollingSource.disconnect();
      this.rollingSource = null;
    }
    this.rollingFilter = null;
    this.rollingGain = null;
  }

  public playJumpChargeStart(): void {
    // short click
    this.playTone(800, 0.05, 0.3);
  }

  public playJumpRelease(charge: number): void {
    // pitch based on charge (0-1)
    const freq = 300 + charge * 600;
    this.playTone(freq, 0.2, 0.5);
  }

  public playSurfaceTransition(surface: SurfaceType): void {
    if (surface === this.lastSurface) return;
    this.lastSurface = surface;
    switch (surface) {
      case SurfaceType.ICE:
        // crystalline chime
        this.playTone(1200, 0.3, 0.4, 'sine');
        break;
      case SurfaceType.MUD:
        // squelch noise
        this.playNoise(0.3, 400, 0.4);
        break;
      default:
        // subtle click
        this.playTone(600, 0.1, 0.3);
        break;
    }
  }

  public playGemCollect(): void {
    // pleasant chime
    this.playTone(1000, 0.4, 0.6);
  }

  public playCheckpoint(): void {
    // confirmation sound
    this.playTone(600, 0.5, 0.5);
  }

  public playGoal(): void {
    // victory arpeggio
    const notes = [523.25, 659.25, 783.99];
    const now = this.audioContext.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.5, now + i * 0.2 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.5);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.5);
    });
  }

  public playEnemyKill(): void {
    // crush noise
    this.playNoise(0.4, 300, 0.5);
  }

  public playKnockback(): void {
    // low thud
    this.playTone(80, 0.25, 0.5);
  }

  public stopAll(): void {
    this.stopRolling();
  }
}