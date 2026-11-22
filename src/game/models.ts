import * as THREE from 'three';
import type { ProceduralTexturePack } from './textures';
import type { BlueprintId, CraftItemId, ResourceType } from './types';

export interface CharacterRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  scarf: THREE.Mesh;
  head: THREE.Group;
  compassGlow?: THREE.Mesh;
}

export function createCharacterRig(options: {
  coatColor: number;
  scarfColor: number;
  hairColor: number;
  skinColor?: number;
  isPlayer?: boolean;
  hasHat?: boolean;
  hasLantern?: boolean;
}): CharacterRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({
    color: options.skinColor ?? 0xe8bfa0,
    roughness: 0.72,
    metalness: 0.02,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: options.coatColor,
    roughness: 0.78,
    metalness: 0.08,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x2f2622,
    roughness: 0.85,
    metalness: 0.1,
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: 0x35434a,
    roughness: 0.84,
    metalness: 0.05,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: options.scarfColor,
    roughness: 0.7,
    metalness: 0.05,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairColor,
    roughness: 0.82,
    metalness: 0.04,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: 0x5c3e28,
    roughness: 0.6,
    metalness: 0.25,
  });

  // Articulated legs pivoted at hip (y = 0.72)
  const makeLeg = (xOff: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOff, 0.72, 0);
    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.095, 0.52, 10),
      trouserMat,
    );
    legMesh.position.y = -0.26;
    legMesh.castShadow = true;
    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.27),
      bootMat,
    );
    boot.position.set(0, -0.61, 0.04);
    boot.castShadow = true;
    legPivot.add(legMesh, boot);
    bodyGroup.add(legPivot);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);

  // Coat torso (tapered cylinder + lower flare + leather belt)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.31, 0.76, 12),
    coatMat,
  );
  torso.position.y = 1.08;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.275, 0.285, 0.1, 12),
    beltMat,
  );
  belt.position.y = 0.88;
  bodyGroup.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.09, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xe6c178, roughness: 0.3, metalness: 0.85 }),
  );
  buckle.position.set(0, 0.88, 0.26);
  bodyGroup.add(buckle);

  // Traveler Satchel / Backpack
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.42, 0.2),
    beltMat,
  );
  pack.position.set(0, 1.1, -0.26);
  pack.castShadow = true;
  bodyGroup.add(pack);

  // Scarf collar + trailing tail
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.075, 8, 16),
    scarfMat,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.44;
  bodyGroup.add(collar);

  const scarf = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.46, 0.06),
    scarfMat,
  );
  scarf.position.set(0.08, 1.24, -0.26);
  scarf.rotation.x = 0.22;
  scarf.castShadow = true;
  bodyGroup.add(scarf);

  // Articulated arms
  const makeArm = (xOff: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOff, 1.38, 0);
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.075, 0.46, 10),
      coatMat,
    );
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), skinMat);
    hand.position.y = -0.48;
    armPivot.add(sleeve, hand);
    bodyGroup.add(armPivot);
    return armPivot;
  };

  const leftArm = makeArm(-0.32);
  const rightArm = makeArm(0.32);

  let compassGlow: THREE.Mesh | undefined;
  if (options.isPlayer) {
    // Weaver's glowing wrist-compass on right hand
    compassGlow = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.07, 0),
      new THREE.MeshStandardMaterial({
        color: 0x7ef2c9,
        emissive: 0x45d8a8,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.4,
      }),
    );
    compassGlow.position.set(0, -0.45, 0.08);
    rightArm.add(compassGlow);
  } else if (options.hasLantern) {
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6),
      beltMat,
    );
    stick.position.set(0, -0.52, 0.14);
    stick.rotation.x = Math.PI / 2.2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xffe4a0,
        emissive: 0xf5b971,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      }),
    );
    bulb.position.set(0, -0.62, 0.26);
    rightArm.add(stick, bulb);
  }

  // Head group
  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);
  bodyGroup.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), skinMat);
  cranium.castShadow = true;
  head.add(cranium);

  // Expressive eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1c2529, roughness: 0.3 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
  eyeL.position.set(-0.08, 0.02, 0.195);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.08;
  head.add(eyeL, eyeR);

  // Hair cap
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.238, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat,
  );
  hairCap.rotation.x = -0.25;
  hairCap.position.y = 0.02;
  hairCap.castShadow = true;
  head.add(hairCap);

  if (options.hasHat) {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.38, 0.04, 16),
      coatMat,
    );
    brim.position.y = 0.15;
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.21, 0.28, 12),
      coatMat,
    );
    crown.position.y = 0.29;
    head.add(brim, crown);
  }

  return {
    group,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    scarf,
    head,
    compassGlow,
  };
}

