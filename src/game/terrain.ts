import type { BiomePresetId, PlacedBuilding, ZoneId } from './types';

export const WORLD_HALF = 118;
export const CHUNK_SIZE = 80;
export const WATER_LEVEL = -0.42;

export const MAIN_BRIDGE_POS = { x: 11.2, z: -14 };
export const ISLAND_BRIDGE_POS = { x: 37.5, z: 48 };
export const FORD_Z = 56;

let activeSeed = 104729;
let activeBiome: BiomePresetId = 'verdant';
let riverPhaseA = 0.0;
let riverPhaseB = 0.0;
let riverAmpMult = 1.0;
let hillMult = 1.0;

export function hashStringSeed(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 104729;
  const num = Number(trimmed);
  if (Number.isFinite(num) && Math.floor(num) === num && Math.abs(num) > 0) {
    return Math.abs(Math.floor(num)) % 9999999 || 104729;
  }
  let h = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    h ^= trimmed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 9999999 || 104729;
}

export function setActiveWorldConfig(seed: number, biome: BiomePresetId): void {
  activeSeed = Math.abs(Math.floor(seed)) || 104729;
  activeBiome = biome;
  const r1 = seededFloat(activeSeed, 11, 3);
  const r2 = seededFloat(activeSeed, 29, 7);
  // Keep central river crossing aligned while giving each world distinct outer meander
  riverPhaseA = (r1 - 0.5) * 1.4;
  riverPhaseB = (r2 - 0.5) * 1.8;
  riverAmpMult = biome === 'archipelago' ? 1.65 : biome === 'arid_winds' ? 0.72 : 1.0;
  hillMult = biome === 'arid_winds' ? 1.38 : biome === 'archipelago' ? 0.65 : biome === 'mystic_night' ? 1.15 : 1.0;
}

export function getActiveWorldConfig(): { seed: number; biome: BiomePresetId } {
  return { seed: activeSeed, biome: activeBiome };
}

