import * as THREE from 'three';

export interface ProceduralTexturePack {
  wood: THREE.CanvasTexture;
  woodNormal: THREE.DataTexture;
  stone: THREE.CanvasTexture;
  stoneNormal: THREE.DataTexture;
  plaster: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  terrainDetail: THREE.CanvasTexture;
  terrainNormal: THREE.DataTexture;
  softGlow: THREE.CanvasTexture;
  cloudPuff: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finishTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

/**
 * Converts grayscale luminance of a canvas heightfield into a tangent-space PBR normal map
 * (NoColorSpace linear space) for crisp tactile relief under directional sunlight.
 */
function generateNormalMap(
  canvas: HTMLCanvasElement,
  strength: number,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.DataTexture {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);

  const sampleH = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    const idx = (wy * w + wx) * 4;
    return (img[idx] * 0.299 + img[idx + 1] * 0.587 + img[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hl = sampleH(x - 1, y);
      const hr = sampleH(x + 1, y);
      const hu = sampleH(x, y - 1);
      const hd = sampleH(x, y + 1);
      const dx = (hl - hr) * strength;
      const dy = (hu - hd) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz) || 1;
      const idx = (y * w + x) * 4;
      out[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      out[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy || 1));

  // 1. Timber / Wood Plank Grain + Relief Normal
  const [woodC, woodCtx] = makeCanvas(256, 256);
  woodCtx.fillStyle = '#8b5e3c';
  woodCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 128; i++) {
    const y = (i * 2) % 256;
    const wave = Math.sin(i * 0.35) * 14;
    woodCtx.fillStyle = i % 2 === 0 ? 'rgba(54, 31, 15, 0.25)' : 'rgba(222, 178, 126, 0.16)';
    woodCtx.fillRect(0, y, 256, 2);
    woodCtx.fillStyle = 'rgba(72, 42, 22, 0.14)';
    woodCtx.fillRect((i * 19 + wave) % 256, y, 36, 1.5);
  }
  for (let p = 0; p < 4; p++) {
    woodCtx.fillStyle = 'rgba(30, 16, 8, 0.68)';
    woodCtx.fillRect(0, p * 64, 256, 3);
  }
  const wood = finishTexture(woodC, aniso, true, 1, 1);
  const woodNormal = generateNormalMap(woodC, 2.2, aniso, 1, 1);

  // 2. Carved & Weathered Valley Stone + Deep Masonry Normal
  const [stoneC, stoneCtx] = makeCanvas(256, 256);
  stoneCtx.fillStyle = '#798582';
  stoneCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 950; i++) {
    const x = (i * 73) % 256;
    const y = (i * 139) % 256;
    const r = 1.5 + (i % 6);
    stoneCtx.fillStyle = i % 3 === 0 ? 'rgba(240, 236, 224, 0.16)' : 'rgba(26, 34, 34, 0.2)';
    stoneCtx.beginPath();
    stoneCtx.arc(x, y, r, 0, Math.PI * 2);
    stoneCtx.fill();
  }
  stoneCtx.strokeStyle = 'rgba(32, 40, 40, 0.5)';
  stoneCtx.lineWidth = 2.5;
  for (let row = 0; row < 4; row++) {
    const y = row * 64;
    stoneCtx.beginPath();
    stoneCtx.moveTo(0, y);
    stoneCtx.lineTo(256, y);
    stoneCtx.stroke();
    const offset = (row % 2) * 64;
    for (let col = 0; col < 2; col++) {
      stoneCtx.beginPath();
      stoneCtx.moveTo((col * 128 + offset) % 256, y);
      stoneCtx.lineTo((col * 128 + offset) % 256, y + 64);
      stoneCtx.stroke();
    }
  }
  const stone = finishTexture(stoneC, aniso, true, 1, 1);
  const stoneNormal = generateNormalMap(stoneC, 2.8, aniso, 1, 1);