export function createInventionGroup(
  type: BlueprintId,
  tier: 1 | 2 | 3,
  tex: ProceduralTexturePack,
  isGhost = false,
): THREE.Group {
  const root = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  const glowMeshes: THREE.Mesh[] = [];
  root.userData.spinners = spinners;
  root.userData.glowMeshes = glowMeshes;

  const woodMat = new THREE.MeshStandardMaterial({
    map: tex.wood,
    normalMap: tex.woodNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    color: tier === 3 ? 0xc28a59 : 0xaa7448,
    roughness: 0.76,
    metalness: 0.05,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    color: 0x899490,
    roughness: 0.86,
    metalness: 0.06,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: tier === 3 ? 0xe5b869 : 0xb8824c,
    roughness: 0.32,
    metalness: 0.82,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x5da86a,
    roughness: 0.75,
    metalness: 0.02,
  });
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x67d3ff,
    emissive: 0x166b96,
    emissiveIntensity: 0.28,
    roughness: 0.1,
    metalness: 0.18,
    transparent: true,
    opacity: 0.84,
  });
  const crystalMat = (hex: number) =>
    new THREE.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: 0.8 + tier * 0.35,
      roughness: 0.2,
      metalness: 0.35,
    });

  if (type === 'bridge') {
    const spanLen = tier >= 2 ? 18.5 : 16.5;
    const width = tier >= 2 ? 5.2 : 4.2;
    const plankCount = tier >= 2 ? 14 : 11;
    const archPeak = tier === 3 ? 1.55 : tier === 2 ? 1.25 : 0.75;

    // Stone abutments at both ends
    [-spanLen / 2, spanLen / 2].forEach((endX) => {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 2.2, width + 0.6),
        stoneMat,
      );
      pier.position.set(endX, 0.2, 0);
      pier.castShadow = true;
      pier.receiveShadow = true;
      root.add(pier);
    });

    // Arched stringer beams + individual weathered timber planks
    for (let i = 0; i < plankCount; i++) {
      const t = (i / (plankCount - 1)) * 2 - 1; // -1..1
      const px = t * (spanLen / 2 - 0.6);
      const py = 0.85 + (1 - t * t) * archPeak;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry((spanLen / plankCount) * 0.88, 0.24, width),
        woodMat,
      );
      plank.position.set(px, py, 0);
      plank.rotation.z = -t * archPeak * 0.16;
      plank.castShadow = true;
      plank.receiveShadow = true;
      root.add(plank);
    }

    // Side posts & railings (Tier 1 rope posts, Tier 2+ timber arch rails + lanterns)
    const postPositions = [-spanLen * 0.42, 0, spanLen * 0.42];
    postPositions.forEach((px) => {
      const t = px / (spanLen / 2);
      const baseY = 0.85 + (1 - t * t) * archPeak;
      [-width * 0.48, width * 0.48].forEach((pz) => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.17, 1.55, 8),
          woodMat,
        );
        post.position.set(px, baseY + 0.75, pz);
        post.castShadow = true;
        root.add(post);

        if (tier >= 2 && px === 0) {
          const lantern = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.24, 0),
            crystalMat(0xffe19c),
          );
          lantern.position.set(px, baseY + 1.72, pz);
          glowMeshes.push(lantern);
          root.add(lantern);
        }
      });
    });

    if (tier >= 2) {
      [-width * 0.48, width * 0.48].forEach((pz) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-spanLen * 0.44, 1.9, pz),
          new THREE.Vector3(0, 1.9 + archPeak + 0.35, pz),
          new THREE.Vector3(spanLen * 0.44, 1.9, pz),
        ]);
        const rail = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 16, 0.09, 6, false),
          woodMat,
        );
        rail.castShadow = true;
        root.add(rail);
      });
    }

    if (tier === 3) {
      // Grand central canopy arch
      const archCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.9 + archPeak, -width * 0.48),
        new THREE.Vector3(0, 4.4 + archPeak, 0),
        new THREE.Vector3(0, 1.9 + archPeak, width * 0.48),
      ]);
      const arch = new THREE.Mesh(
        new THREE.TubeGeometry(archCurve, 16, 0.16, 8, false),
        brassMat,
      );
      root.add(arch);
      const crest = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        crystalMat(0x7ef2c9),
      );
      crest.position.set(0, 4.4 + archPeak, 0);
      spinners.push(crest);
      glowMeshes.push(crest);
      root.add(crest);
    }
  } else if (type === 'lantern') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.72, 0.6, 8),
      stoneMat,
    );
    base.position.y = 0.3;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    const poleH = tier === 3 ? 5.2 : tier === 2 ? 4.1 : 3.2;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.16, poleH, 8),
      woodMat,
    );
    pole.position.y = 0.5 + poleH / 2;
    pole.castShadow = true;
    root.add(pole);

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.45, 6),
      brassMat,
    );
    cap.position.y = 0.6 + poleH;
    cap.castShadow = true;
    root.add(cap);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(tier === 3 ? 0.45 : 0.34, 0),
      crystalMat(tier === 3 ? 0xffe9a6 : 0xf5b971),
    );
    core.position.y = 0.25 + poleH;
    glowMeshes.push(core);
    spinners.push(core);
    root.add(core);

    if (tier >= 2) {
      const vaneGroup = new THREE.Group();
      vaneGroup.position.y = 0.45 + poleH;
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.04, 0.9),
          brassMat,
        );
        blade.rotation.y = (i * Math.PI) / 2;
        blade.position.set(
          Math.sin((i * Math.PI) / 2) * 0.55,
          0,
          Math.cos((i * Math.PI) / 2) * 0.55,
        );
        vaneGroup.add(blade);
      }
      spinners.push(vaneGroup);
      root.add(vaneGroup);
    }
    if (tier === 3) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.75, 0.06, 8, 24),
        crystalMat(0x88e9ff),
      );
      ring.position.y = 0.25 + poleH;
      spinners.push(ring);
      glowMeshes.push(ring);
      root.add(ring);
    }
  } else if (type === 'irrigator') {
    const basinRadius = tier === 3 ? 2.1 : tier === 2 ? 1.6 : 1.25;
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(basinRadius, basinRadius + 0.25, 0.6, 12),
      stoneMat,
    );
    basin.position.y = 0.3;
    basin.castShadow = true;
    basin.receiveShadow = true;
    root.add(basin);

    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(basinRadius * 0.85, basinRadius * 0.85, 0.14, 12),
      waterMat,
    );
    pool.position.y = 0.58;
    root.add(pool);

    // Timber aqueduct channels branching outward
    const channels = tier === 3 ? 4 : tier === 2 ? 3 : 2;
    for (let i = 0; i < channels; i++) {
      const a = (i / channels) * Math.PI * 2;
      const chute = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.18, 2.2),
        woodMat,
      );
      chute.position.set(Math.sin(a) * (basinRadius + 0.8), 0.45, Math.cos(a) * (basinRadius + 0.8));
      chute.rotation.y = a;
      chute.castShadow = true;
      root.add(chute);
    }

    if (tier >= 2) {
      // Rotating waterwheel
      const wheel = new THREE.Group();
      wheel.position.set(0, 1.45, 0);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.08, 8, 16), woodMat);
      wheel.add(rim);
      for (let i = 0; i < 6; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.22), brassMat);
        spoke.rotation.z = (i * Math.PI) / 3;
        wheel.add(spoke);
      }
      spinners.push(wheel);
      root.add(wheel);
    }

    if (tier === 3) {
      // Tiered blooming lotus spire
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.3, 8),
        crystalMat(0x7ef2c9),
      );
      spire.position.y = 2.55;
      glowMeshes.push(spire);
      root.add(spire);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), leafMat);
        leaf.scale.set(1.2, 0.45, 0.8);
        leaf.position.set(Math.cos(a) * (basinRadius + 0.45), 0.25, Math.sin(a) * (basinRadius + 0.45));
        root.add(leaf);
      }
    }
  } else if (type === 'raincatcher') {
    // Tripod timber legs + copper collector funnel + tank
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 3.3, 8),
        woodMat,
      );
      leg.position.set(Math.cos(a) * 0.9, 1.5, Math.sin(a) * 0.9);
      leg.rotation.z = Math.cos(a) * 0.22;
      leg.rotation.x = -Math.sin(a) * 0.22;
      leg.castShadow = true;
      root.add(leg);
    }
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.78, 1.3, 12),
      waterMat,
    );
    tank.position.y = 0.85;
    root.add(tank);

    const funnel = new THREE.Mesh(
      new THREE.ConeGeometry(tier === 3 ? 1.85 : 1.4, 1.1, 12, 1, true),
      brassMat,
    );
    funnel.rotation.x = Math.PI;
    funnel.position.y = 3.1;
    funnel.castShadow = true;
    root.add(funnel);

    if (tier >= 2) {
      const turbine = new THREE.Group();
      turbine.position.y = 3.9;
      for (let i = 0; i < 3; i++) {
        const sail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.9), crystalMat(0x98e2ff));
        sail.rotation.y = (i * Math.PI * 2) / 3;
        sail.position.set(Math.sin(sail.rotation.y) * 0.45, 0, Math.cos(sail.rotation.y) * 0.45);
        turbine.add(sail);
      }
      spinners.push(turbine);
      root.add(turbine);
    }
    if (tier === 3) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.06, 8, 24),
        crystalMat(0x88e9ff),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 4.45;
      spinners.push(ring);
      glowMeshes.push(ring);
      root.add(ring);
    }
  } else if (type === 'bench') {
    const stoneBase = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.35, 0.2, 12),
      stoneMat,
    );
    stoneBase.position.y = 0.1;
    stoneBase.receiveShadow = true;
    root.add(stoneBase);

    // Timber bench
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.78), woodMat);
    seat.position.set(0, 0.65, -0.95);
    seat.castShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.14), woodMat);
    back.position.set(0, 1.0, -1.28);
    back.castShadow = true;
    [-0.95, 0.95].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.7), stoneMat);
      leg.position.set(lx, 0.35, -0.95);
      root.add(leg);
    });
    root.add(seat, back);

    // Central hearth stone + warm ember glow
    const hearth = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.14, 8, 12),
      stoneMat,
    );
    hearth.rotation.x = Math.PI / 2;
    hearth.position.set(0, 0.25, 0.55);
    const ember = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28, 0),
      crystalMat(0xf59e58),
    );
    ember.position.set(0, 0.38, 0.55);
    glowMeshes.push(ember);
    root.add(hearth, ember);

    if (tier >= 2) {
      // Pergola canopy pillars
      [
        [-1.55, -1.55],
        [1.55, -1.55],
        [-1.55, 1.55],
        [1.55, 1.55],
      ].forEach(([px, pz]) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.8, 8), woodMat);
        p.position.set(px, 1.45, pz);
        p.castShadow = true;
        root.add(p);
      });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 3.5), woodMat);
      roof.position.y = 2.88;
      roof.castShadow = true;
      root.add(roof);
    }
    if (tier === 3) {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.1, 4), brassMat);
      spire.rotation.y = Math.PI / 4;
      spire.position.y = 3.5;
      spire.castShadow = true;
      root.add(spire);
    }
  } else if (type === 'resonance') {
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.25, 0.8, 6),
      stoneMat,
    );
    plinth.position.y = 0.4;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    root.add(plinth);

    const obelisk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.52, tier === 3 ? 4.2 : 3.0, 6),
      stoneMat,
    );
    obelisk.position.y = tier === 3 ? 2.8 : 2.2;
    obelisk.castShadow = true;
    root.add(obelisk);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(tier === 3 ? 0.65 : 0.48, 0),
      crystalMat(0xc9a6ff),
    );
    crystal.position.y = tier === 3 ? 5.6 : 4.25;
    spinners.push(crystal);
    glowMeshes.push(crystal);
    root.add(crystal);

    if (tier >= 2) {
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.055, 8, 24),
        brassMat,
      );
      ring1.position.y = tier === 3 ? 5.6 : 4.25;
      spinners.push(ring1);
      root.add(ring1);
    }
    if (tier === 3) {
      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(1.32, 0.055, 8, 28),
        crystalMat(0x7ef2c9),
      );
      ring2.rotation.x = Math.PI / 3;
      ring2.position.y = 5.6;
      spinners.push(ring2);
      glowMeshes.push(ring2);
      root.add(ring2);
    }
  }

  if (isGhost) {
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x7ef2c9,
          emissive: 0x2ca880,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.48,
          roughness: 0.4,
        });
      }
    });
  }

  return root;
}

