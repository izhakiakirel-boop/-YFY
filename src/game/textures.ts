import * as THREE from 'three';

export interface ProceduralTexturePack {
  wood: THREE.CanvasTexture;
  stone: THREE.CanvasTexture;
  plaster: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  terrainDetail: THREE.CanvasTexture;
  softGlow: THREE.CanvasTexture;
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

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy || 1));

  // 1. Timber / Wood Plank Grain
  const [woodC, woodCtx] = makeCanvas(256, 256);
  woodCtx.fillStyle = '#8b5e3c';
  woodCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 64; i++) {
    const y = (i * 4) % 256;
    woodCtx.fillStyle = i % 2 === 0 ? 'rgba(65, 38, 20, 0.22)' : 'rgba(218, 173, 120, 0.14)';
    woodCtx.fillRect(0, y, 256, 2);
  }
  for (let p = 0; p < 4; p++) {
    woodCtx.fillStyle = 'rgba(38, 22, 11, 0.55)';
    woodCtx.fillRect(0, p * 64, 256, 3);
  }
  const wood = finishTexture(woodC, aniso, true, 1, 1);

  // 2. Carved Valley Stone
  const [stoneC, stoneCtx] = makeCanvas(256, 256);
  stoneCtx.fillStyle = '#798582';
  stoneCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const x = (i * 73) % 256;
    const y = (i * 139) % 256;
    const r = 2 + (i % 7);
    stoneCtx.fillStyle = i % 3 === 0 ? 'rgba(235, 232, 218, 0.12)' : 'rgba(32, 42, 42, 0.16)';
    stoneCtx.beginPath();
    stoneCtx.arc(x, y, r, 0, Math.PI * 2);
    stoneCtx.fill();
  }
  stoneCtx.strokeStyle = 'rgba(42, 50, 50, 0.35)';
  stoneCtx.lineWidth = 2;
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

  // 3. Warm Cottage Plaster
  const [plasterC, plasterCtx] = makeCanvas(256, 256);
  plasterCtx.fillStyle = '#dfd1b6';
  plasterCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    plasterCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 248, 230, 0.16)' : 'rgba(148, 128, 98, 0.12)';
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

  // 5. Micro Terrain Grass & Mineral Detail
  const [terrC, terrCtx] = makeCanvas(512, 512);
  terrCtx.fillStyle = '#ffffff';
  terrCtx.fillRect(0, 0, 512, 512);
  let seed = 48129;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 4500; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const shade = 215 + Math.floor(rnd() * 40);
    terrCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade - 8}, 0.28)`;
    terrCtx.fillRect(x, y, 2 + rnd() * 4, 2 + rnd() * 3);
  }
  const terrainDetail = finishTexture(terrC, aniso, true, 26, 26);

  // 6. Soft Glow Halo
  const [glowC, glowCtx] = makeCanvas(128, 128);
  const gGrad = glowCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
  gGrad.addColorStop(0, 'rgba(255,255,255,1)');
  gGrad.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  gGrad.addColorStop(1, 'rgba(255,255,255,0)');
  glowCtx.fillStyle = gGrad;
  glowCtx.fillRect(0, 0, 128, 128);
  const softGlow = new THREE.CanvasTexture(glowC);
  softGlow.colorSpace = THREE.SRGBColorSpace;

  // 7. Ground Contact Shadow
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
    stone,
    plaster,
    roof,
    terrainDetail,
    softGlow,
    contactShadow,
    dispose() {
      wood.dispose();
      stone.dispose();
      plaster.dispose();
      roof.dispose();
      terrainDetail.dispose();
      softGlow.dispose();
      contactShadow.dispose();
    },
  };
}