export function chunkSeedHash(seed: number, cx: number, cz: number): number {
  let h = seed ^ Math.imul(cx, 374761393) ^ Math.imul(cz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createSeededRng(seedVal: number): () => number {
  let a = seedVal >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededFloat(seed: number, ix: number, iz: number): number {
  let h = seed ^ Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise2D(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);

  const a = seededFloat(seed, ix, iz);
  const b = seededFloat(seed, ix + 1, iz);
  const c = seededFloat(seed, ix, iz + 1);
  const d = seededFloat(seed, ix + 1, iz + 1);

  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm2D(x: number, z: number, seed = activeSeed): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < 4; i++) {
    sum += (valueNoise2D(x * freq, z * freq, seed + i * 97) * 2 - 1) * amp;
    freq *= 2.04;
    amp *= 0.48;
  }
  return sum;
}

export function riverCenterX(z: number): number {
  const outerFactor = smoothstep(55, 130, Math.abs(z));
  const core = 16.5 + 10.5 * Math.sin(z * 0.036) + 4.8 * Math.cos(z * 0.074);
  const seedWander =
    outerFactor *
    riverAmpMult *
    (18 * Math.sin(z * 0.017 + riverPhaseA) + 9 * Math.cos(z * 0.031 + riverPhaseB));
  return core + seedWander;
}

export function riverHalfWidth(z: number): number {
  const base = 6.6 + 1.4 * Math.sin(z * 0.06 + 0.8);
  return activeBiome === 'archipelago' ? base * 1.32 : activeBiome === 'arid_winds' ? base * 0.82 : base;
}

/**
 * Secondary eastern fork curving around the Hidden Waterfall Island at (56, 50)
 */
export function islandMoatFactor(x: number, z: number): number {
  const dx = x - 56;
  const dz = z - 50;
  const d = Math.hypot(dx, dz);
  const ringDist = Math.abs(d - 19.5);
  if (ringDist > 6.5) return 0;
  const t = 1 - ringDist / 6.5;
  return t * t * (3 - 2 * t);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Continuous analytical + seeded infinite procedural terrain height at ANY (x, z).
 */
export function groundHeightAt(x: number, z: number): number {
  // Base gentle valley undulation + biome seeded FBM
  const noiseBase = fbm2D(x * 0.014, z * 0.014, activeSeed);
  const noiseDetail = fbm2D(x * 0.048, z * 0.048, activeSeed + 511);

  let h =
    0.45 * Math.sin(x * 0.045) * Math.cos(z * 0.042) +
    0.28 * Math.sin((x + z) * 0.07) +
    0.15 * Math.cos(x * 0.13 - z * 0.09) +
    noiseBase * 1.45 * hillMult +
    noiseDetail * 0.35;

  // Preserve quest hub playability around central valley while blending seamlessly into endless frontier
  const radial = Math.hypot(x, z);
  const hubMask = 1 - smoothstep(72, 128, radial);
  const frontierMask = smoothstep(82, 138, radial);

  // Flatten central village plaza around (-15, 0)
  const plazaDist = Math.hypot(x + 15, z);
  const plazaFlat = (1 - smoothstep(10, 28, plazaDist)) * hubMask;
  h = h * (1 - plazaFlat) + 0.38 * plazaFlat;

  // Southwest Dry Terrace plateau centered at (-62, 54)
  const terraceDist = Math.hypot((x + 62) * 0.9, (z - 54) * 1.0);
  const terraceRaise = (1 - smoothstep(20, 38, terraceDist)) * hubMask;
  const rampDist = Math.abs((x + 42) * 0.72 + (z - 34) * 0.69);
  const rampAlign = 1 - smoothstep(16, 36, Math.hypot(x + 44, z - 36));
  const rampSmooth = (1 - smoothstep(5, 13, rampDist)) * rampAlign;
  h += terraceRaise * 3.1 + rampSmooth * 0.35;

  // Northwest Sunken Ruins terraced clearing at (-66, -62)
  const ruinsDist = Math.hypot(x + 66, z + 62);
  const ruinsFlat = (1 - smoothstep(12, 24, ruinsDist)) * hubMask;
  h = h * (1 - ruinsFlat) + 1.05 * ruinsFlat;

  // Northeast Echo Cavern basin & cliff rim at (72, -68)
  const caveDist = Math.hypot(x - 72, z + 68);
  const caveFloor = (1 - smoothstep(9, 17, caveDist)) * hubMask;
  const caveRim = smoothstep(13, 21, caveDist) * (1 - smoothstep(21, 34, caveDist)) * hubMask;
  h = h * (1 - caveFloor) + 0.55 * caveFloor + caveRim * 4.4;

  // Hidden Waterfall Island mound at (56, 50)
  const islandDist = Math.hypot(x - 56, z - 50);
  const islandRise = (1 - smoothstep(8, 15, islandDist)) * hubMask;
  h += islandRise * 1.65;

  // Outer Endless Frontier Procedural Ridges, Mesas & Lakes (no walls, boundless!)
  if (frontierMask > 0.001) {
    const ridgeNoise = 1 - Math.abs(fbm2D(x * 0.0085 + 3.1, z * 0.0085 - 2.4, activeSeed + 997));
    const mountain = Math.pow(Math.max(0, ridgeNoise), 2.1) * 13.5 * hillMult;
    const rolling = fbm2D(x * 0.019, z * 0.019, activeSeed + 1901) * 4.2 * hillMult;
    const archipSea = activeBiome === 'archipelago' ? -2.2 + smoothstep(0.1, 0.7, noiseBase) * 3.8 : 0;
    h += frontierMask * (mountain * 0.68 + rolling + archipSea);
  }

  // Carve main river channel extending North/South forever
  const rx = riverCenterX(z);
  const rw = riverHalfWidth(z);
  const distToRiver = Math.abs(x - rx);
  const riverCarve = 1 - smoothstep(rw * 0.35, rw + 4.5, distToRiver);
  h -= riverCarve * 2.15;

  // Carve island moat
  const moat = islandMoatFactor(x, z);
  h -= moat * 1.85;

  // Raise shallow stepping-stone ford at z ≈ FORD_Z
  if (Math.abs(z - FORD_Z) < 3.6 && distToRiver < rw + 2.5) {
    const fordMask = 1 - smoothstep(1.2, 3.6, Math.abs(z - FORD_Z));
    h = Math.max(h, WATER_LEVEL + 0.14 * fordMask - 0.1);
  }

  return h;
}

export function terrainSlopeAt(x: number, z: number): number {
  const eps = 0.8;
  const hx = groundHeightAt(x + eps, z) - groundHeightAt(x - eps, z);
  const hz = groundHeightAt(x, z + eps) - groundHeightAt(x, z - eps);
  return Math.hypot(hx, hz) / (2 * eps);
}

export function isOverWater(x: number, z: number): boolean {
  return groundHeightAt(x, z) < WATER_LEVEL + 0.08;
}

export function isWalkableWater(
  x: number,
  z: number,
  buildings: PlacedBuilding[],
): boolean {
  if (!isOverWater(x, z)) return true;
  if (Math.abs(z - FORD_Z) < 2.6 && Math.abs(x - riverCenterX(z)) < riverHalfWidth(z) + 2) {
    return true;
  }
  for (const b of buildings) {
    if (b.type !== 'bridge') continue;
    const dx = x - b.x;
    const dz = z - b.z;
    const cos = Math.cos(-b.rot);
    const sin = Math.sin(-b.rot);
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    const halfLen = b.tier >= 2 ? 9.5 : 8.5;
    const halfWid = b.tier >= 2 ? 3.2 : 2.6;
    if (Math.abs(lx) <= halfLen && Math.abs(lz) <= halfWid) {
      return true;
    }
  }
  return false;
}

export function bridgeDeckHeightAt(
  x: number,
  z: number,
  buildings: PlacedBuilding[],
): number | null {
  for (const b of buildings) {
    if (b.type !== 'bridge') continue;
    const dx = x - b.x;
    const dz = z - b.z;
    const cos = Math.cos(-b.rot);
    const sin = Math.sin(-b.rot);
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    const halfLen = b.tier >= 2 ? 9.5 : 8.5;
    const halfWid = b.tier >= 2 ? 3.2 : 2.6;
    if (Math.abs(lx) <= halfLen && Math.abs(lz) <= halfWid) {
      const t = lx / halfLen;
      const arch = (1 - t * t) * (b.tier === 3 ? 1.55 : b.tier === 2 ? 1.25 : 0.75);
      return WATER_LEVEL + 0.85 + arch;
    }
  }
  return null;
}

export function detectZone(x: number, z: number): ZoneId {
  if (Math.hypot(x - 72, z + 68) < 22) return 'cavern';
  if (Math.hypot(x + 66, z + 62) < 25) return 'ruins';
  if (Math.hypot(x + 62, z - 54) < 32) return 'terrace';
  if (Math.hypot(x - 56, z - 50) < 17) return 'island';
  if (Math.abs(x - riverCenterX(z)) < 16) return 'river';
  if (Math.hypot(x, z) > 118) return 'frontier';
  if (x > 26 && z < 32 && z > -55) return 'forest';
  return 'plaza';
}