export function createCottage(
  tex: ProceduralTexturePack,
  scale = 1,
): THREE.Group {
  const g = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    color: 0x878d86,
    roughness: 0.88,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: tex.plaster,
    color: 0xe6d9bf,
    roughness: 0.84,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: tex.roof,
    color: 0x8a584d,
    roughness: 0.76,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: tex.wood,
    normalMap: tex.woodNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    color: 0x6f4b32,
    roughness: 0.78,
  });
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a8,
    emissive: 0xf5b971,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  windowMat.userData.isCottageWindow = true;

  // Stone foundation
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.75, 5.4), stoneMat);
  base.position.y = 0.375;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Main plaster body
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.1, 4.8), wallMat);
  walls.position.y = 2.25;
  walls.castShadow = true;
  walls.receiveShadow = true;
  g.add(walls);

  // Corner timber framing
  [
    [-2.85, -2.35],
    [2.85, -2.35],
    [-2.85, 2.35],
    [2.85, 2.35],
  ].forEach(([cx, cz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.15, 0.28), woodMat);
    beam.position.set(cx, 2.25, cz);
    g.add(beam);
  });

  // Pitched roof (4-sided pyramid stretched)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.7, 2.7, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.06, 1, 0.92);
  roof.position.y = 5.1;
  roof.castShadow = true;
  g.add(roof);

  // Stone chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.3, 0.75), stoneMat);
  chimney.position.set(1.6, 4.8, -0.9);
  chimney.castShadow = true;
  g.add(chimney);

  // Front wooden door & porch awning
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.9, 0.16), woodMat);
  door.position.set(0, 1.65, 2.42);
  g.add(door);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.3), woodMat);
  awning.position.set(0, 2.7, 2.95);
  awning.rotation.x = 0.2;
  awning.castShadow = true;
  g.add(awning);

  // Warm windows
  [-1.65, 1.65].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.14), windowMat);
    win.position.set(wx, 2.25, 2.42);
    g.add(win);
  });

  g.scale.setScalar(scale);
  return g;
}

