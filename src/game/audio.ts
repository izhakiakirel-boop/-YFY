import type { AudioMixSettings, ClimateEventType, SeasonId, SubBiomeId, WeatherType, ZoneId } from './types';

export type SoundEffectKind =
  | 'click'
  | 'gather'
  | 'build'
  | 'upgrade'
  | 'pulse'
  | 'secret'
  | 'talk'
  | 'complete'
  | 'damage'
  | 'purify'
  | 'craft'
  | 'consume'
  | 'portal'
  | 'meteor'
  | 'updraft';

export interface SpatialAudioFrame {
  simTime: number;
  weather: WeatherType;
  vitality: number;
  zone: ZoneId;
  isNight: boolean;
  playerX: number;
  playerY: number;
  playerZ: number;
  camYaw: number;
  riverX: number;
  season?: SeasonId;
  climateEvent?: ClimateEventType;
  subBiome?: SubBiomeId;
}

const AUDIO_MIX_STORAGE_KEY = 'shozrim-audio-mix-v1';

const WATERFALL_POS = { x: 72.6, z: 44.5 };
const FOREST_CANOPY_POS = { x: 52, z: -10 };
const CAVERN_POS = { x: 72, z: -68 };

interface ZoneMusicProfile {
  root: number;
  scale: number[];
  pattern: number[];
  interval: number;
  cutoff: number;
  wave: OscillatorType;
  subWave: OscillatorType;
  padRatio: number;
  padLevel: number;
  echoTime: number;
  echoFeedback: number;
  echoWet: number;
  shimmerChance: number;
}

