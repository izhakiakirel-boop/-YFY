import type { WeatherType } from './types';

export type SoundEffectKind =
  | 'click'
  | 'step'
  | 'gather'
  | 'build'
  | 'upgrade'
  | 'pulse'
  | 'secret'
  | 'talk'
  | 'complete';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private enabled = false;
  private nextNoteAt = 0;
  private stepIdx = 0;
  private lastFootstepAt = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensureContext();
      this.ctx?.resume().catch(() => {});
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0.14, this.ctx.currentTime, 0.25);
      }
      this.playSfx('click');
    } else if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    }
    return this.enabled;
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1250;
    filter.connect(master);

    // Subtle procedural rain/breeze noise bed
    const bufLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 950;
    rainFilter.Q.value = 0.7;

    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.0001;

    noiseSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    noiseSrc.start();

    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.rainGain = rainGain;
  }

  update(simTime: number, weather: WeatherType, vitality: number): void {
    if (!this.enabled || !this.ctx || !this.filter || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    if (this.rainGain) {
      const targetRain = weather === 'rain' ? 0.14 : weather === 'mist' ? 0.04 : 0.015;
      this.rainGain.gain.setTargetAtTime(targetRain, now, 0.8);
    }

    if (simTime < this.nextNoteAt) return;
    const interval = weather === 'rain' ? 0.55 : weather === 'mist' ? 0.72 : 0.62;
    this.nextNoteAt = simTime + interval;

    // Pentatonic evolving scale based on valley vitality
    const scale = vitality >= 50 ? [0, 2, 4, 7, 9, 12, 14, 16] : [0, 3, 5, 7, 10, 12, 15];
    const pattern = [0, 2, 4, 5, 3, 2, 1, 4, 6, 4, 3, 2];
    const deg = scale[pattern[this.stepIdx % pattern.length] % scale.length];
    const root = vitality >= 65 ? 220 : vitality >= 30 ? 196 : 174.61;
    const freq = root * Math.pow(2, deg / 12);

    this.triggerTone(freq, interval * 1.9, 0.16, this.stepIdx % 3 === 0 ? 'triangle' : 'sine');
    if (this.stepIdx % 4 === 0) {
      this.triggerTone(root * 0.5, interval * 3.4, 0.11, 'sine');
    }
    this.stepIdx++;
  }

  playFootstep(onWater: boolean, simTime: number): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (simTime - this.lastFootstepAt < 0.34) return;
    this.lastFootstepAt = simTime;
    const freq = onWater ? 340 + Math.random() * 90 : 120 + Math.random() * 30;
    this.triggerTone(freq, onWater ? 0.11 : 0.06, onWater ? 0.08 : 0.04, 'sine');
  }

  playSfx(kind: SoundEffectKind): void {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx || !this.filter) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    switch (kind) {
      case 'click':
        this.triggerTone(420, 0.08, 0.14, 'sine');
        break;
      case 'gather':
        this.triggerTone(587.33, 0.14, 0.2, 'triangle');
        setTimeout(() => this.triggerTone(880, 0.18, 0.16, 'sine'), 65);
        break;
      case 'build':
        this.triggerTone(261.63, 0.25, 0.22, 'triangle');
        setTimeout(() => this.triggerTone(392, 0.28, 0.18, 'triangle'), 70);
        setTimeout(() => this.triggerTone(523.25, 0.36, 0.16, 'sine'), 140);
        break;
      case 'upgrade':
        [330, 440, 554.37, 659.25].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.32, 0.16, 'triangle'), idx * 75),
        );
        break;
      case 'pulse':
        this.triggerSweep(165, 495, 0.65, 0.22);
        break;
      case 'secret':
      case 'complete':
        [392, 493.88, 587.33, 783.99].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.45, 0.2, 'sine'), idx * 95),
        );
        break;
      case 'talk':
        this.triggerTone(480, 0.09, 0.1, 'sine');
        break;
      default:
        break;
    }
  }

  private triggerTone(freq: number, dur: number, vol: number, wave: OscillatorType): void {
    if (!this.ctx || !this.filter) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    } catch {
      // Ignore audio context edge errors
    }
  }

  private triggerSweep(f0: number, f1: number, dur: number, vol: number): void {
    if (!this.ctx || !this.filter) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f1, now + dur * 0.75);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.filter);
      osc.start(now);
      osc.stop(now + dur + 0.03);
    } catch {
      // Ignore
    }
  }

  dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