export function createTreeGroup(
  kind: 'oak' | 'pine' | 'glowwillow',
  tex: ProceduralTexturePack,
  scale = 1,
): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    map: tex.wood,
    normalMap: tex.woodNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: kind === 'glowwillow' ? 0x5c5368 : 0x6b4b35,
    roughness: 0.88,
  });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.48, 3.2, 8),
    trunkMat,
  );
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

  // Splayed organic root buttresses
  for (let r = 0; r < 3; r++) {
    const a = (r / 3) * Math.PI * 2 + 0.4;
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.22, 0.95, 6), trunkMat);
    root.position.set(Math.cos(a) * 0.34, 0.26, Math.sin(a) * 0.34);
    root.rotation.z = Math.cos(a) * 0.65;
    root.rotation.x = -Math.sin(a) * 0.65;
    root.castShadow = true;
    g.add(root);
  }

  if (kind === 'pine') {
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2d644b,
      roughness: 0.85,
    });
    [0, 1, 2].forEach((layer) => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.95 - layer * 0.42, 2.3 - layer * 0.25, 8),
        foliageMat,
      );
      cone.position.y = 2.7 + layer * 1.35;
      cone.castShadow = true;
      cone.receiveShadow = true;
      g.add(cone);
    });
  } else if (kind === 'oak') {
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x3e7d4f,
      roughness: 0.82,
    });
    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0x589b5d,
      roughness: 0.8,
    });
    const clusters: [number, number, number, number, boolean][] = [
      [0, 4.1, 0, 1.75, false],
      [-1.05, 3.55, 0.55, 1.25, true],
      [1.05, 3.65, -0.45, 1.3, false],
      [0.2, 4.95, 0.35, 1.15, true],
    ];
    clusters.forEach(([x, y, z, r, hi]) => {
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(r, 1),
        hi ? highlightMat : foliageMat,
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    });
  } else {
    // Glow willow in the eastern enchanted forest
    const willowMat = new THREE.MeshStandardMaterial({
      color: 0x366d68,
      emissive: 0x15403d,
      emissiveIntensity: 0.35,
      roughness: 0.72,
    });
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(2.05, 1), willowMat);
    canopy.position.y = 4.25;
    canopy.scale.set(1.15, 0.9, 1.15);
    canopy.castShadow = true;
    g.add(canopy);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xaef6ff,
          emissive: 0x76e0ff,
          emissiveIntensity: 1.4,
        }),
      );
      orb.position.set(Math.cos(a) * 1.5, 2.75, Math.sin(a) * 1.5);
      g.add(orb);
    }
  }

  g.scale.setScalar(scale);
  return g;
}