  // 3. Warm Cottage Plaster
  const [plasterC, plasterCtx] = makeCanvas(256, 256);
  plasterCtx.fillStyle = '#dfd1b6';
  plasterCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    plasterCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 230, 0.18)' : 'rgba(148, 128, 98, 0.14)';
    plasterCtx.fillRect((i * 53) % 256, (i * 97) % 256, 6, 4);
  }
  const plaster = finishTexture(plasterC, aniso, true, 1, 1);

  // 4. Shingle Roof Tiles
  const [roofC, roofCtx] = makeCanvas(256, 256);
  roofCtx.fillStyle = '#6c4946';
  roofCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    for (let col = 0; col < 8; col++) {
      const x = col * 32 + (row % 2) * 16;
      roofCtx.fillStyle = (row + col) % 2 === 0 ? '#7c534d' : '#63413e';
      roofCtx.fillRect(x % 256, y, 30, 30);
      roofCtx.strokeStyle = 'rgba(26, 14, 14, 0.45)';
      roofCtx.strokeRect(x % 256, y, 30, 30);
    }
  }
  const roof = finishTexture(roofC, aniso, true, 2, 2);

  // 5. Micro Terrain Soil, Grass Blades & Pebble Relief + Terrain Normal Map
  const [terrC, terrCtx] = makeCanvas(512, 512);
  terrCtx.fillStyle = '#f2f3ed';
  terrCtx.fillRect(0, 0, 512, 512);
  let seed = 48129;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 7500; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const shade = 200 + Math.floor(rnd() * 55);
    terrCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 10}, 0.34)`;
    terrCtx.fillRect(x, y, 1.8 + rnd() * 4.5, 1.8 + rnd() * 4);
  }
  const terrainDetail = finishTexture(terrC, aniso, true, 32, 32);
  const terrainNormal = generateNormalMap(terrC, 2.0, aniso, 32, 32);

  // 6. Soft Glow Halo
  const [glowC, glowCtx] = makeCanvas(128, 128);
  const gGrad = glowCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gGrad.addColorStop(0, 'rgba(255,255,255,1)');
  gGrad.addColorStop(0.28, 'rgba(255,255,255,0.58)');
  gGrad.addColorStop(1, 'rgba(255,255,255,0)');
  glowCtx.fillStyle = gGrad;
  glowCtx.fillRect(0, 0, 128, 128);
  const softGlow = new THREE.CanvasTexture(glowC);
  softGlow.colorSpace = THREE.SRGBColorSpace;

  // 7. Volumetric Cloud Puff Sprite
  const [cloudC, cloudCtx] = makeCanvas(128, 128);
  const cGrad = cloudCtx.createRadialGradient(64, 62, 6, 64, 64, 60);
  cGrad.addColorStop(0, 'rgba(255,255,255,0.92)');
  cGrad.addColorStop(0.55, 'rgba(242,248,255,0.45)');
  cGrad.addColorStop(1, 'rgba(242,248,255,0)');
  cloudCtx.fillStyle = cGrad;
  cloudCtx.fillRect(0, 0, 128, 128);
  const cloudPuff = new THREE.CanvasTexture(cloudC);
  cloudPuff.colorSpace = THREE.SRGBColorSpace;

  // 8. Ground Contact Shadow
  const [shadC, shadCtx] = makeCanvas(128, 128);
  const sGrad = shadCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  sGrad.addColorStop(0, 'rgba(5,16,18,0.68)');
  sGrad.addColorStop(0.55, 'rgba(5,16,18,0.28)');
  sGrad.addColorStop(1, 'rgba(5,16,18,0)');
  shadCtx.fillStyle = sGrad;
  shadCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadC);

  return {
    wood,
    woodNormal,
    stone,
    stoneNormal,
    plaster,
    roof,
    terrainDetail,
    terrainNormal,
    softGlow,
    cloudPuff,
    contactShadow,
    dispose() {
      wood.dispose();
      woodNormal.dispose();
      stone.dispose();
      stoneNormal.dispose();
      plaster.dispose();
      roof.dispose();
      terrainDetail.dispose();
      terrainNormal.dispose();
      softGlow.dispose();
      cloudPuff.dispose();
      contactShadow.dispose();
    },
  };
}
