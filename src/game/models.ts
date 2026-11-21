import * as THREE from 'three';
import type { ProceduralTexturePack } from './textures';
import type { BlueprintId, ResourceType } from './types';

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
    color: tier === 3 ? 0xc28a59 : 0xaa7448,
    roughness: 0.78,
    metalness: 0.05,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    map: tex.stone,
    color: 0x899490,
    roughness: 0.88,
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
    color: 0x878d86,
    roughness: 0.9,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: tex.plaster,
    color: 0xe6d9bf,
    roughness: 0.85,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    map: tex.roof,
    color: 0x8a584d,
    roughness: 0.78,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: tex.wood,
    color: 0x6f4b32,
    roughness: 0.8,
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
    color: kind === 'glowwillow' ? 0x5c5368 : 0x6b4b35,
    roughness: 0.9,
  });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.48, 3.2, 8),
    trunkMat,
  );
  trunk.position.y = 1.6;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  g.add(trunk);

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
    color: 0x7b8685,
    roughness: 0.88,
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