export function createResourceNodeMesh(type: ResourceType): THREE.Group {
  const g = new THREE.Group();

  if (type === 'wood') {
    const logMat = new THREE.MeshStandardMaterial({ color: 0x8f5b38, roughness: 0.86 });
    const cutMat = new THREE.MeshStandardMaterial({ color: 0xdcb481, roughness: 0.72 });
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.5, 8), logMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i - 1) * 0.45;
      log.position.set(0, 0.22 + (i === 2 ? 0.26 : 0), (i - 1) * 0.28);
      log.castShadow = true;
      g.add(log);
    }
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8), cutMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.set(0.76, 0.22, 0);
    g.add(ring);
  } else if (type === 'glow') {
    const cMat = new THREE.MeshStandardMaterial({
      color: 0x88e9ff,
      emissive: 0x3ec8f2,
      emissiveIntensity: 1.2,
      roughness: 0.18,
      metalness: 0.3,
    });
    for (let i = 0; i < 4; i++) {
      const h = 0.7 + (i % 2) * 0.45;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.24, h, 5), cMat);
      shard.position.set(Math.cos(i * 1.6) * 0.28, h * 0.45, Math.sin(i * 1.6) * 0.28);
      shard.rotation.z = (i - 1.5) * 0.22;
      shard.castShadow = true;
      g.add(shard);
    }
  } else if (type === 'water') {
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.85, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0x627378, roughness: 0.9 }),
    );
    pool.position.y = 0.07;
    const drop = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 1),
      new THREE.MeshStandardMaterial({
        color: 0x70d7ff,
        emissive: 0x2088bb,
        emissiveIntensity: 0.65,
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      }),
    );
    drop.position.y = 0.68;
    drop.scale.set(0.85, 1.3, 0.85);
    g.add(pool, drop);
  } else if (type === 'rune') {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({ color: 0x646c72, roughness: 0.85 }),
    );
    stone.position.y = 0.32;
    const runeCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.32, 0),
      new THREE.MeshStandardMaterial({
        color: 0xd4b8ff,
        emissive: 0x9b6eff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      }),
    );
    runeCore.position.y = 0.95;
    g.add(stone, runeCore);
  } else {
    // Seed pod
    const pod = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x8ff2b4,
        emissive: 0x3ac27c,
        emissiveIntensity: 1.1,
        roughness: 0.3,
      }),
    );
    pod.position.y = 0.45;
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x56b46b, roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.22), leafMat);
      leaf.position.set(Math.cos(a) * 0.35, 0.25, Math.sin(a) * 0.35);
      leaf.rotation.y = -a;
      leaf.rotation.z = 0.4;
      g.add(leaf);
    }
    g.add(pod);
  }

  return g;
}

export function createRuinPillarGroup(tex: ProceduralTexturePack): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x7b8685,
    roughness: 0.86,
  });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 2.2), stoneMat);
  base.position.y = 0.35;
  base.castShadow = true;
  base.receiveShadow = true;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 4.4, 6), stoneMat);
  column.position.y = 2.6;
  column.castShadow = true;
  const runeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.09, 8, 20),
    new THREE.MeshStandardMaterial({
      color: 0x9b86c7,
      emissive: 0x2d2444,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.5,
    }),
  );
  runeRing.position.y = 5.3;
  g.userData.runeRing = runeRing;
  g.add(base, column, runeRing);
  return g;
}

export function createDeerGroup(): THREE.Group {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xb68153, roughness: 0.84 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe6d3b3, roughness: 0.82 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0x5c4734, roughness: 0.75 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.58, 1.25), furMat);
  body.position.y = 0.9;
  body.castShadow = true;
  g.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.36, 0.45), bellyMat);
  chest.position.set(0, 0.85, 0.45);
  g.add(chest);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.58, 8), furMat);
  neck.position.set(0, 1.32, 0.52);
  neck.rotation.x = 0.35;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.44), furMat);
  head.position.set(0, 1.56, 0.72);
  g.add(head);

  [-0.1, 0.1].forEach((ax) => {
    const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.42, 6), antlerMat);
    antler.position.set(ax, 1.82, 0.65);
    antler.rotation.z = ax * 2.2;
    g.add(antler);
  });

  [
    [-0.22, 0.44],
    [0.22, 0.44],
    [-0.22, -0.44],
    [0.22, -0.44],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.68, 6), furMat);
    leg.position.set(lx, 0.34, lz);
    leg.castShadow = true;
    g.add(leg);
  });

  return g;
}

export function createShadowWispGroup(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e132b,
    emissive: 0x4b1259,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    metalness: 0.45,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xff5478,
    emissive: 0xff2b59,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x2c1c3f,
    emissive: 0x9b36ff,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.6,
  });

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), bodyMat);
  core.position.y = 1.45;
  core.castShadow = true;
  g.add(core);

  // Glowing twin eyes facing +Z
  [-0.18, 0.18].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), eyeMat);
    eye.position.set(ex, 1.52, 0.52);
    g.add(eye);
  });

  // Swirling shadow crown & orbiting obsidian blades
  const orbit = new THREE.Group();
  orbit.position.y = 1.45;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.82, 4), shardMat);
    blade.position.set(Math.cos(a) * 0.92, Math.sin(i * 1.4) * 0.18, Math.sin(a) * 0.92);
    blade.rotation.z = Math.PI * 0.85;
    blade.rotation.y = a;
    orbit.add(blade);
  }
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.05, 6, 20),
    eyeMat,
  );
  halo.rotation.x = Math.PI / 2.2;
  orbit.add(halo);

  g.userData.orbit = orbit;
  g.userData.core = core;
  g.add(orbit);
  return g;
}

