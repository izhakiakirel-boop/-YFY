import type { PlacedBuilding, ZoneId } from './types';

export const WORLD_HALF = 118;
export const WATER_LEVEL = -0.42;

export const MAIN_BRIDGE_POS = { x: 11.2, z: -14 };
export const ISLAND_BRIDGE_POS = { x: 37.5, z: 48 };
export const FORD_Z = 56;

export function riverCenterX(z: number): number {
  return 16.5 + 10.5 * Math.sin(z * 0.036) + 4.8 * Math.cos(z * 0.074);
}

export function riverHalfWidth(z: number): number {
  return 6.6 + 1.4 * Math.sin(z * 0.06 + 0.8);
}

/**
 * Secondary eastern fork curving around the Hidden Waterfall Island at (56, 50)
 */
export function islandMoatFactor(x: number, z: number): number {
  const dx = x - 56;
  const dz = z - 50;
  const d = Math.hypot(dx, dz);
  // Ring moat around radius ~19.5
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
 * Continuous analytical terrain height at any (x, z) coordinate.
 */
export function groundHeightAt(x: number, z: number): number {
  // Base gentle valley undulation
  let h =
    0.45 * Math.sin(x * 0.045) * Math.cos(z * 0.042) +
    0.28 * Math.sin((x + z) * 0.07) +
    0.15 * Math.cos(x * 0.13 - z * 0.09);

  // Flatten central village plaza around (-16, 0)
  const plazaDist = Math.hypot(x + 15, z);
  const plazaFlat = 1 - smoothstep(10, 28, plazaDist);
  h = h * (1 - plazaFlat) + 0.38 * plazaFlat;

  // Southwest Dry Terrace plateau centered at (-62, 54)
  const terraceDist = Math.hypot((x + 62) * 0.9, (z - 54) * 1.0);
  const terraceRaise = 1 - smoothstep(20, 38, terraceDist);
  // Natural walkable ramp from (-34, 24) toward (-52, 42)
  const rampDist = Math.abs((x + 42) * 0.72 + (z - 34) * 0.69);
  const rampAlign = 1 - smoothstep(16, 36, Math.hypot(x + 44, z - 36));
  const rampSmooth = (1 - smoothstep(5, 13, rampDist)) * rampAlign;
  h += terraceRaise * 3.1 + rampSmooth * 0.35;

  // Northwest Sunken Ruins terraced clearing at (-66, -62)
  const ruinsDist = Math.hypot(x + 66, z + 62);
  const ruinsFlat = 1 - smoothstep(12, 24, ruinsDist);
  h = h * (1 - ruinsFlat) + 1.05 * ruinsFlat;

  // Northeast Echo Cavern basin & cliff rim at (72, -68)
  const caveDist = Math.hypot(x - 72, z + 68);
  const caveFloor = 1 - smoothstep(9, 17, caveDist);
  const caveRim = smoothstep(13, 21, caveDist) * (1 - smoothstep(21, 34, caveDist));
  h = h * (1 - caveFloor) + 0.55 * caveFloor + caveRim * 4.4;

  // Hidden Waterfall Island mound at (56, 50)
  const islandDist = Math.hypot(x - 56, z - 50);
  const islandRise = 1 - smoothstep(8, 15, islandDist);
  h += islandRise * 1.65;

  // Outer valley mountain rim beyond radius 92
  const edgeDist = Math.max(Math.abs(x), Math.abs(z));
  const rim = smoothstep(88, 118, edgeDist);
  h += rim * rim * 8.5;

  // Carve main river channel
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
  // Stepping stone ford in the south
  if (Math.abs(z - FORD_Z) < 2.6 && Math.abs(x - riverCenterX(z)) < riverHalfWidth(z) + 2) {
    return true;
  }
  // Built bridges allow smooth walking across rivers/moats
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
  if (x > 26 && z < 32 && z > -55) return 'forest';
  return 'plaza';
}