const ZONE_PROFILES: Record<ZoneId, ZoneMusicProfile> = {
  plaza: {
    root: 174.61, // F3
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    pattern: [0, 2, 4, 5, 3, 2, 4, 6, 5, 4, 2, 1],
    interval: 0.7,
    cutoff: 1450,
    wave: 'sine',
    subWave: 'triangle',
    padRatio: 1.498,
    padLevel: 0.05,
    echoTime: 0.28,
    echoFeedback: 0.22,
    echoWet: 0.18,
    shimmerChance: 0.18,
  },
  river: {
    root: 196.0, // G3
    scale: [0, 2, 4, 6, 7, 9, 11, 14],
    pattern: [0, 2, 4, 6, 4, 7, 5, 3, 2, 4, 6, 5],
    interval: 0.54,
    cutoff: 1780,
    wave: 'triangle',
    subWave: 'sine',
    padRatio: 1.498,
    padLevel: 0.045,
    echoTime: 0.24,
    echoFeedback: 0.28,
    echoWet: 0.24,
    shimmerChance: 0.42,
  },
  forest: {
    root: 220.0, // A3
    scale: [0, 2, 3, 7, 9, 12, 14, 15],
    pattern: [0, 3, 4, 2, 5, 4, 3, 1, 2, 6, 5, 3],
    interval: 0.78,
    cutoff: 1220,
    wave: 'sine',
    subWave: 'sine',
    padRatio: 1.189,
    padLevel: 0.055,
    echoTime: 0.36,
    echoFeedback: 0.32,
    echoWet: 0.28,
    shimmerChance: 0.25,
  },
  ruins: {
    root: 146.83, // D3
    scale: [0, 1, 4, 5, 7, 8, 11, 12],
    pattern: [0, 1, 4, 3, 2, 5, 4, 1, 6, 4, 2, 0],
    interval: 0.96,
    cutoff: 820,
    wave: 'triangle',
    subWave: 'sine',
    padRatio: 1.059,
    padLevel: 0.068,
    echoTime: 0.44,
    echoFeedback: 0.38,
    echoWet: 0.34,
    shimmerChance: 0.14,
  },
  cavern: {
    root: 130.81, // C3
    scale: [0, 2, 3, 7, 10, 12, 15, 19],
    pattern: [0, 3, 5, 7, 4, 2, 6, 5, 3, 7, 4, 1],
    interval: 0.84,
    cutoff: 2150,
    wave: 'sine',
    subWave: 'triangle',
    padRatio: 1.498,
    padLevel: 0.058,
    echoTime: 0.42,
    echoFeedback: 0.46,
    echoWet: 0.44,
    shimmerChance: 0.55,
  },
  terrace: {
    root: 164.81, // E3
    scale: [0, 1, 5, 7, 10, 12, 14],
    pattern: [0, 2, 3, 1, 4, 3, 2, 5, 3, 1, 2, 0],
    interval: 0.88,
    cutoff: 1150,
    wave: 'triangle',
    subWave: 'sine',
    padRatio: 1.335,
    padLevel: 0.048,
    echoTime: 0.32,
    echoFeedback: 0.25,
    echoWet: 0.22,
    shimmerChance: 0.15,
  },
  island: {
    root: 220.0, // A3
    scale: [0, 4, 7, 9, 11, 14, 16],
    pattern: [0, 2, 4, 6, 5, 3, 4, 2, 1, 4, 6, 5],
    interval: 0.62,
    cutoff: 1950,
    wave: 'sine',
    subWave: 'triangle',
    padRatio: 1.26,
    padLevel: 0.055,
    echoTime: 0.34,
    echoFeedback: 0.34,
    echoWet: 0.32,
    shimmerChance: 0.48,
  },
  frontier: {
    root: 146.83, // D3 expansive wilds
    scale: [0, 2, 5, 7, 9, 12, 14, 17],
    pattern: [0, 3, 5, 2, 4, 6, 3, 1, 2, 5, 4, 0],
    interval: 0.8,
    cutoff: 1420,
    wave: 'triangle',
    subWave: 'sine',
    padRatio: 1.498,
    padLevel: 0.06,
    echoTime: 0.38,
    echoFeedback: 0.3,
    echoWet: 0.28,
    shimmerChance: 0.24,
  },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Projects a 2D offset from the player onto the camera's right vector:
 * camera right vector in XZ for Three.js orbit yaw is (cos(camYaw), -sin(camYaw)).
 */
function computeStereoPan(dx: number, dz: number, camYaw: number): number {
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return 0;
  const rightX = Math.cos(camYaw);
  const rightZ = -Math.sin(camYaw);
  const dot = (dx * rightX + dz * rightZ) / len;
  return clamp(dot * 0.88, -0.88, 0.88);
}

function loadAudioMix(): AudioMixSettings {
  try {
    const raw = localStorage.getItem(AUDIO_MIX_STORAGE_KEY);
    if (!raw) return { muted: false, musicVolume: 0.75, ambienceVolume: 0.85 };
    const parsed = JSON.parse(raw) as Partial<AudioMixSettings>;
    return {
      muted: Boolean(parsed.muted),
      musicVolume:
        typeof parsed.musicVolume === 'number' ? clamp(parsed.musicVolume, 0, 1) : 0.75,
      ambienceVolume:
        typeof parsed.ambienceVolume === 'number' ? clamp(parsed.ambienceVolume, 0, 1) : 0.85,
    };
  } catch {
    return { muted: false, musicVolume: 0.75, ambienceVolume: 0.85 };
  }
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  // Separate music bus & nodes
  private musicMaster: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padGain: GainNode | null = null;

  // Separate spatial nature ambience bus & continuous beds
  private ambienceMaster: GainNode | null = null;
  private riverGain: GainNode | null = null;
  private riverFilter: BiquadFilterNode | null = null;
  private riverPan: StereoPannerNode | null = null;
  private fallGain: GainNode | null = null;
  private fallFilter: BiquadFilterNode | null = null;
  private fallPan: StereoPannerNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windPan: StereoPannerNode | null = null;
  private rainGain: GainNode | null = null;
  private caveDelayNode: DelayNode | null = null;
  private caveFeedback: GainNode | null = null;

  private mix: AudioMixSettings = loadAudioMix();
  private enabled = false;
  private userMuted = this.mix.muted;
  private currentZone: ZoneId = 'plaza';

  private nextNoteAt = 0;
  private nextBirdAt = 1.5;
  private nextNightCritterAt = 1.8;
  private nextWindGustAt = 3.0;
  private nextCaveDripAt = 2.2;
  private stepIdx = 0;
  private lastFootstepAt = 0;

  isEnabled(): boolean {
    return this.enabled;
  }

  getMixSettings(): AudioMixSettings {
    return { ...this.mix, muted: this.userMuted };
  }

  getCurrentZone(): ZoneId {
    return this.currentZone;
  }

  private persistMix(): void {
    try {
      this.mix.muted = this.userMuted;
      localStorage.setItem(AUDIO_MIX_STORAGE_KEY, JSON.stringify(this.mix));
    } catch {
      // Ignore storage errors
    }
  }

  setMusicVolume(vol: number): AudioMixSettings {
    this.mix.musicVolume = clamp(vol, 0, 1);
    this.persistMix();
    if (this.ctx && this.musicMaster) {
      this.musicMaster.gain.setTargetAtTime(this.mix.musicVolume, this.ctx.currentTime, 0.08);
    }
    return this.getMixSettings();
  }

  setAmbienceVolume(vol: number): AudioMixSettings {
    this.mix.ambienceVolume = clamp(vol, 0, 1);
    this.persistMix();
    if (this.ctx && this.ambienceMaster) {
      this.ambienceMaster.gain.setTargetAtTime(
        this.mix.ambienceVolume,
        this.ctx.currentTime,
        0.08,
      );
    }
    return this.getMixSettings();
  }

  /** Automatically starts music + spatial ambience on the player's first gesture unless explicitly muted */
  unlockOnGesture(): boolean {
    if (this.userMuted) return false;
    if (this.enabled && this.ctx?.state === 'running') return false;
    this.enabled = true;
    this.ensureContext();
    this.ctx?.resume().catch(() => {});
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.55);
    }
    this.applyBusVolumes(0.2);
    this.applyZoneTone(this.currentZone, false, 1.0);
    return true;
  }

  toggle(): boolean {
    if (this.enabled) {
      this.enabled = false;
      this.userMuted = true;
      this.persistMix();
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
      }
    } else {
      this.enabled = true;
      this.userMuted = false;
      this.persistMix();
      this.ensureContext();
      this.ctx?.resume().catch(() => {});
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.3);
      }
      this.applyBusVolumes(0.15);
      this.applyZoneTone(this.currentZone, false, 0.4);
      this.playSfx('click');
    }
    return this.enabled;
  }

  private applyBusVolumes(tc = 0.1): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.musicMaster) {
      this.musicMaster.gain.setTargetAtTime(this.mix.musicVolume, now, tc);
    }
    if (this.ambienceMaster) {
      this.ambienceMaster.gain.setTargetAtTime(this.mix.ambienceVolume, now, tc);
    }
  }

  private createStereoPanNode(ctx: AudioContext): StereoPannerNode | null {
    return typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    // =========================================================================
    // 1. MUSIC & SFX BUS (filtered, atmospheric zone harmonic track)
    // =========================================================================
    const musicMaster = ctx.createGain();
    musicMaster.gain.value = this.mix.musicVolume;
    musicMaster.connect(master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.8;
    filter.connect(musicMaster);

    const musicBus = ctx.createGain();
    musicBus.gain.value = 0.82;
    musicBus.connect(filter);

    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.value = 0.32;
    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = 0.26;
    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0.22;

    musicBus.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayWetGain.connect(filter);

    const padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    padGain.connect(filter);

    const padOsc1 = ctx.createOscillator();
    padOsc1.type = 'sine';
    padOsc1.frequency.value = 174.61 * 0.5;
    padOsc1.connect(padGain);
    padOsc1.start();

    const padOsc2 = ctx.createOscillator();
    padOsc2.type = 'triangle';
    padOsc2.frequency.value = 174.61 * 0.5 * 1.498;
    const pad2Trim = ctx.createGain();
    pad2Trim.gain.value = 0.38;
    padOsc2.connect(pad2Trim);
    pad2Trim.connect(padGain);
    padOsc2.start();

    // =========================================================================
    // 2. SPATIAL NATURE AMBIENCE BUS (independent of music track & filtering)
    // =========================================================================
    const ambienceMaster = ctx.createGain();
    ambienceMaster.gain.value = this.mix.ambienceVolume;
    ambienceMaster.connect(master);

    // Shared 3-second seamless pink/brown noise buffer for water & wind layers
    const bufLen = ctx.sampleRate * 3;
    const pinkBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const pinkData = pinkBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.95 * b2 + white * 0.048;
      pinkData[i] = clamp((b0 + b1 + b2 + white * 0.09) * 1.6, -0.95, 0.95);
    }

    // 2A. Distant & Nearby River Flow Layer
    const riverSrc = ctx.createBufferSource();
    riverSrc.buffer = pinkBuf;
    riverSrc.loop = true;
    const riverFilter = ctx.createBiquadFilter();
    riverFilter.type = 'bandpass';
    riverFilter.frequency.value = 620;
    riverFilter.Q.value = 0.55;
    const riverGain = ctx.createGain();
    riverGain.gain.value = 0.0001;
    const riverPan = this.createStereoPanNode(ctx);

    riverSrc.connect(riverFilter);
    riverFilter.connect(riverGain);
    if (riverPan) {
      riverGain.connect(riverPan);
      riverPan.connect(ambienceMaster);
    } else {
      riverGain.connect(ambienceMaster);
    }
    riverSrc.start();

    // 2B. Hidden Waterfall Roar & Spray Layer
    const fallSrc = ctx.createBufferSource();
    fallSrc.buffer = pinkBuf;
    fallSrc.loop = true;
    fallSrc.playbackRate.value = 1.15;
    const fallFilter = ctx.createBiquadFilter();
    fallFilter.type = 'lowpass';
    fallFilter.frequency.value = 1200;
    fallFilter.Q.value = 0.7;
    const fallGain = ctx.createGain();
    fallGain.gain.value = 0.0001;
    const fallPan = this.createStereoPanNode(ctx);

    fallSrc.connect(fallFilter);
    fallFilter.connect(fallGain);
    if (fallPan) {
      fallGain.connect(fallPan);
      fallPan.connect(ambienceMaster);
    } else {
      fallGain.connect(ambienceMaster);
    }
    fallSrc.start();

    // 2C. Wind Whistling & Valley Breeze Layer
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = pinkBuf;
    windSrc.loop = true;
    windSrc.playbackRate.value = 0.85;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 460;
    windFilter.Q.value = 3.2; // Resonant whistle character
    const windGain = ctx.createGain();
    windGain.gain.value = 0.0001;
    const windPan = this.createStereoPanNode(ctx);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    if (windPan) {
      windGain.connect(windPan);
      windPan.connect(ambienceMaster);
    } else {
      windGain.connect(ambienceMaster);
    }
    windSrc.start();

    // 2D. Rain Texture Bed (controlled by ambience channel)
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = pinkBuf;
    rainSrc.loop = true;
    rainSrc.playbackRate.value = 1.45;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1550;
    rainFilter.Q.value = 0.45;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.0001;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(ambienceMaster);
    rainSrc.start();

    // 2E. Cavern Echo Feedback Bus for dripping water echoes
    const caveDelayNode = ctx.createDelay(1.0);
    caveDelayNode.delayTime.value = 0.36;
    const caveFeedback = ctx.createGain();
    caveFeedback.gain.value = 0.38;
    const caveWet = ctx.createGain();
    caveWet.gain.value = 0.42;
    caveDelayNode.connect(caveFeedback);
    caveFeedback.connect(caveDelayNode);
    caveDelayNode.connect(caveWet);
    caveWet.connect(ambienceMaster);

    this.ctx = ctx;
    this.master = master;
    this.musicMaster = musicMaster;
    this.musicBus = musicBus;
    this.filter = filter;
    this.delayNode = delayNode;
    this.feedbackGain = feedbackGain;
    this.delayWetGain = delayWetGain;
    this.padOsc1 = padOsc1;
    this.padOsc2 = padOsc2;
    this.padGain = padGain;

    this.ambienceMaster = ambienceMaster;
    this.riverGain = riverGain;
    this.riverFilter = riverFilter;
    this.riverPan = riverPan;
    this.fallGain = fallGain;
    this.fallFilter = fallFilter;
    this.fallPan = fallPan;
    this.windGain = windGain;
    this.windFilter = windFilter;
    this.windPan = windPan;
    this.rainGain = rainGain;
    this.caveDelayNode = caveDelayNode;
    this.caveFeedback = caveFeedback;
  }

  private applyZoneTone(zone: ZoneId, isNight: boolean, timeConstant = 1.2): void {
    if (!this.ctx || !this.filter || !this.delayNode || !this.feedbackGain || !this.delayWetGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const prof = ZONE_PROFILES[zone];
    const targetCutoff = isNight ? prof.cutoff * 0.78 : prof.cutoff;

    this.filter.frequency.setTargetAtTime(targetCutoff, now, timeConstant);
    this.delayNode.delayTime.setTargetAtTime(prof.echoTime, now, 0.8);
    this.feedbackGain.gain.setTargetAtTime(prof.echoFeedback, now, 0.8);
    this.delayWetGain.gain.setTargetAtTime(prof.echoWet, now, 0.8);

    if (this.padOsc1 && this.padOsc2 && this.padGain) {
      const subRoot = prof.root * 0.5;
      this.padOsc1.frequency.setTargetAtTime(subRoot, now, timeConstant);
      this.padOsc2.frequency.setTargetAtTime(subRoot * prof.padRatio, now, timeConstant);
      this.padGain.gain.setTargetAtTime(isNight ? prof.padLevel * 1.2 : prof.padLevel, now, timeConstant);
    }
  }

  update(frame: SpatialAudioFrame): void {
    if (!this.enabled || !this.ctx || !this.filter || this.ctx.state !== 'running') return;

    const { simTime, weather, vitality, zone, isNight } = frame;
    const now = this.ctx.currentTime;

    // -------------------------------------------------------------------------
    // A. MAIN ZONE MUSIC TRACK
    // -------------------------------------------------------------------------
    const prof = ZONE_PROFILES[zone];
    if (zone !== this.currentZone) {
      this.currentZone = zone;
      this.stepIdx = 0;
      this.applyZoneTone(zone, isNight, 1.3);
      this.triggerMusicNote(prof.root * 2, 1.6, 0.08, prof.wave, 0.08);
    } else {
      const targetCutoff = isNight ? prof.cutoff * 0.78 : prof.cutoff;
      this.filter.frequency.setTargetAtTime(targetCutoff, now, 1.6);
    }

    if (simTime >= this.nextNoteAt) {
      const nightSlow = isNight ? 1.16 : 1.0;
      const weatherSlow = weather === 'mist' ? 1.12 : weather === 'rain' ? 0.94 : 1.0;
      const interval = prof.interval * nightSlow * weatherSlow;
      this.nextNoteAt = simTime + interval;

      const activeScale =
        zone === 'terrace' && vitality >= 55 ? [0, 2, 4, 7, 9, 12, 14] : prof.scale;
      const deg = activeScale[prof.pattern[this.stepIdx % prof.pattern.length] % activeScale.length];
      const rootFreq = prof.root * (vitality >= 75 && zone === 'plaza' ? 1.059 : 1.0);
      const noteFreq = rootFreq * Math.pow(2, deg / 12);

      const wave = this.stepIdx % 3 === 0 ? prof.subWave : prof.wave;
      this.triggerMusicNote(noteFreq, interval * 2.1, 0.11, wave, 0.045);

      if (Math.random() < prof.shimmerChance) {
        const shimmerFreq = noteFreq * (zone === 'cavern' ? 3 : 2);
        this.triggerMusicNote(shimmerFreq, interval * 2.4, 0.042, 'sine', 0.06);
      }

      if (this.stepIdx % 4 === 0) {
        this.triggerMusicNote(rootFreq * 0.5, interval * 3.5, 0.075, 'sine', 0.12);
      }
      this.stepIdx++;
    }

    // -------------------------------------------------------------------------
    // B. SPATIAL NATURE AMBIENCE BEDS & RANDOMIZED 3D WILDLIFE / WEATHER EVENTS
    // -------------------------------------------------------------------------
    this.updateSpatialAmbience(frame, now);
  }

  private updateSpatialAmbience(f: SpatialAudioFrame, now: number): void {
    const {
      simTime,
      weather,
      vitality,
      zone,
      isNight,
      playerX,
      playerY,
      playerZ,
      camYaw,
      riverX,
    } = f;

    // 1. River proximity & stereo direction
    const riverDx = riverX - playerX;
    const riverDist = Math.abs(riverDx);
    const riverProx = 1 - smoothstep(3.5, 48, riverDist);
    const rainRiverBoost = weather === 'rain' ? 1.25 : 1.0;
    const riverTargetGain = (0.008 + riverProx * 0.145) * rainRiverBoost;
    const riverPanVal = computeStereoPan(riverDx, 0, camYaw) * smoothstep(2.0, 11.0, riverDist);

    if (this.riverGain && this.riverFilter) {
      this.riverGain.gain.setTargetAtTime(riverTargetGain, now, 0.25);
      this.riverFilter.frequency.setTargetAtTime(420 + riverProx * 540, now, 0.35);
      if (this.riverPan) {
        this.riverPan.pan.setTargetAtTime(riverPanVal, now, 0.18);
      }
    }

    // 2. Waterfall proximity & stereo direction
    const fallDx = WATERFALL_POS.x - playerX;
    const fallDz = WATERFALL_POS.z - playerZ;
    const fallDist = Math.hypot(fallDx, fallDz);
    const fallProx = 1 - smoothstep(5, 56, fallDist);
    const fallTargetGain = fallProx * fallProx * 0.24;
    const fallPanVal = computeStereoPan(fallDx, fallDz, camYaw);

    if (this.fallGain && this.fallFilter) {
      this.fallGain.gain.setTargetAtTime(fallTargetGain, now, 0.28);
      this.fallFilter.frequency.setTargetAtTime(680 + fallProx * 1750, now, 0.3);
      if (this.fallPan) {
        this.fallPan.pan.setTargetAtTime(fallPanVal, now, 0.18);
      }
    }

    const season = f.season ?? 'spring';
    const climate = f.climateEvent ?? 'none';
    const subBiome = f.subBiome ?? 'valley_core';

    // 3. Elevation, season, blizzard & sky-isles wind whistling layer
    const elevFactor = smoothstep(0.6, 4.2, playerY);
    const zoneWind =
      zone === 'terrace' ? 0.55 : zone === 'ruins' ? 0.35 : zone === 'cavern' ? 0.1 : 0.2;
    const weatherWind =
      weather === 'breeze' ? 1.25 : weather === 'mist' ? 0.95 : weather === 'rain' ? 1.35 : 0.72;
    const seasonWindMult =
      climate === 'blizzard'
        ? 2.25
        : season === 'winter'
          ? 1.55
          : subBiome === 'sky_isles'
            ? 1.65
            : 1.0;
    const gustLfo = 0.68 + 0.32 * Math.sin(simTime * 0.42 + playerX * 0.03);
    const windTargetGain =
      (0.014 + elevFactor * 0.085 + zoneWind * 0.045) * weatherWind * seasonWindMult * gustLfo;
    const windPitchHz =
      360 +
      elevFactor * 240 +
      (climate === 'blizzard' ? 210 : season === 'winter' ? 110 : 0) +
      Math.sin(simTime * 0.57) * 95;

    if (this.windGain && this.windFilter) {
      this.windGain.gain.setTargetAtTime(Math.min(0.24, windTargetGain), now, 0.45);
      this.windFilter.frequency.setTargetAtTime(windPitchHz, now, 0.35);
      if (this.windPan) {
        this.windPan.pan.setTargetAtTime(Math.sin(simTime * 0.24 - camYaw) * 0.55, now, 0.5);
      }
    }

    // 4. Rain texture bed
    if (this.rainGain) {
      const targetRain = weather === 'rain' ? 0.16 : weather === 'mist' ? 0.035 : 0.0001;
      this.rainGain.gain.setTargetAtTime(targetRain, now, 0.8);
    }

    // 5. Randomized Daytime Bird Chirps (quiet in blizzard/winter storms)
    if (
      !isNight &&
      zone !== 'cavern' &&
      weather !== 'rain' &&
      climate !== 'blizzard' &&
      simTime >= this.nextBirdAt
    ) {
      const treeRichness =
        zone === 'forest'
          ? 1.0
          : zone === 'island'
            ? 0.9
            : zone === 'plaza'
              ? 0.75
              : zone === 'river'
                ? 0.65
                : 0.35;
      const seasonBirdMult = season === 'winter' ? 0.35 : season === 'spring' ? 1.25 : 1.0;
      const vitalityFactor = 0.28 + 0.72 * (vitality / 100);
      const baseWait = 2.6 + Math.random() * 4.2;
      this.nextBirdAt = simTime + baseWait / (treeRichness * vitalityFactor * seasonBirdMult + 0.2);

      // Compute directional stereo pan toward forest canopy or nearby tree crown
      const biasToForest = Math.hypot(FOREST_CANOPY_POS.x - playerX, FOREST_CANOPY_POS.z - playerZ) < 60;
      const srcDx = biasToForest
        ? FOREST_CANOPY_POS.x - playerX + (Math.random() - 0.5) * 24
        : (Math.random() - 0.5) * 32;
      const srcDz = biasToForest
        ? FOREST_CANOPY_POS.z - playerZ + (Math.random() - 0.5) * 24
        : (Math.random() - 0.5) * 32;
      const pan = computeStereoPan(srcDx, srcDz, camYaw);
      const distGain = clamp(0.038 + vitalityFactor * 0.048, 0.03, 0.095);

      this.playSpatialBirdChirp(pan, distGain, vitality);
    }

    // 6. Randomized Nighttime Crickets & Distant Owls
    if (
      isNight &&
      zone !== 'cavern' &&
      weather !== 'rain' &&
      season !== 'winter' &&
      climate !== 'blizzard' &&
      simTime >= this.nextNightCritterAt
    ) {
      const vitalityFactor = 0.35 + 0.65 * (vitality / 100);
      this.nextNightCritterAt = simTime + (2.0 + Math.random() * 3.6) / vitalityFactor;

      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 14;
      const pan = computeStereoPan(Math.cos(angle) * dist, Math.sin(angle) * dist, camYaw);

      if ((zone === 'forest' || zone === 'ruins') && Math.random() < 0.22) {
        // Distant haunting forest/ruins owl call
        const forestPan = computeStereoPan(
          FOREST_CANOPY_POS.x - playerX,
          FOREST_CANOPY_POS.z - playerZ,
          camYaw,
        );
        this.playSpatialOwlHoot(forestPan, 0.065);
      } else {
        this.playSpatialCricketTrill(pan, 0.038 + vitalityFactor * 0.025);
      }
    }

    // 7. Randomized High Wind Whistles (Terrace, Ruins, elevated ridges, or breeze/rain)
    if (
      (zone === 'terrace' || zone === 'ruins' || playerY > 1.7 || weather === 'breeze') &&
      zone !== 'cavern' &&
      simTime >= this.nextWindGustAt
    ) {
      const interval = zone === 'terrace' ? 4.5 + Math.random() * 5.0 : 7.0 + Math.random() * 7.5;
      this.nextWindGustAt = simTime + interval;
      const panStart = (Math.random() - 0.5) * 1.4;
      this.playSpatialWindWhistle(panStart, zone === 'terrace' ? 0.075 : 0.045);
    }

    // 8. Cavern Echoing Water Drips
    const nearCavern =
      zone === 'cavern' || Math.hypot(CAVERN_POS.x - playerX, CAVERN_POS.z - playerZ) < 26;
    if (nearCavern && simTime >= this.nextCaveDripAt) {
      this.nextCaveDripAt = simTime + 1.9 + Math.random() * 3.4;
      const pan = clamp((Math.random() - 0.5) * 1.6, -0.85, 0.85);
      this.playCavernWaterDrip(pan, zone === 'cavern' ? 0.085 : 0.045);
    }
  }

  private playSpatialBirdChirp(panValue: number, vol: number, vitality: number): void {
    if (!this.ctx || !this.ambienceMaster) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const panner = this.createStereoPanNode(ctx);
      if (panner) {
        panner.pan.setValueAtTime(panValue, now);
        panner.connect(this.ambienceMaster);
      }
      const dest: AudioNode = panner || this.ambienceMaster;

      const syllables = vitality >= 55 ? 2 + Math.floor(Math.random() * 3) : 2;
      const basePitch = 2050 + Math.random() * 1450;

      for (let i = 0; i < syllables; i++) {
        const t0 = now + i * (0.095 + Math.random() * 0.065);
        const dur = 0.065 + Math.random() * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';

        const fStart = basePitch * (0.9 + Math.random() * 0.25);
        const fPeak = fStart * (1.28 + Math.random() * 0.35);
        const fEnd = fStart * (0.85 + Math.random() * 0.2);

        osc.frequency.setValueAtTime(fStart, t0);
        osc.frequency.exponentialRampToValueAtTime(fPeak, t0 + dur * 0.45);
        osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + dur);

        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      }
    } catch {
      // Ignore audio edge errors
    }
  }

  private playSpatialCricketTrill(panValue: number, vol: number): void {
    if (!this.ctx || !this.ambienceMaster) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const panner = this.createStereoPanNode(ctx);
      if (panner) {
        panner.pan.setValueAtTime(panValue, now);
        panner.connect(this.ambienceMaster);
      }
      const dest: AudioNode = panner || this.ambienceMaster;

      const pulses = 4 + Math.floor(Math.random() * 3);
      const carrierFreq = 3850 + Math.random() * 650;

      for (let i = 0; i < pulses; i++) {
        const t0 = now + i * 0.042;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(carrierFreq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.007);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t0);
        osc.stop(t0 + 0.038);
      }
    } catch {
      // Ignore
    }
  }

  private playSpatialOwlHoot(panValue: number, vol: number): void {
    if (!this.ctx || !this.ambienceMaster) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const panner = this.createStereoPanNode(ctx);
      if (panner) {
        panner.pan.setValueAtTime(panValue, now);
        panner.connect(this.ambienceMaster);
      }
      const dest: AudioNode = panner || this.ambienceMaster;

      [
        { offset: 0, f0: 410, f1: 350, dur: 0.42 },
        { offset: 0.56, f0: 370, f1: 315, dur: 0.55 },
      ].forEach((call) => {
        const t0 = now + call.offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(call.f0, t0);
        osc.frequency.exponentialRampToValueAtTime(call.f1, t0 + call.dur);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + call.dur);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(t0);
        osc.stop(t0 + call.dur + 0.04);
      });
    } catch {
      // Ignore
    }
  }

  private playSpatialWindWhistle(panStart: number, vol: number): void {
    if (!this.ctx || !this.ambienceMaster) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const dur = 1.9 + Math.random() * 1.1;
      const f0 = 420 + Math.random() * 180;
      const f1 = f0 * (0.82 + Math.random() * 0.42);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = this.createStereoPanNode(ctx);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f1, now + dur);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol * 0.55, now + dur * 0.42);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(clamp(panStart, -0.85, 0.85), now);
        panner.pan.linearRampToValueAtTime(clamp(-panStart * 0.7, -0.85, 0.85), now + dur);
        gain.connect(panner);
        panner.connect(this.ambienceMaster);
      } else {
        gain.connect(this.ambienceMaster);
      }

      osc.start(now);
      osc.stop(now + dur + 0.05);
    } catch {
      // Ignore
    }
  }

  private playCavernWaterDrip(panValue: number, vol: number): void {
    if (!this.ctx || !this.ambienceMaster) return;
    try {
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const f0 = 760 + Math.random() * 340;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = this.createStereoPanNode(ctx);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.85, now + 0.055);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

      osc.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(panValue, now);
        gain.connect(panner);
        panner.connect(this.ambienceMaster);
      } else {
        gain.connect(this.ambienceMaster);
      }

      if (this.caveDelayNode) {
        gain.connect(this.caveDelayNode);
      }

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  playFootstep(onWater: boolean, simTime: number): void {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    if (simTime - this.lastFootstepAt < 0.34) return;
    this.lastFootstepAt = simTime;
    const freq = onWater ? 340 + Math.random() * 90 : 120 + Math.random() * 30;
    this.triggerTone(freq, onWater ? 0.11 : 0.06, onWater ? 0.07 : 0.035, 'sine');
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
        this.triggerTone(420, 0.08, 0.12, 'sine');
        break;
      case 'gather':
        this.triggerTone(587.33, 0.14, 0.17, 'triangle');
        setTimeout(() => this.triggerTone(880, 0.18, 0.14, 'sine'), 65);
        break;
      case 'build':
        this.triggerTone(261.63, 0.25, 0.18, 'triangle');
        setTimeout(() => this.triggerTone(392, 0.28, 0.15, 'triangle'), 70);
        setTimeout(() => this.triggerTone(523.25, 0.36, 0.14, 'sine'), 140);
        break;
      case 'upgrade':
        [330, 440, 554.37, 659.25].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.32, 0.14, 'triangle'), idx * 75),
        );
        break;
      case 'pulse':
        this.triggerSweep(165, 495, 0.65, 0.2);
        break;
      case 'secret':
      case 'complete':
        [392, 493.88, 587.33, 783.99].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.45, 0.17, 'sine'), idx * 95),
        );
        break;
      case 'talk':
        this.triggerTone(480, 0.09, 0.09, 'sine');
        break;
      case 'damage':
        this.triggerSweep(210, 75, 0.28, 0.24);
        break;
      case 'purify':
        [440, 554.37, 659.25, 880].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.34, 0.16, 'sine'), idx * 55),
        );
        break;
      case 'craft':
        [392, 523.25, 659.25].forEach((f, idx) =>
          setTimeout(() => this.triggerTone(f, 0.24, 0.16, 'triangle'), idx * 60),
        );
        break;
      case 'consume':
        this.triggerTone(523.25, 0.14, 0.14, 'sine');
        setTimeout(() => this.triggerTone(659.25, 0.2, 0.12, 'sine'), 75);
        break;
      case 'portal':
        this.triggerSweep(240, 720, 0.72, 0.2);
        break;
      case 'meteor':
        this.triggerSweep(920, 180, 0.52, 0.22);
        break;
      case 'updraft':
        this.triggerSweep(260, 680, 0.44, 0.18);
        break;
      default:
        break;
    }
  }

  private triggerMusicNote(
    freq: number,
    dur: number,
    vol: number,
    wave: OscillatorType,
    attack = 0.05,
  ): void {
    if (!this.ctx || !this.musicBus) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(vol, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(this.musicBus);
      osc.start(now);
      osc.stop(now + dur + 0.04);
    } catch {
      // Ignore audio context edge errors
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