export function createBlightNestGroup(tex: ProceduralTexturePack, purified: boolean): THREE.Group {
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: purified ? 0x5c7d72 : 0x2b2235,
    roughness: 0.9,
  });

  const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.55, 0.65, 8), baseMat);
  mound.position.y = 0.32;
  mound.receiveShadow = true;
  mound.castShadow = true;
  g.add(mound);

  const fangMat = new THREE.MeshStandardMaterial({
    color: purified ? 0x6ba68e : 0x35224a,
    emissive: purified ? 0x1e5c45 : 0x3b0f4f,
    emissiveIntensity: purified ? 0.3 : 0.7,
    roughness: 0.5,
  });

  const fangs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const h = 2.1 + (i % 2) * 0.8;
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.36, h, 5), fangMat);
    fang.position.set(Math.cos(a) * 1.15, h * 0.45 + 0.3, Math.sin(a) * 1.15);
    fang.rotation.z = -Math.cos(a) * 0.28;
    fang.rotation.x = Math.sin(a) * 0.28;
    fang.castShadow = true;
    fangs.push(fang);
    g.add(fang);
  }

  const orbMat = new THREE.MeshStandardMaterial({
    color: purified ? 0x7ef2c9 : 0xe8488a,
    emissive: purified ? 0x3ad49f : 0xc9266d,
    emissiveIntensity: purified ? 1.1 : 1.85,
    roughness: 0.18,
    metalness: 0.3,
  });
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), orbMat);
  orb.position.y = 2.05;
  g.add(orb);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(5.6, 6.2, 36),
    new THREE.MeshBasicMaterial({
      color: purified ? 0x7ef2c9 : 0xd9367a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: purified ? 0.16 : 0.45,
      depthWrite: false,
    }),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.12;
  g.add(auraRing);

  g.userData.orb = orb;
  g.userData.orbMat = orbMat;
  g.userData.fangMat = fangMat;
  g.userData.auraRing = auraRing;
  return g;
}

export function createMonolithGroup(tex: ProceduralTexturePack, accentHex = 0x88e9ff): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: 0x5c6870,
    roughness: 0.88,
  });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 2.6), stoneMat);
  plinth.position.y = 0.35;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 5.4, 5), stoneMat);
  shaft.position.y = 3.2;
  shaft.castShadow = true;
  const runeBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.07, 6, 16),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  runeBand.rotation.x = Math.PI / 2;
  runeBand.position.y = 4.2;
  g.add(plinth, shaft, runeBand);
  return g;
}

export function createBoulderClusterGroup(tex: ProceduralTexturePack, tintHex = 0x6f7a76): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    color: tintHex,
    roughness: 0.92,
  });
  const main = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45, 1), mat);
  main.scale.set(1.2, 0.85, 1.0);
  main.position.y = 0.75;
  main.castShadow = true;
  main.receiveShadow = true;
  const side = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), mat);
  side.position.set(1.1, 0.45, 0.55);
  side.castShadow = true;
  side.receiveShadow = true;
  g.add(main, side);
  return g;
}

export function createForageItemMesh(itemId: CraftItemId): THREE.Group {
  const g = new THREE.Group();

  switch (itemId) {
    case 'berry': {
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f4e, roughness: 0.78 });
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 1), leafMat);
      bush.position.y = 0.34;
      bush.scale.set(1.15, 0.8, 1.15);
      bush.castShadow = true;
      g.add(bush);
      const berryMat = new THREE.MeshStandardMaterial({
        color: 0xff547c,
        emissive: 0xa31f47,
        emissiveIntensity: 0.55,
        roughness: 0.32,
      });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), berryMat);
        b.position.set(Math.cos(a) * 0.32, 0.42 + (i % 2) * 0.14, Math.sin(a) * 0.32);
        g.add(b);
      }
      break;
    }
    case 'mushroom': {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.16, 0.45, 8),
        new THREE.MeshStandardMaterial({ color: 0xeadfce, roughness: 0.78 }),
      );
      stem.position.y = 0.22;
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
        new THREE.MeshStandardMaterial({
          color: 0xa985ff,
          emissive: 0x5c36b8,
          emissiveIntensity: 0.85,
          roughness: 0.38,
        }),
      );
      cap.position.y = 0.38;
      cap.castShadow = true;
      g.add(stem, cap);
      const spotMat = new THREE.MeshStandardMaterial({
        color: 0xbef9ff,
        emissive: 0x7ef2c9,
        emissiveIntensity: 1.2,
      });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), spotMat);
        sp.position.set(Math.cos(a) * 0.22, 0.56, Math.sin(a) * 0.22);
        g.add(sp);
      }
      break;
    }
    case 'herb': {
      const herbMat = new THREE.MeshStandardMaterial({
        color: 0x62e3a8,
        emissive: 0x1d7a53,
        emissiveIntensity: 0.45,
        roughness: 0.55,
      });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 4), herbMat);
        blade.position.set(Math.cos(a) * 0.14, 0.32, Math.sin(a) * 0.14);
        blade.rotation.z = -Math.cos(a) * 0.38;
        blade.rotation.x = Math.sin(a) * 0.38;
        g.add(blade);
      }
      break;
    }
    case 'spice_root': {
      const rootMat = new THREE.MeshStandardMaterial({
        color: 0xd98043,
        emissive: 0x5c2b10,
        emissiveIntensity: 0.35,
        roughness: 0.75,
      });
      const bulb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), rootMat);
      bulb.position.y = 0.24;
      bulb.scale.set(1.25, 0.85, 0.9);
      const sproutMat = new THREE.MeshStandardMaterial({ color: 0xe8b24c, roughness: 0.5 });
      const stem = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 5), sproutMat);
      stem.position.y = 0.62;
      g.add(bulb, stem);
      break;
    }
    case 'dew_flask': {
      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x6ad6ff,
          emissive: 0x1c84b8,
          emissiveIntensity: 0.75,
          roughness: 0.1,
          transparent: true,
          opacity: 0.88,
        }),
      );
      glass.position.y = 0.36;
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0xc2935b, roughness: 0.7 }),
      );
      neck.position.y = 0.66;
      g.add(glass, neck);
      break;
    }
    case 'honey_sap': {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.34, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b472b, roughness: 0.88 }),
      );
      cup.position.y = 0.11;
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffcf59,
          emissive: 0xd98a1c,
          emissiveIntensity: 0.85,
          roughness: 0.18,
        }),
      );
      orb.position.y = 0.42;
      g.add(cup, orb);
      break;
    }
    case 'ember_stone': {
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.34, 0),
        new THREE.MeshStandardMaterial({
          color: 0xff6238,
          emissive: 0xd93514,
          emissiveIntensity: 1.4,
          roughness: 0.32,
        }),
      );
      stone.position.y = 0.38;
      g.add(stone);
      break;
    }
    case 'frost_crystal': {
      const iceMat = new THREE.MeshStandardMaterial({
        color: 0xb2f2ff,
        emissive: 0x4bc3e8,
        emissiveIntensity: 0.95,
        roughness: 0.12,
        metalness: 0.2,
      });
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + i * 0.04, 0), iceMat);
        c.scale.set(0.7, 1.75, 0.7);
        c.position.set((i - 1) * 0.18, 0.42 + (i === 1 ? 0.12 : 0), (i % 2) * 0.1);
        c.rotation.z = (i - 1) * 0.28;
        g.add(c);
      }
      break;
    }
    case 'cloth_fiber': {
      const clothMat = new THREE.MeshStandardMaterial({
        color: 0xe6d5b8,
        emissive: 0x453b2c,
        emissiveIntensity: 0.25,
        roughness: 0.85,
      });
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.56, 10), clothMat);
      roll.rotation.z = Math.PI / 2;
      roll.position.y = 0.24;
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.035, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x8f5b38, roughness: 0.7 }),
      );
      strap.rotation.y = Math.PI / 2;
      strap.position.y = 0.24;
      g.add(roll, strap);
      break;
    }
    case 'star_shard':
    default: {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffe482,
          emissive: 0xffb326,
          emissiveIntensity: 1.85,
          roughness: 0.15,
          metalness: 0.45,
        }),
      );
      star.position.y = 0.56;
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.04, 6, 18),
        new THREE.MeshBasicMaterial({ color: 0xffedaa, transparent: true, opacity: 0.72 }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.22;
      g.add(star, halo);
      break;
    }
  }

  return g;
}

export function createCrystalSpireCluster(accentHex = 0x88e9ff): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.78,
    roughness: 0.16,
    metalness: 0.28,
  });
  for (let i = 0; i < 4; i++) {
    const h = 2.6 + (i % 3) * 1.4;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.55 + (i === 0 ? 0.22 : 0), h, 5), mat);
    const ang = (i / 4) * Math.PI * 2;
    shard.position.set(i === 0 ? 0 : Math.cos(ang) * 0.9, h * 0.45, i === 0 ? 0 : Math.sin(ang) * 0.9);
    shard.rotation.z = i === 0 ? 0.08 : -Math.cos(ang) * 0.28;
    shard.rotation.x = i === 0 ? 0 : Math.sin(ang) * 0.28;
    shard.castShadow = true;
    g.add(shard);
  }
  return g;
}

export function createGiantMushroomGroup(capHex = 0xf29eb9): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.56, 3.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xe6dac8, roughness: 0.82 }),
  );
  stem.position.y = 1.9;
  stem.castShadow = true;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    new THREE.MeshStandardMaterial({
      color: capHex,
      emissive: capHex,
      emissiveIntensity: 0.32,
      roughness: 0.48,
    }),
  );
  cap.position.y = 3.55;
  cap.castShadow = true;
  g.add(stem, cap);
  return g;
}

export function createThermalSpringGroup(tex: ProceduralTexturePack, radius = 5.5): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.95, 0.65, 8, 24),
    new THREE.MeshStandardMaterial({ map: tex.stone, color: 0x80796a, roughness: 0.9 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.25;
  rim.receiveShadow = true;
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.92, 24),
    new THREE.MeshStandardMaterial({
      color: 0x56d8e0,
      emissive: 0x22999e,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      transparent: true,
      opacity: 0.88,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.22;
  g.add(rim, pool);
  return g;
}

export function createFloatingSkyIsleGroup(tex: ProceduralTexturePack, radius = 7.4): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.88, 0.9, 16),
    new THREE.MeshStandardMaterial({ color: 0x529b6e, roughness: 0.85 }),
  );
  deck.position.y = -0.45;
  deck.receiveShadow = true;
  deck.castShadow = true;
  const underRock = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.9, radius * 1.15, 10),
    new THREE.MeshStandardMaterial({ map: tex.stone, color: 0x627378, roughness: 0.9 }),
  );
  underRock.rotation.x = Math.PI;
  underRock.position.y = -radius * 0.58 - 0.9;
  underRock.castShadow = true;
  const crystalCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.95, 0),
    new THREE.MeshStandardMaterial({
      color: 0xd4b8ff,
      emissive: 0x9b6eff,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
  );
  crystalCore.position.y = -radius * 1.15 - 1.2;
  g.add(deck, underRock, crystalCore);
  return g;
}

export function createUpdraftVortexGroup(): THREE.Group {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x88e9ff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5 - i * 0.22, 0.06, 6, 20), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35 + i * 2.1;
    g.add(ring);
  }
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.8, 10.5, 14, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xaef6ff,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  pillar.position.y = 5.25;
  g.add(pillar);
  return g;
}

export function createAncientTempleGroup(tex: ProceduralTexturePack, activated: boolean): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    color: 0x7b857e,
    roughness: 0.88,
  });
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 6.4), stoneMat);
  step1.position.y = 0.27;
  step1.receiveShadow = true;
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 4.6), stoneMat);
  step2.position.y = 0.78;
  step2.receiveShadow = true;
  g.add(step1, step2);

  [
    [-1.7, -1.7],
    [1.7, -1.7],
    [-1.7, 1.7],
    [1.7, 1.7],
  ].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 3.6, 8), stoneMat);
    col.position.set(px, 2.8, pz);
    col.castShadow = true;
    g.add(col);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 1.8, 4), stoneMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.35;
  roof.castShadow = true;
  g.add(roof);

  const orbMat = new THREE.MeshStandardMaterial({
    color: activated ? 0x7ef2c9 : 0xf5b971,
    emissive: activated ? 0x3ad49f : 0xd68934,
    emissiveIntensity: activated ? 0.75 : 1.5,
    roughness: 0.2,
  });
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), orbMat);
  orb.position.y = 2.05;
  g.userData.orbMat = orbMat;
  g.userData.orb = orb;
  g.add(orb);
  return g;
}

export function createStoneCircleGroup(tex: ProceduralTexturePack, activated: boolean): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    color: 0x6f7a78,
    roughness: 0.9,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const h = 2.4 + (i % 2) * 0.9;
    const menhir = new THREE.Mesh(new THREE.BoxGeometry(0.75, h, 0.55), stoneMat);
    menhir.position.set(Math.cos(a) * 3.4, h * 0.5, Math.sin(a) * 3.4);
    menhir.rotation.y = -a;
    menhir.castShadow = true;
    g.add(menhir);
  }
  const coreMat = new THREE.MeshStandardMaterial({
    color: activated ? 0x7ef2c9 : 0xc9a6ff,
    emissive: activated ? 0x3ad49f : 0x844eff,
    emissiveIntensity: activated ? 0.8 : 1.55,
    roughness: 0.2,
  });
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.9, 8), stoneMat);
  altar.position.y = 0.45;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), coreMat);
  gem.position.y = 1.6;
  g.userData.orbMat = coreMat;
  g.userData.orb = gem;
  g.add(altar, gem);
  return g;
}

export function createTeleportPortalGroup(tex: ProceduralTexturePack, discovered: boolean): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    normalMap: tex.stoneNormal,
    color: 0x5b6473,
    roughness: 0.86,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.45, 12), stoneMat);
  base.position.y = 0.22;
  base.receiveShadow = true;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.28, 8, 22, Math.PI), stoneMat);
  arch.position.y = 0.45;
  arch.castShadow = true;
  const vortexMat = new THREE.MeshBasicMaterial({
    color: discovered ? 0x88e9ff : 0xc9a6ff,
    transparent: true,
    opacity: discovered ? 0.58 : 0.36,
    side: THREE.DoubleSide,
  });
  const vortex = new THREE.Mesh(new THREE.CircleGeometry(1.85, 24), vortexMat);
  vortex.position.y = 1.95;
  g.userData.vortexMat = vortexMat;
  g.add(base, arch, vortex);
  return g;
}

export function createFoxGroup(): THREE.Group {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({
    color: 0xeb7f3d,
    emissive: 0x451a05,
    emissiveIntensity: 0.25,
    roughness: 0.78,
  });
  const tailTipMat = new THREE.MeshStandardMaterial({
    color: 0xfff2dc,
    emissive: 0x7ef2c9,
    emissiveIntensity: 0.35,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.88), furMat);
  body.position.y = 0.46;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.34), furMat);
  head.position.set(0, 0.66, 0.46);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 6), furMat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.62, 0.72);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), tailTipMat);
  tail.rotation.x = -Math.PI * 0.38;
  tail.position.set(0, 0.54, -0.58);
  g.add(body, head, snout, tail);
  [
    [-0.14, 0.28],
    [0.14, 0.28],
    [-0.14, -0.28],
    [0.14, -0.28],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 6), furMat);
    leg.position.set(lx, 0.17, lz);
    g.add(leg);
  });
  return g;
}

export function createMeteorStreakGroup(): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe482 }),
  );
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 3.6, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff8f40,
      transparent: true,
      opacity: 0.72,
    }),
  );
  tail.position.y = 1.9;
  g.add(core, tail);
  return g;
}


