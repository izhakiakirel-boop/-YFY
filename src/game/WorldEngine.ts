import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  BLUEPRINTS,
  COMMUNITY_PROJECTS_DATA,
  INITIAL_SECRETS,
  NPCS_BASE,
  RESOURCES,
  ZONES,
} from './data';
import {
  createCharacterRig,
  createCottage,
  createDeerGroup,
  createInventionGroup,
  createResourceNodeMesh,
  createRuinPillarGroup,
  createTreeGroup,
  type CharacterRig,
} from './models';
import {
  bridgeDeckHeightAt,
  detectZone,
  FORD_Z,
  groundHeightAt,
  ISLAND_BRIDGE_POS,
  isWalkableWater,
  MAIN_BRIDGE_POS,
  riverCenterX,
  riverHalfWidth,
  terrainSlopeAt,
  WATER_LEVEL,
  WORLD_HALF,
} from './terrain';
import { createProceduralTextures, type ProceduralTexturePack } from './textures';
import type {
  BlueprintId,
  GameState,
  HudSnapshot,
  NearbyPrompt,
  NpcId,
  NpcMemory,
  NpcNeedState,
  PlacedBuilding,
  RealActionPlan,
  ResourceInventory,
  ResourceType,
  SynergyLink,
  ToastMessage,
  WeatherType,
  WorldResourceNode,
} from './types';

const SAVE_KEY = 'shozrim-world-3d-v1';
const TAU = Math.PI * 2;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _colA = new THREE.Color();
const _colB = new THREE.Color();
const _colC = new THREE.Color();
const _mat4 = new THREE.Matrix4();
const _dummy = new THREE.Object3D();

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onToast: (toast: ToastMessage) => void;
  onOpenNpc: (npcId: NpcId) => void;
  onInspectBuilding: (buildingId: string) => void;
  onOpenProject: (projectId: string) => void;
  onBuildModeChange: (bp: BlueprintId | null) => void;
}

function defaultNpcMemories(): Record<NpcId, NpcMemory> {
  return {
    noa: {
      met: false,
      trust: 0,
      mood: 62,
      conversations: 0,
      promisesKept: 0,
      promisesRenegotiated: 0,
      giftsAligned: 0,
      secretsShared: [],
      lastChoiceTone: null,
      rememberedEvents: [],
    },
    mika: {
      met: false,
      trust: 0,
      mood: 64,
      conversations: 0,
      promisesKept: 0,
      promisesRenegotiated: 0,
      giftsAligned: 0,
      secretsShared: [],
      lastChoiceTone: null,
      rememberedEvents: [],
    },
    tali: {
      met: false,
      trust: 0,
      mood: 60,
      conversations: 0,
      promisesKept: 0,
      promisesRenegotiated: 0,
      giftsAligned: 0,
      secretsShared: [],
      lastChoiceTone: null,
      rememberedEvents: [],
    },
    oren: {
      met: false,
      trust: 0,
      mood: 61,
      conversations: 0,
      promisesKept: 0,
      promisesRenegotiated: 0,
      giftsAligned: 0,
      secretsShared: [],
      lastChoiceTone: null,
      rememberedEvents: [],
    },
  };
}

function createFreshState(): GameState {
  return {
    inv: { wood: 4, glow: 2, water: 2, rune: 0, seed: 0 },
    completedQuests: [],
    promises: [],
    npcMemories: defaultNpcMemories(),
    buildings: [],
    discoveredSecrets: [],
    ruinPillars: [false, false, false],
    cavernLit: false,
    communityProjects: {
      proj_grand_arch: 0,
      proj_water_conservatory: 0,
      proj_observatory: 0,
    },
    journal: [
      {
        id: 'j_init',
        text: 'הגעת אל כיכר הלב של העמק. הגשר המרכזי שבור, והטבע ממתין לידיים סקרניות.',
        kind: 'discovery',
        day: 1,
      },
    ],
    realPlan: null,
    realDoneCount: 0,
    simTime: 75, // Start in crisp morning light!
    day: 1,
    weather: 'breeze',
    playerPos: { x: -12, z: 2 },
    stamina: 100,
    tutorialSeen: false,
  };
}

export class WorldEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private tex!: ProceduralTexturePack;
  private sound = new SoundEngine();

  private isSoftwareGl = false;
  private disposed = false;
  private frameId = 0;
  private lastTime = performance.now();
  private hudSyncTimer = 0;
  private saveTimer = 0;
  private simTickTimer = 0;

  // Lighting & Sky
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private skyDome!: THREE.Mesh;
  private starsPoints!: THREE.Points;
  private sunDisc!: THREE.Mesh;
  private sunHalo!: THREE.Mesh;
  private moonDisc!: THREE.Mesh;
  private cottageWindowMats: THREE.MeshStandardMaterial[] = [];
  private waterUniforms = { uTime: { value: 0 } };
  private grassUniforms = { uTime: { value: 0 } };

  // Terrain & Dynamic Ecology
  private terrainGeo!: THREE.PlaneGeometry;
  private terrainMesh!: THREE.Mesh;
  private baseTerrainColors!: Float32Array;
  private terrainNeedsColorUpdate = true;

  // Player & Controls
  private state: GameState;
  private playerRig!: CharacterRig;
  private playerX = -12;
  private playerY = 0.4;
  private playerZ = 2;
  private playerVy = 0;
  private playerYaw = Math.PI * 0.25;
  private playerWalkPhase = 0;
  private isGrounded = true;
  private walkTarget: { x: number; z: number } | null = null;
  private walkWaypointMesh!: THREE.Mesh;

  // Camera
  private camYaw = -0.35;
  private camPitch = 0.48;
  private camDistance = 15.5;
  private isDraggingCam = false;
  private dragMoved = false;
  private dragStart = { x: 0, y: 0 };
  private focusNpcId: NpcId | null = null;
  private pausedForDialog = false;

  // Input
  private keys: Record<string, boolean> = {};
  private touchVector = { x: 0, z: 0 };

  // World Entities
  private resourceNodes: WorldResourceNode[] = [];
  private resourceMeshes = new Map<string, THREE.Group>();
  private npcRigs = new Map<NpcId, { rig: CharacterRig; x: number; z: number; yaw: number; phase: number }>();
  private buildingMeshes = new Map<string, THREE.Group>();
  private buildingPointLights = new Map<string, THREE.PointLight>();
  private synergyArcsGroup = new THREE.Group();
  private staticObstacles: Array<{ x: number; z: number; r: number }> = [];
  private ruinPillarMeshes: THREE.Group[] = [];
  private secretMeshes = new Map<string, THREE.Group>();
  private cavernMistMesh!: THREE.Mesh;
  private cavernLight!: THREE.PointLight;
  private projectMarkers = new Map<string, THREE.Group>();

  // Wildlife & Particles
  private deerList: Array<{ group: THREE.Group; x: number; z: number; yaw: number; phase: number; minVitality: number }> = [];
  private birdsGroup = new THREE.Group();
  private firefliesPoints!: THREE.Points;
  private rainPoints!: THREE.Points;

  // Pulse wave
  private pulseRing!: THREE.Mesh;
  private pulseActive = false;
  private pulseAge = 0;
  private pulseOrigin = new THREE.Vector3();
  private pulseCooldownAt = 0;

  // Build Ghost & Raycasting
  private activeBlueprint: BlueprintId | null = null;
  private ghostGroup: THREE.Group | null = null;
  private ghostRing!: THREE.Mesh;
  private buildRot = 0;
  private pointerNdc = new THREE.Vector2();
  private hoverWorldPoint: THREE.Vector3 | null = null;
  private hoverBuildValid = false;
  private raycaster = new THREE.Raycaster();
  private lastZoneId = '';

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.state = this.loadState();
    this.playerX = this.state.playerPos.x;
    this.playerZ = this.state.playerPos.z;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);

    this.initRenderer();
    this.initScene();
    this.buildTerrain();
    this.buildWaterAndWaterfall();
    this.buildSkyAndAtmosphere();
    this.buildStaticWorld();
    this.buildPlayerAndNpcs();
    this.buildResourcesAndSecrets();
    this.buildWildlifeAndParticles();
    this.syncBuildingsToScene();
    this.syncProjectsToScene();
    this.updateTerrainVitalityColors();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.emitHud();
    this.lastTime = performance.now();
    this.loop();
  }

  private loadState(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return createFreshState();
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const base = createFreshState();
      return {
        ...base,
        ...parsed,
        inv: { ...base.inv, ...(parsed.inv || {}) },
        npcMemories: { ...base.npcMemories, ...(parsed.npcMemories || {}) },
        communityProjects: { ...base.communityProjects, ...(parsed.communityProjects || {}) },
        buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
        discoveredSecrets: Array.isArray(parsed.discoveredSecrets) ? parsed.discoveredSecrets : [],
        ruinPillars: Array.isArray(parsed.ruinPillars) && parsed.ruinPillars.length === 3 ? parsed.ruinPillars : [false, false, false],
        promises: Array.isArray(parsed.promises) ? parsed.promises : [],
        journal: Array.isArray(parsed.journal) ? parsed.journal : base.journal,
      };
    } catch {
      return createFreshState();
    }
  }

  private persist(): void {
    try {
      this.state.playerPos = { x: Number(this.playerX.toFixed(2)), z: Number(this.playerZ.toFixed(2)) };
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota errors
    }
  }

  private initRenderer(): void {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) {
      this.isSoftwareGl = true;
    } else {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !this.isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      this.lastTime = performance.now();
      this.loop();
    });

    this.container.innerHTML = '';
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.tex = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8bbad1);
    this.scene.fog = new THREE.FogExp2(0x8bbad1, 0.0068);

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.3, 420);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.52;
    pmrem.dispose();

    this.hemiLight = new THREE.HemisphereLight(0xaad9f5, 0x3b4e38, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 1.85);
    this.sunLight.position.set(45, 70, 35);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 52;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 175;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.025;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.scene.add(this.synergyArcsGroup);

    // Waypoint ring
    this.walkWaypointMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: 0x7ef2c9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    this.walkWaypointMesh.rotation.x = -Math.PI / 2;
    this.walkWaypointMesh.visible = false;
    this.scene.add(this.walkWaypointMesh);

    // Resonance pulse ring
    this.pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0xc9a6ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.visible = false;
    this.scene.add(this.pulseRing);

    // Build placement ring
    this.ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.8, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7ef2c9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    this.ghostRing.rotation.x = -Math.PI / 2;
    this.ghostRing.visible = false;
    this.scene.add(this.ghostRing);
  }

  private buildTerrain(): void {
    const size = WORLD_HALF * 2;
    const segs = 152;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeightAt(x, z);
      pos.setY(i, y);

      // Base biome vertex color
      const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidth(z);
      const onTerrace = Math.hypot(x + 62, z - 54) < 30;
      const inRuins = Math.hypot(x + 66, z + 62) < 20;
      const inCavern = Math.hypot(x - 72, z + 68) < 22;
      const inPlaza = Math.hypot(x + 15, z) < 15;

      if (y < WATER_LEVEL + 0.12) {
        _colA.setHex(0x4b635a); // riverbed stones
      } else if (distRiver < 2.2) {
        _colA.setHex(0x888367); // sandy riverbank
      } else if (inCavern) {
        _colA.setHex(0x46515b); // dark cavern basalt
      } else if (inRuins) {
        _colA.setHex(0x737e77); // slate courtyard
      } else if (inPlaza) {
        _colA.setHex(0x8b8669); // packed cobblestone earth
      } else if (onTerrace) {
        _colA.setHex(0xb99162); // dry terracotta clay (heals with irrigators!)
      } else if (x > 26) {
        _colA.setHex(0x33664b); // deep forest moss
      } else {
        _colA.setHex(0x478052); // lush valley grass
      }

      // Subtle height shading
      const shade = 0.92 + Math.min(0.18, Math.max(-0.1, y * 0.03));
      colors[i * 3] = _colA.r * shade;
      colors[i * 3 + 1] = _colA.g * shade;
      colors[i * 3 + 2] = _colA.b * shade;
    }

    this.baseTerrainColors = new Float32Array(colors);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.tex.terrainDetail,
      roughness: 0.92,
      metalness: 0.02,
    });

    this.terrainGeo = geo;
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  private updateTerrainVitalityColors(): void {
    const pos = this.terrainGeo.attributes.position;
    const colAttr = this.terrainGeo.attributes.color as THREE.BufferAttribute;
    const arr = colAttr.array as Float32Array;
    const irrigators = this.state.buildings.filter((b) => b.type === 'irrigator');

    for (let i = 0; i < pos.count; i++) {
      let r = this.baseTerrainColors[i * 3];
      let g = this.baseTerrainColors[i * 3 + 1];
      let b = this.baseTerrainColors[i * 3 + 2];

      if (irrigators.length > 0) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = pos.getY(i);
        if (y > WATER_LEVEL + 0.1) {
          let maxBloom = 0;
          for (const irr of irrigators) {
            const radius = irr.tier === 3 ? 34 : irr.tier === 2 ? 25 : 17;
            const d = Math.hypot(x - irr.x, z - irr.z);
            if (d < radius) {
              const strength = (1 - d / radius) * Math.max(0.35, irr.growth);
              if (strength > maxBloom) maxBloom = strength;
            }
          }
          if (maxBloom > 0.01) {
            _colA.setRGB(r, g, b);
            _colB.setHex(0x4ea35c);
            _colA.lerp(_colB, Math.min(0.92, maxBloom * 1.15));
            r = _colA.r;
            g = _colA.g;
            b = _colA.b;
          }
        }
      }
      arr[i * 3] = r;
      arr[i * 3 + 1] = g;
      arr[i * 3 + 2] = b;
    }
    colAttr.needsUpdate = true;
    this.terrainNeedsColorUpdate = false;
  }

  private buildWaterAndWaterfall(): void {
    // Main continuous reflective water plane at WATER_LEVEL
    const waterGeo = new THREE.PlaneGeometry(WORLD_HALF * 2, WORLD_HALF * 2, 72, 72);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x2c8da1,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.84,
    });

    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vWPos;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(transformed.x * 0.6 + uTime * 2.1) * 0.045
                        + cos(transformed.z * 0.45 - uTime * 2.8) * 0.055;
         vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vWPos;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float ripple = sin(vWPos.z * 1.3 - uTime * 3.4 + sin(vWPos.x * 0.9) * 2.0);
         diffuseColor.rgb += vec3(0.06, 0.14, 0.16) * smoothstep(0.45, 1.0, ripple);`,
      );
    };

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = WATER_LEVEL;
    waterMesh.receiveShadow = true;
    this.scene.add(waterMesh);

    // Stepping stones at southern ford (z = FORD_Z)
    const stoneMat = new THREE.MeshStandardMaterial({
      map: this.tex.stone,
      color: 0x99a39b,
      roughness: 0.85,
    });
    const cx = riverCenterX(FORD_Z);
    for (let i = -3; i <= 3; i++) {
      const sx = cx + i * 2.15;
      const sz = FORD_Z + Math.sin(i * 1.3) * 0.6;
      const rock = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.05, 0.55, 7),
        stoneMat,
      );
      rock.position.set(sx, WATER_LEVEL + 0.04, sz);
      rock.rotation.y = i * 0.7;
      rock.receiveShadow = true;
      rock.castShadow = true;
      this.scene.add(rock);
    }

    // Broken bridge abutments at MAIN_BRIDGE_POS
    [-8.5, 8.5].forEach((offsetX) => {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 4.4), stoneMat);
      pier.position.set(MAIN_BRIDGE_POS.x + offsetX, WATER_LEVEL + 0.45, MAIN_BRIDGE_POS.z);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.scene.add(pier);
    });

    // Waterfall cliff & glowing water sheet feeding the Eastern island moat (around x=74, z=44)
    const cliffRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(6.5, 1),
      new THREE.MeshStandardMaterial({ map: this.tex.stone, color: 0x5c6666, roughness: 0.92 }),
    );
    cliffRock.position.set(78, 3.2, 42);
    cliffRock.scale.set(1.2, 1.4, 1.3);
    cliffRock.castShadow = true;
    cliffRock.receiveShadow = true;
    this.scene.add(cliffRock);

    const fallSheet = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 7.2),
      new THREE.MeshStandardMaterial({
        color: 0x8be9ff,
        emissive: 0x2689ab,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.78,
        roughness: 0.15,
        side: THREE.DoubleSide,
      }),
    );
    fallSheet.position.set(72.6, 2.7, 44.5);
    fallSheet.rotation.y = -Math.PI * 0.35;
    fallSheet.rotation.x = 0.18;
    this.scene.add(fallSheet);
  }

  private buildSkyAndAtmosphere(): void {
    const skyGeo = new THREE.SphereGeometry(260, 24, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x7cb3cf,
      side: THREE.BackSide,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Sun disc + warm atmospheric corona + Silver Moon disc
    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(6.2, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
    );
    this.scene.add(this.sunDisc);

    this.sunHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({
        map: this.tex.softGlow,
        color: 0xffd28a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.scene.add(this.sunHalo);

    this.moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(4.4, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xdcecff, fog: false }),
    );
    this.scene.add(this.moonDisc);

    // Starfield for dusk & night
    const starCount = 450;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * TAU;
      const phi = Math.random() * Math.PI * 0.44;
      const r = 230;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 12;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starsPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xe6f4ff,
        size: 1.5,
        transparent: true,
        opacity: 0,
        fog: false,
      }),
    );
    this.scene.add(this.starsPoints);
  }

  private buildStaticWorld(): void {
    // 1. Village Cottages around Central Plaza
    const cottages: Array<{ x: number; z: number; rot: number; scale: number }> = [
      { x: -24, z: -13, rot: 0.45, scale: 1.05 },
      { x: -30, z: 9, rot: 1.15, scale: 0.92 },
      { x: -6, z: -26, rot: -0.25, scale: 0.96 },
    ];
    cottages.forEach((c) => {
      const mesh = createCottage(this.tex, c.scale);
      mesh.position.set(c.x, groundHeightAt(c.x, c.z) - 0.15, c.z);
      mesh.rotation.y = c.rot;
      mesh.traverse((ch) => {
        if ((ch as THREE.Mesh).isMesh) {
          const mat = (ch as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat?.userData?.isCottageWindow) {
            this.cottageWindowMats.push(mat);
          }
        }
      });
      this.scene.add(mesh);
      this.staticObstacles.push({ x: c.x, z: c.z, r: 4.1 * c.scale });
    });

    // Central Plaza Compass Medallion
    const compassStone = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.9, 0.22, 16),
      new THREE.MeshStandardMaterial({ map: this.tex.stone, color: 0x8e9994, roughness: 0.85 }),
    );
    compassStone.position.set(-15, groundHeightAt(-15, 0) + 0.05, 0);
    compassStone.receiveShadow = true;
    this.scene.add(compassStone);

    // 2. Echo Cavern (Northeast: 72, -68) — overarching basalt cliff formation + stalactites + mist
    const rockMat = new THREE.MeshStandardMaterial({
      map: this.tex.stone,
      color: 0x4b5762,
      roughness: 0.92,
    });
    const caveRocks: Array<[number, number, number, number]> = [
      [78, -76, 8.5, 1.4],
      [64, -77, 7.2, 1.3],
      [83, -64, 7.6, 1.5],
      [72, -80, 9.2, 1.6],
    ];
    caveRocks.forEach(([rx, rz, rad, sy]) => {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), rockMat);
      m.position.set(rx, groundHeightAt(rx, rz) + rad * 0.45, rz);
      m.scale.set(1.1, sy, 1.1);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.staticObstacles.push({ x: rx, z: rz, r: rad * 0.72 });
    });
    // Overhanging cavern roof canopy
    const caveRoof = new THREE.Mesh(new THREE.DodecahedronGeometry(9.5, 1), rockMat);
    caveRoof.position.set(73, 8.2, -71);
    caveRoof.scale.set(1.45, 0.48, 1.35);
    caveRoof.castShadow = true;
    this.scene.add(caveRoof);

    // Glowing crystals inside Echo Cavern
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x88e9ff,
      emissive: 0x38bfe8,
      emissiveIntensity: this.state.cavernLit ? 1.5 : 0.35,
      roughness: 0.15,
      metalness: 0.3,
    });
    for (let i = 0; i < 6; i++) {
      const cx = 69 + Math.cos(i * 1.1) * 6;
      const cz = -67 + Math.sin(i * 1.1) * 5.5;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8 + (i % 3), 5), crystalMat);
      shard.position.set(cx, groundHeightAt(cx, cz) + 1.1, cz);
      shard.rotation.z = (i - 2.5) * 0.2;
      this.scene.add(shard);
    }

    this.cavernLight = new THREE.PointLight(0x88e9ff, this.state.cavernLit ? 3.5 : 0.4, 28, 1.5);
    this.cavernLight.position.set(72, 4.5, -68);
    this.scene.add(this.cavernLight);

    this.cavernMistMesh = new THREE.Mesh(
      new THREE.SphereGeometry(11, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x264454,
        transparent: true,
        opacity: this.state.cavernLit ? 0 : 0.62,
        depthWrite: false,
      }),
    );
    this.cavernMistMesh.position.set(70, 3.2, -64);
    this.cavernMistMesh.visible = !this.state.cavernLit;
    this.scene.add(this.cavernMistMesh);

    // 3. Sunken Ruins (Northwest: -66, -62) — 3 Interactive Rune Pillars + Sundial Altar
    const altar = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.8, 0.7, 8),
      new THREE.MeshStandardMaterial({ map: this.tex.stone, color: 0x778380, roughness: 0.88 }),
    );
    altar.position.set(-66, groundHeightAt(-66, -62) + 0.35, -62);
    altar.receiveShadow = true;
    this.scene.add(altar);

    const pillarOffsets: [number, number][] = [
      [-74, -56],
      [-66, -72],
      [-57, -56],
    ];
    pillarOffsets.forEach(([px, pz], idx) => {
      const pillar = createRuinPillarGroup(this.tex);
      pillar.position.set(px, groundHeightAt(px, pz), pz);
      const ring = pillar.userData.runeRing as THREE.Mesh;
      if (this.state.ruinPillars[idx]) {
        const mat = ring.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0xc9a6ff);
        mat.emissiveIntensity = 1.6;
      }
      this.ruinPillarMeshes.push(pillar);
      this.scene.add(pillar);
      this.staticObstacles.push({ x: px, z: pz, r: 1.4 });
    });

    // 4. Trees across valley (avoiding paths, water, plazas, and landmarks)
    let treeSeed = 918273;
    const trnd = () => {
      treeSeed = (treeSeed * 1664525 + 1013904223) >>> 0;
      return treeSeed / 4294967296;
    };
    let placedTrees = 0;
    for (let i = 0; i < 420 && placedTrees < 92; i++) {
      const tx = (trnd() - 0.5) * 195;
      const tz = (trnd() - 0.5) * 195;
      const y = groundHeightAt(tx, tz);
      if (y < WATER_LEVEL + 0.7) continue;
      if (terrainSlopeAt(tx, tz) > 0.45) continue;
      if (Math.hypot(tx + 15, tz) < 22) continue; // Plaza
      if (Math.hypot(tx + 66, tz + 62) < 18) continue; // Ruins
      if (Math.hypot(tx - 72, tz + 68) < 22) continue; // Cavern
      if (Math.hypot(tx + 62, tz - 54) < 25) continue; // Dry Terrace (keep dry/open!)
      if (Math.hypot(tx - 56, tz - 50) < 9) continue; // Island center
      if (Math.abs(tx - riverCenterX(tz)) < riverHalfWidth(tz) + 5) continue;
      if (this.staticObstacles.some((o) => Math.hypot(tx - o.x, tz - o.z) < o.r + 3.2)) continue;
      if (NPCS_BASE.some((n) => Math.hypot(tx - n.homeX, tz - n.homeZ) < 6.5)) continue;

      const kind =
        tx > 28 ? (trnd() > 0.45 ? 'glowwillow' : 'pine') : trnd() > 0.5 ? 'oak' : 'pine';
      const scale = 0.85 + trnd() * 0.55;
      const tree = createTreeGroup(kind, this.tex, scale);
      tree.position.set(tx, y - 0.1, tz);
      tree.rotation.y = trnd() * TAU;
      this.scene.add(tree);
      this.staticObstacles.push({ x: tx, z: tz, r: 0.9 * scale });
      placedTrees++;
    }

    // 5. Instanced Swaying Grass Blades (1,300 blades)
    const grassCount = 1300;
    const bladeGeo = new THREE.ConeGeometry(0.11, 0.82, 3);
    bladeGeo.translate(0, 0.41, 0);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
    });
    bladeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.grassUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sway = sin(uTime * 1.9 + instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.25) * 0.18;
         transformed.x += sway * (position.y / 0.82);`,
      );
    };

    const grassMesh = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
    let gCount = 0;
    for (let i = 0; i < 3200 && gCount < grassCount; i++) {
      const gx = (trnd() - 0.5) * 185;
      const gz = (trnd() - 0.5) * 185;
      const gy = groundHeightAt(gx, gz);
      if (gy < WATER_LEVEL + 0.35) continue;
      if (Math.hypot(gx + 62, gz - 54) < 24) continue; // Keep dry terrace sparse
      if (Math.hypot(gx - 72, gz + 68) < 14) continue;
      _dummy.position.set(gx, gy - 0.05, gz);
      _dummy.rotation.set(0, trnd() * TAU, 0);
      const s = 0.75 + trnd() * 0.75;
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      grassMesh.setMatrixAt(gCount, _dummy.matrix);
      _colA.setHex(gx > 26 ? 0x3b7b5b : 0x569658).offsetHSL(0, 0, (trnd() - 0.5) * 0.08);
      grassMesh.setColorAt(gCount, _colA);
      gCount++;
    }
    grassMesh.count = gCount;
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    grassMesh.computeBoundingSphere();
    this.scene.add(grassMesh);
  }

  private buildPlayerAndNpcs(): void {
    this.playerRig = createCharacterRig({
      coatColor: 0x2f6b8a,
      scarfColor: 0x7ef2c9,
      hairColor: 0x2b2420,
      isPlayer: true,
    });
    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerRig.group);

    const npcLooks: Record<NpcId, { coat: number; scarf: number; hair: number; hat?: boolean; lantern?: boolean }> = {
      noa: { coat: 0x9b546c, scarf: 0xf29eb9, hair: 0x3c251d },
      mika: { coat: 0x574c82, scarf: 0xc9baff, hair: 0x222030, lantern: true },
      tali: { coat: 0x3d7559, scarf: 0x8ff2b4, hair: 0x593726, hat: true },
      oren: { coat: 0x8c633b, scarf: 0xf5b971, hair: 0x2e2a28 },
    };

    for (const npc of NPCS_BASE) {
      const look = npcLooks[npc.id];
      const rig = createCharacterRig({
        coatColor: look.coat,
        scarfColor: look.scarf,
        hairColor: look.hair,
        hasHat: look.hat,
        hasLantern: look.lantern,
      });
      const y = groundHeightAt(npc.homeX, npc.homeZ);
      rig.group.position.set(npc.homeX, y, npc.homeZ);
      this.scene.add(rig.group);
      this.npcRigs.set(npc.id, {
        rig,
        x: npc.homeX,
        z: npc.homeZ,
        yaw: 0,
        phase: Math.random() * TAU,
      });
    }
  }

  private buildResourcesAndSecrets(): void {
    const spots: Array<[ResourceType, number, number, boolean?]> = [
      ['wood', -24, 18],
      ['wood', -3, -29],
      ['wood', 32, -8],
      ['wood', 36, 16],
      ['wood', -42, 16],
      ['glow', 46, -32],
      ['glow', 58, -10],
      ['glow', 71, -66],
      ['glow', 66, -71],
      ['glow', -22, -32],
      ['water', 6, -4],
      ['water', 27, 20],
      ['water', 14, 48],
      ['water', -34, 24],
      ['rune', -71, -60],
      ['rune', -61, -66],
      ['rune', 74, -69, true],
      ['rune', 55, 53, true],
      ['seed', -54, 58, true],
      ['seed', 57, 46, true],
      ['seed', 46, 6, true],
    ];

    spots.forEach(([type, x, z, hidden], i) => {
      const node: WorldResourceNode = {
        id: `res_${i}`,
        type,
        x,
        z,
        active: true,
        respawnAt: 0,
        hiddenUntilPulse: !!hidden,
        revealedUntil: hidden ? 0 : Infinity,
      };
      this.resourceNodes.push(node);

      const mesh = createResourceNodeMesh(type);
      mesh.position.set(x, groundHeightAt(x, z), z);
      mesh.visible = !hidden;
      this.resourceMeshes.set(node.id, mesh);
      this.scene.add(mesh);
    });

    // Secret Shrine / Relic Pedestals
    for (const sec of INITIAL_SECRETS) {
      const discovered = this.state.discoveredSecrets.includes(sec.id);
      const grp = new THREE.Group();
      grp.position.set(sec.x, groundHeightAt(sec.x, sec.z), sec.z);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 1.2, 0.55, 6),
        new THREE.MeshStandardMaterial({ map: this.tex.stone, color: 0x677575, roughness: 0.85 }),
      );
      base.position.y = 0.27;
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshStandardMaterial({
          color: discovered ? 0x7ef2c9 : 0xf5b971,
          emissive: discovered ? 0x2b8f6d : 0xd68934,
          emissiveIntensity: discovered ? 0.6 : 1.4,
          roughness: 0.2,
          metalness: 0.4,
        }),
      );
      orb.position.y = 1.25;
      grp.userData.orb = orb;
      grp.add(base, orb);
      this.secretMeshes.set(sec.id, grp);
      this.scene.add(grp);
    }
  }

  private buildWildlifeAndParticles(): void {
    // Woodland deer (emerge as valley vitality grows)
    const deerSpots: [number, number, number][] = [
      [-36, -24, 15],
      [38, 22, 35],
      [-55, 48, 50],
      [56, 52, 65],
    ];
    deerSpots.forEach(([dx, dz, minV]) => {
      const grp = createDeerGroup();
      grp.position.set(dx, groundHeightAt(dx, dz), dz);
      grp.visible = this.computeVitality() >= minV;
      this.scene.add(grp);
      this.deerList.push({ group: grp, x: dx, z: dz, yaw: Math.random() * TAU, phase: Math.random() * TAU, minVitality: minV });
    });

    // Soaring valley birds
    const birdMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ec, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const bird = new THREE.Group();
      const wingL = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.22), birdMat);
      wingL.position.x = -0.32;
      const wingR = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.22), birdMat);
      wingR.position.x = 0.32;
      bird.add(wingL, wingR);
      bird.userData = { angle: (i / 10) * TAU, radius: 22 + (i % 4) * 11, height: 15 + (i % 3) * 4, speed: 0.22 + (i % 3) * 0.05 };
      this.birdsGroup.add(bird);
    }
    this.scene.add(this.birdsGroup);

    // Fireflies
    const ffCount = 140;
    const ffPos = new Float32Array(ffCount * 3);
    for (let i = 0; i < ffCount; i++) {
      const fx = (Math.random() - 0.5) * 160;
      const fz = (Math.random() - 0.5) * 160;
      ffPos[i * 3] = fx;
      ffPos[i * 3 + 1] = groundHeightAt(fx, fz) + 1.1 + Math.random() * 2.5;
      ffPos[i * 3 + 2] = fz;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    this.firefliesPoints = new THREE.Points(
      ffGeo,
      new THREE.PointsMaterial({
        map: this.tex.softGlow,
        color: 0xffe49c,
        size: 1.15,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.firefliesPoints);

    // Rain particle streaks
    const rainCount = 600;
    const rPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rPos[i * 3] = (Math.random() - 0.5) * 80;
      rPos[i * 3 + 1] = Math.random() * 28;
      rPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
    this.rainPoints = new THREE.Points(
      rGeo,
      new THREE.PointsMaterial({
        color: 0xbceeff,
        size: 0.26,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  private syncBuildingsToScene(): void {
    // Clear existing
    for (const m of this.buildingMeshes.values()) this.scene.remove(m);
    for (const l of this.buildingPointLights.values()) this.scene.remove(l);
    this.buildingMeshes.clear();
    this.buildingPointLights.clear();

    for (const b of this.state.buildings) {
      const grp = createInventionGroup(b.type, b.tier, this.tex, false);
      const y = b.type === 'bridge' ? WATER_LEVEL : groundHeightAt(b.x, b.z);
      grp.position.set(b.x, y, b.z);
      grp.rotation.y = b.rot;
      grp.userData.buildingId = b.id;
      this.buildingMeshes.set(b.id, grp);
      this.scene.add(grp);

      if (b.type === 'lantern' || b.type === 'bench' || b.type === 'resonance' || (b.type === 'bridge' && b.tier >= 2)) {
        const color =
          b.type === 'resonance' ? 0xc9a6ff : b.type === 'bench' ? 0xffa66b : 0xffdc96;
        const intensity = b.tier === 3 ? 4.2 : b.tier === 2 ? 3.0 : 2.1;
        const range = b.tier === 3 ? 28 : b.tier === 2 ? 21 : 15;
        const pt = new THREE.PointLight(color, intensity, range, 1.4);
        pt.userData.baseIntensity = intensity;
        pt.position.set(b.x, y + 3.4, b.z);
        this.buildingPointLights.set(b.id, pt);
        this.scene.add(pt);
      }
    }

    this.rebuildSynergyArcs();
    this.terrainNeedsColorUpdate = true;
  }

  private syncProjectsToScene(): void {
    for (const grp of this.projectMarkers.values()) this.scene.remove(grp);
    this.projectMarkers.clear();

    for (const proj of COMMUNITY_PROJECTS_DATA) {
      const stage = this.state.communityProjects[proj.id] || 0;
      const grp = new THREE.Group();
      const y = groundHeightAt(proj.x, proj.z);
      grp.position.set(proj.x, y, proj.z);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.4, 0.35, 8),
        new THREE.MeshStandardMaterial({ map: this.tex.stone, color: 0x7b8985, roughness: 0.88 }),
      );
      plinth.position.y = 0.17;
      plinth.receiveShadow = true;
      grp.add(plinth);

      if (stage >= 1) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.56, 2.2 + stage * 0.9, 8),
          new THREE.MeshStandardMaterial({ map: this.tex.wood, color: 0xa4744b, roughness: 0.78 }),
        );
        pillar.position.y = (2.2 + stage * 0.9) / 2 + 0.35;
        pillar.castShadow = true;
        grp.add(pillar);
      }
      if (stage >= 2) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.15, 0.08, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0xe5b869, roughness: 0.3, metalness: 0.8 }),
        );
        ring.position.y = 3.2;
        grp.add(ring);
      }
      if (stage >= 3) {
        const beacon = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.65, 0),
          new THREE.MeshStandardMaterial({
            color: 0x7ef2c9,
            emissive: 0x4be3aa,
            emissiveIntensity: 1.7,
            roughness: 0.18,
          }),
        );
        beacon.position.y = 4.6;
        grp.add(beacon);
      }

      this.projectMarkers.set(proj.id, grp);
      this.scene.add(grp);
    }
  }

  public computeSynergies(): SynergyLink[] {
    const links: SynergyLink[] = [];
    const bs = this.state.buildings;
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i];
        const b = bs[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d > 28) continue;

        const pair = [a.type, b.type].sort().join('+');
        if (pair === 'irrigator+raincatcher') {
          links.push({
            key: `water_${a.id}_${b.id}`,
            label: 'מחזור מים רציף',
            desc: 'לוכד העננים מזרים מים ישירות אל אמת ההשקיה.',
            fromId: a.id,
            toId: b.id,
            color: '#63c5ff',
          });
        } else if (pair === 'bench+lantern') {
          links.push({
            key: `gather_${a.id}_${b.id}`,
            label: 'מדורה מוארת',
            desc: 'הפנס מאריך את חיי המפגש ליד הספסל ומושך תושבים בערב.',
            fromId: a.id,
            toId: b.id,
            color: '#f5b971',
          });
        } else if (a.type === 'resonance' || b.type === 'resonance') {
          if (a.type !== 'bench' && b.type !== 'bench') {
            links.push({
              key: `res_${a.id}_${b.id}`,
              label: 'שרשרת תהודה',
              desc: 'מגדל התהודה מגביר את היעילות והטווח של המבנה המחובר.',
              fromId: a.id,
              toId: b.id,
              color: '#c9a6ff',
            });
          }
        } else if (pair === 'bench+bridge' || pair === 'bridge+lantern') {
          links.push({
            key: `route_${a.id}_${b.id}`,
            label: 'נתיב חי בין גדות',
            desc: 'המעבר והתחנה יוצרים רצף בטוח בין צידי העמק.',
            fromId: a.id,
            toId: b.id,
            color: '#7ef2c9',
          });
        }
      }
    }
    return links;
  }

  private rebuildSynergyArcs(): void {
    while (this.synergyArcsGroup.children.length > 0) {
      const ch = this.synergyArcsGroup.children[0] as THREE.Mesh;
      ch.geometry?.dispose();
      (ch.material as THREE.Material)?.dispose();
      this.synergyArcsGroup.remove(ch);
    }

    const links = this.computeSynergies();
    const map = new Map(this.state.buildings.map((b) => [b.id, b]));
    for (const link of links) {
      const a = map.get(link.fromId);
      const b = map.get(link.toId);
      if (!a || !b) continue;
      const ya = (a.type === 'bridge' ? WATER_LEVEL : groundHeightAt(a.x, a.z)) + 2.4;
      const yb = (b.type === 'bridge' ? WATER_LEVEL : groundHeightAt(b.x, b.z)) + 2.4;
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      const midY = Math.max(ya, yb) + 2.8;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(a.x, ya, a.z),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(b.x, yb, b.z),
      );
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 18, 0.08, 6, false),
        new THREE.MeshBasicMaterial({
          color: link.color,
          transparent: true,
          opacity: 0.62,
        }),
      );
      this.synergyArcsGroup.add(tube);
    }
  }

  private computeVitality(): number {
    let score = 8;
    score += this.state.completedQuests.length * 10;
    score += Math.min(20, this.state.buildings.reduce((acc, b) => acc + b.tier * 3, 0));
    score += Math.min(16, this.computeSynergies().length * 5);
    score += this.state.discoveredSecrets.length * 5;
    score += Object.values(this.state.communityProjects).reduce((a, b) => a + b * 3, 0);
    const bloomSum = this.state.buildings
      .filter((b) => b.type === 'irrigator')
      .reduce((acc, b) => acc + b.growth * 10, 0);
    score += Math.min(15, Math.round(bloomSum));
    return Math.min(100, Math.round(score));
  }

  private computeNpcNeeds(): Record<NpcId, NpcNeedState> {
    const bs = this.state.buildings;
    const isNight = Math.sin((this.state.simTime % 300) / 300 * TAU) < -0.2;
    const hasMainBridge = bs.some(
      (b) => b.type === 'bridge' && Math.hypot(b.x - MAIN_BRIDGE_POS.x, b.z - MAIN_BRIDGE_POS.z) < 14,
    );
    const hasForestLight = bs.some(
      (b) => (b.type === 'lantern' || b.type === 'resonance') && Math.hypot(b.x - 48, b.z + 26) < 20,
    );
    const terraceIrrigator = bs.find(
      (b) => b.type === 'irrigator' && Math.hypot(b.x + 58, b.z - 52) < 24,
    );
    const hasBench = bs.some(
      (b) => b.type === 'bench' && Math.hypot(b.x + 12, b.z - 6) < 20,
    );

    return {
      noa: hasMainBridge
        ? {
            key: 'community',
            label: 'המעבר חי — לטפח פרויקט קהילתי',
            satisfied: true,
            urgency: 10,
            focusX: MAIN_BRIDGE_POS.x - 7,
            focusZ: MAIN_BRIDGE_POS.z,
          }
        : {
            key: 'bridge',
            label: 'לחבר את שתי הגדות בגשר',
            satisfied: false,
            urgency: 85,
            focusX: 1,
            focusZ: -15,
          },
      mika:
        this.state.cavernLit && hasForestLight
          ? {
              key: 'stars',
              label: 'מערת הגבישים מוארת — לחקור שרידים',
              satisfied: true,
              urgency: 10,
              focusX: 46,
              focusZ: -24,
            }
          : {
              key: 'light',
              label: isNight ? 'להאיר את היער ופתח המערה' : 'להכין אור לשביל היער',
              satisfied: hasForestLight,
              urgency: isNight ? 88 : 55,
              focusX: 40,
              focusZ: -20,
            },
      tali:
        terraceIrrigator && terraceIrrigator.growth >= 0.7
          ? {
              key: 'bloom',
              label: 'הטרסה פורחת — לשמר זרעי פלא',
              satisfied: true,
              urgency: 12,
              focusX: terraceIrrigator.x,
              focusZ: terraceIrrigator.z,
            }
          : {
              key: 'water',
              label: this.state.weather === 'rain' ? 'לאגור מי גשם ולהשקות את הטרסה' : 'להביא מים אל הטרסה היבשה',
              satisfied: false,
              urgency: 78,
              focusX: -48,
              focusZ: 42,
            },
      oren: hasBench
        ? {
            key: 'gathering',
            label: 'מקום המפגש פועל — להזמין שכנים',
            satisfied: true,
            urgency: 15,
            focusX: -12,
            focusZ: 8,
          }
        : {
            key: 'bench',
            label: 'לבנות ספסל ומדורת מפגש בכיכר',
            satisfied: false,
            urgency: 68,
            focusX: -12,
            focusZ: 16,
          },
    };
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: false });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleBlur = (): void => {
    this.keys = {};
    this.isDraggingCam = false;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const t = e.target;
    if (t instanceof HTMLElement && (t.matches('input,textarea,select') || t.isContentEditable)) {
      return;
    }
    this.keys[e.code] = true;
    this.keys[e.key.toLowerCase()] = true;

    if (this.pausedForDialog) return;
    if (e.repeat) return;

    if (e.code === 'KeyE') {
      this.interact();
    } else if (e.code === 'KeyF') {
      this.gatherNearby();
    } else if (e.code === 'KeyQ') {
      this.triggerPulse();
    } else if (e.code === 'KeyR' && this.activeBlueprint) {
      this.buildRot = (this.buildRot + Math.PI / 4) % TAU;
      this.toast('המבנה סובב ב-45°.', 'info');
    } else if (e.code === 'Space' && this.isGrounded) {
      e.preventDefault();
      this.playerVy = 8.4;
      this.isGrounded = false;
    } else if (e.code === 'Escape' && this.activeBlueprint) {
      this.setBuildBlueprint(null);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
    this.keys[e.key.toLowerCase()] = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.camDistance = THREE.MathUtils.clamp(this.camDistance + e.deltaY * 0.012, 8.5, 28);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.isDraggingCam = true;
    this.dragMoved = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.updatePointerNdc(e);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    this.updatePointerNdc(e);
    if (this.isDraggingCam) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (Math.hypot(dx, dy) > 5) this.dragMoved = true;
      this.camYaw -= dx * 0.0058;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.22, 1.18);
      this.dragStart = { x: e.clientX, y: e.clientY };
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const wasClick = this.isDraggingCam && !this.dragMoved;
    this.isDraggingCam = false;
    if (!wasClick || this.pausedForDialog) return;

    this.updatePointerNdc(e);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    // 1. If in Build Mode, place building at raycasted terrain point
    if (this.activeBlueprint) {
      this.tryPlaceAtPointer();
      return;
    }

    // 2. Check if user clicked an existing building to inspect/upgrade
    const buildingObjs = Array.from(this.buildingMeshes.values());
    if (buildingObjs.length > 0) {
      const hits = this.raycaster.intersectObjects(buildingObjs, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.buildingId) obj = obj.parent;
        if (obj?.userData.buildingId) {
          this.sound.playSfx('click');
          this.callbacks.onInspectBuilding(obj.userData.buildingId as string);
          return;
        }
      }
    }

    // 3. Otherwise raycast terrain to set walk target
    const terrainHits = this.raycaster.intersectObject(this.terrainMesh, false);
    if (terrainHits.length > 0) {
      const pt = terrainHits[0].point;
      if (Math.abs(pt.x) < WORLD_HALF - 5 && Math.abs(pt.z) < WORLD_HALF - 5) {
        this.walkTarget = { x: pt.x, z: pt.z };
        this.walkWaypointMesh.position.set(pt.x, groundHeightAt(pt.x, pt.z) + 0.12, pt.z);
        this.walkWaypointMesh.visible = true;
        this.sound.playSfx('click');
      }
    }
  };

  private updatePointerNdc(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public setTouchVector(x: number, z: number): void {
    this.touchVector.x = x;
    this.touchVector.z = z;
  }

  public jump(): void {
    if (this.isGrounded && !this.pausedForDialog) {
      this.playerVy = 8.4;
      this.isGrounded = false;
    }
  }

  public setDialogPaused(paused: boolean, npcId: NpcId | null = null): void {
    this.pausedForDialog = paused;
    this.focusNpcId = npcId;
    if (paused) {
      this.keys = {};
      this.walkTarget = null;
      this.walkWaypointMesh.visible = false;
    }
  }

  public toggleAudio(): boolean {
    return this.sound.toggle();
  }

  public isAudioEnabled(): boolean {
    return this.sound.isEnabled();
  }

  public advanceTimeOfDay(hours = 3): void {
    const dayLength = 300;
    this.state.simTime += (hours / 24) * dayLength;
    this.updateAtmosphereAndDayNight(this.state.simTime);
    this.persist();
    this.emitHud();
    const { clockLabel, timeOfDayLabel } = this.getClockInfo(this.state.simTime);
    this.toast(`הזמן בעמק התקדם ל-${clockLabel} (${timeOfDayLabel}).`, 'info');
  }

  public setBuildBlueprint(id: BlueprintId | null): void {
    if (this.ghostGroup) {
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
    this.activeBlueprint = id;
    this.buildRot = 0;
    this.ghostRing.visible = !!id;
    if (id) {
      this.ghostGroup = createInventionGroup(id, 1, this.tex, true);
      this.scene.add(this.ghostGroup);
    }
    this.callbacks.onBuildModeChange(id);
  }

  private tryPlaceAtPointer(): void {
    if (!this.activeBlueprint || !this.hoverWorldPoint) return;
    if (!this.hoverBuildValid) {
      this.toast('אי אפשר להציב כאן — בדוק מרחק, שיפוע או קרבה למים.', 'warn');
      return;
    }
    const bp = BLUEPRINTS.find((b) => b.id === this.activeBlueprint);
    if (!bp) return;
    const cost = bp.tiers[0].cost;
    if (!this.canAfford(cost)) {
      this.toast('חסרים משאבים לבניית ההמצאה הזו.', 'warn');
      return;
    }

    this.spendCost(cost);
    const px = this.hoverWorldPoint.x;
    const pz = this.hoverWorldPoint.z;
    const rot =
      this.activeBlueprint === 'bridge'
        ? Math.abs(px - 37.5) < 12 && Math.abs(pz - 48) < 15
          ? 0.2
          : 0
        : this.buildRot;

    const placed: PlacedBuilding = {
      id: `b_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      type: this.activeBlueprint,
      x: px,
      z: pz,
      rot,
      tier: 1,
      growth: this.activeBlueprint === 'irrigator' ? 0.25 : 0,
      energy: 0.5,
      waterSupply: 0.5,
      placedAt: this.state.simTime,
      note: 'המצאה פעילה בעמק',
    };

    this.state.buildings.push(placed);
    this.sound.playSfx('build');
    this.addJournal(`בנית ${bp.tiers[0].name} בעמק.`, 'build');
    this.toast(`${bp.tiers[0].name} הוצב בהצלחה! לחץ עליו לשדרוג או בחינת סינרגיות.`, 'good');

    // Check cavern illumination if lantern/resonance placed near cavern entrance
    if (
      (placed.type === 'lantern' || placed.type === 'resonance') &&
      Math.hypot(px - 70, pz + 64) < 22 &&
      !this.state.cavernLit
    ) {
      this.igniteCavern();
    }

    // Check NPC quest completion
    for (const npc of NPCS_BASE) {
      if (this.state.completedQuests.includes(npc.questId)) continue;
      if (!npc.acceptableBlueprints.includes(placed.type)) continue;
      if (Math.hypot(px - npc.questTarget.x, pz - npc.questTarget.z) <= npc.questTarget.radius) {
        this.completeNpcQuest(npc.id, placed.type);
      }
    }

    this.syncBuildingsToScene();
    this.setBuildBlueprint(null);
    this.persist();
    this.emitHud();
  }

  private igniteCavern(): void {
    this.state.cavernLit = true;
    this.cavernMistMesh.visible = false;
    this.cavernLight.intensity = 3.6;
    this.sound.playSfx('secret');
    this.addJournal('מערת הגבישים נדלקה באור ונחשפו מרבצי רונה וכתובת עתיקה.', 'discovery');
    this.toast('מערת הגבישים נדלקה! הערפל התפזר והמעבר הפנימי פתוח.', 'secret');
  }

  private completeNpcQuest(npcId: NpcId, usedType: BlueprintId): void {
    const npc = NPCS_BASE.find((n) => n.id === npcId);
    if (!npc) return;
    this.state.completedQuests.push(npc.questId);

    const activePromise = this.state.promises.find(
      (p) => p.npc === npcId && (p.status === 'active' || p.status === 'overdue'),
    );
    const onTime = activePromise?.status === 'active';
    if (activePromise) {
      activePromise.status = onTime ? 'done' : 'done_late';
    }

    const mem = this.state.npcMemories[npcId];
    mem.trust = Math.min(5, mem.trust + (onTime ? 1.5 : 1.0));
    mem.mood = Math.min(100, mem.mood + 18);
    if (onTime) mem.promisesKept++;
    const bpName = BLUEPRINTS.find((b) => b.id === usedType)?.name || usedType;
    mem.rememberedEvents.unshift(`בנית את ${bpName} עבור "${npc.questTitle}".`);

    this.sound.playSfx('complete');
    this.addJournal(`השלמת עם ${npc.name}: ${npc.questTitle}.`, 'bond');
    this.toast(`${npc.name}: "${npc.questTitle}" הושלם! המרקם של העמק השתנה.`, 'good');
  }

  public upgradeBuilding(buildingId: string): boolean {
    const b = this.state.buildings.find((x) => x.id === buildingId);
    if (!b || b.tier >= 3) return false;
    const bp = BLUEPRINTS.find((x) => x.id === b.type);
    if (!bp) return false;
    const nextTier = (b.tier + 1) as 2 | 3;
    const cost = bp.tiers[nextTier - 1].cost;
    if (!this.canAfford(cost)) {
      this.toast('חסרים משאבים לשדרוג זה.', 'warn');
      return false;
    }
    this.spendCost(cost);
    b.tier = nextTier;
    this.sound.playSfx('upgrade');
    this.addJournal(`שדרגת את ${bp.name} לרמה ${nextTier}: ${bp.tiers[nextTier - 1].name}.`, 'build');
    this.toast(`שודרג לרמה ${nextTier}: ${bp.tiers[nextTier - 1].name}!`, 'good');
    this.syncBuildingsToScene();
    this.persist();
    this.emitHud();
    return true;
  }

  public dismantleBuilding(buildingId: string): void {
    const idx = this.state.buildings.findIndex((x) => x.id === buildingId);
    if (idx < 0) return;
    const b = this.state.buildings[idx];
    const bp = BLUEPRINTS.find((x) => x.id === b.type);
    this.state.buildings.splice(idx, 1);

    // Refund 60% of Tier 1 cost
    if (bp) {
      for (const [k, v] of Object.entries(bp.tiers[0].cost)) {
        const resKey = k as ResourceType;
        this.state.inv[resKey] = (this.state.inv[resKey] || 0) + Math.max(1, Math.floor((v || 0) * 0.6));
      }
    }
    this.sound.playSfx('build');
    this.toast('ההמצאה פורקה וחלק מהחומרים הוחזרו לתיק.', 'info');
    this.syncBuildingsToScene();
    this.persist();
    this.emitHud();
  }

  public advanceCommunityProject(projectId: string): boolean {
    const proj = COMMUNITY_PROJECTS_DATA.find((p) => p.id === projectId);
    if (!proj) return false;
    const stage = this.state.communityProjects[projectId] || 0;
    if (stage >= proj.maxStages) return false;

    const req = proj.requirements[stage];
    if (req.minVitality && this.computeVitality() < req.minVitality) {
      this.toast(`נדרשת חיוניות עמק של ${req.minVitality}% כדי להמשיך לשלב זה.`, 'warn');
      return false;
    }
    if (!this.canAfford(req.cost)) {
      this.toast('חסרים משאבים לקידום הפרויקט הקהילתי.', 'warn');
      return false;
    }

    this.spendCost(req.cost);
    this.state.communityProjects[projectId] = stage + 1;
    this.sound.playSfx(stage + 1 === proj.maxStages ? 'complete' : 'upgrade');
    this.addJournal(
      `קידמת את "${proj.title}" לשלב ${stage + 1}/${proj.maxStages}.`,
      'project',
    );
    this.toast(
      stage + 1 === proj.maxStages
        ? `פרויקט קהילתי הושלם: ${proj.title}!`
        : `${proj.title} התקדם לשלב ${stage + 1}.`,
      'good',
    );
    this.syncProjectsToScene();
    this.persist();
    this.emitHud();
    return true;
  }

  public interact(): void {
    const prompt = this.findNearbyPrompt();
    if (!prompt) {
      this.toast('אין אינטראקציה ממש לידך. התקרב לדמות, חומר, שריד או מבנה.', 'info');
      return;
    }
    if (prompt.kind === 'npc') {
      const npcId = prompt.id as NpcId;
      this.state.npcMemories[npcId].met = true;
      this.sound.playSfx('talk');
      this.callbacks.onOpenNpc(npcId);
      this.emitHud();
    } else if (prompt.kind === 'resource') {
      this.gatherNearby();
    } else if (prompt.kind === 'building') {
      this.sound.playSfx('click');
      this.callbacks.onInspectBuilding(prompt.id);
    } else if (prompt.kind === 'project') {
      this.sound.playSfx('click');
      this.callbacks.onOpenProject(prompt.id);
    } else if (prompt.kind === 'pillar') {
      const idx = Number(prompt.id.replace('pillar_', ''));
      this.activateRuinPillar(idx);
    } else if (prompt.kind === 'secret') {
      this.discoverSecret(prompt.id);
    }
  }

  public gatherNearby(): void {
    let best: WorldResourceNode | null = null;
    let bestD = 5.2;
    for (const r of this.resourceNodes) {
      if (!r.active) continue;
      if (r.hiddenUntilPulse && (r.revealedUntil || 0) < this.state.simTime) continue;
      const d = Math.hypot(r.x - this.playerX, r.z - this.playerZ);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    if (!best) {
      this.toast('אין משאב בטווח איסוף. נסה פעימת תהודה (Q) לגלות מרבצים חבויים.', 'info');
      return;
    }

    best.active = false;
    best.respawnAt = this.state.simTime + 65;
    const mesh = this.resourceMeshes.get(best.id);
    if (mesh) mesh.visible = false;

    this.state.inv[best.type] = (this.state.inv[best.type] || 0) + 1;
    this.sound.playSfx('gather');
    this.toast(`אספת ${RESOURCES[best.type].name}.`, 'good');
    this.persist();
    this.emitHud();
  }

  private activateRuinPillar(idx: number): void {
    if (this.state.ruinPillars[idx]) {
      this.toast('עמוד הרונה הזה כבר מהדהד.', 'info');
      return;
    }
    this.state.ruinPillars[idx] = true;
    const mesh = this.ruinPillarMeshes[idx];
    const ring = mesh?.userData.runeRing as THREE.Mesh | undefined;
    if (ring) {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0xc9a6ff);
      mat.emissiveIntensity = 1.8;
    }
    this.sound.playSfx('upgrade');
    this.toast(`עמוד רונה ${idx + 1}/3 התעורר!`, 'secret');

    if (this.state.ruinPillars.every(Boolean)) {
      this.discoverSecret('secret_ruins_sundial');
    }
    this.persist();
    this.emitHud();
  }

  private discoverSecret(secretId: string): void {
    if (this.state.discoveredSecrets.includes(secretId)) {
      const sec = INITIAL_SECRETS.find((s) => s.id === secretId);
      if (sec) this.toast(`${sec.title}: ${sec.lore}`, 'info');
      return;
    }
    const sec = INITIAL_SECRETS.find((s) => s.id === secretId);
    if (!sec) return;
    if (sec.id === 'secret_ruins_sundial' && !this.state.ruinPillars.every(Boolean)) {
      this.toast('שלושת עמודי הרונה סביב הרחבה צריכים להידלק קודם.', 'warn');
      return;
    }

    this.state.discoveredSecrets.push(sec.id);
    for (const [k, v] of Object.entries(sec.reward)) {
      const rk = k as ResourceType;
      this.state.inv[rk] = (this.state.inv[rk] || 0) + (v || 0);
    }
    const grp = this.secretMeshes.get(sec.id);
    const orb = grp?.userData.orb as THREE.Mesh | undefined;
    if (orb) {
      const mat = orb.material as THREE.MeshStandardMaterial;
      mat.color.setHex(0x7ef2c9);
      mat.emissive.setHex(0x2b8f6d);
      mat.emissiveIntensity = 0.7;
    }
    this.sound.playSfx('secret');
    this.addJournal(`סוד נחשף — ${sec.title}: ${sec.lore}`, 'discovery');
    this.toast(`סוד עתיק נחשף: ${sec.title}!`, 'secret');
    this.persist();
    this.emitHud();
  }

  public triggerPulse(): void {
    if (this.state.simTime < this.pulseCooldownAt) {
      this.toast('גל התהודה עדיין נטען...', 'info');
      return;
    }
    this.pulseCooldownAt = this.state.simTime + 6;
    this.pulseActive = true;
    this.pulseAge = 0;
    this.pulseOrigin.set(this.playerX, this.playerY + 0.35, this.playerZ);
    this.pulseRing.position.copy(this.pulseOrigin);
    this.pulseRing.scale.setScalar(1);
    this.pulseRing.visible = true;
    this.sound.playSfx('pulse');

    let revealed = 0;
    for (const r of this.resourceNodes) {
      if (r.active && r.hiddenUntilPulse && Math.hypot(r.x - this.playerX, r.z - this.playerZ) < 36) {
        r.revealedUntil = this.state.simTime + 20;
        const m = this.resourceMeshes.get(r.id);
        if (m) m.visible = true;
        revealed++;
      }
    }

    // If pulsed near cavern entrance, lift mist temporarily or ignite
    if (!this.state.cavernLit && Math.hypot(this.playerX - 66, this.playerZ + 62) < 20) {
      this.igniteCavern();
    }

    if (revealed > 0) {
      this.toast(`תהודה חשפה ${revealed} משאבים חבויים בסביבה!`, 'secret');
    } else {
      this.toast('פעימת תהודה נשלחה על פני העמק.', 'info');
    }
  }

  public applyDialogueChoice(
    npcId: NpcId,
    choice: {
      tone: 'empathy' | 'curious' | 'practical';
      trustDelta?: number;
      moodDelta?: number;
      rememberNote?: string;
      action?: string;
    },
  ): void {
    const mem = this.state.npcMemories[npcId];
    mem.conversations++;
    mem.lastChoiceTone = choice.tone;
    if (choice.trustDelta) mem.trust = Math.min(5, mem.trust + choice.trustDelta);
    if (choice.moodDelta) mem.mood = Math.min(100, mem.mood + choice.moodDelta);
    if (choice.rememberNote && !mem.rememberedEvents.includes(choice.rememberNote)) {
      mem.rememberedEvents.unshift(choice.rememberNote);
      mem.rememberedEvents = mem.rememberedEvents.slice(0, 6);
    }

    const npc = NPCS_BASE.find((n) => n.id === npcId);
    if (!npc) return;

    if (choice.action === 'take_promise') {
      const existing = this.state.promises.find(
        (p) => p.npc === npcId && (p.status === 'active' || p.status === 'overdue'),
      );
      if (!existing) {
        this.state.promises.push({
          id: `pr_${Date.now()}`,
          npc: npcId,
          questId: npc.questId,
          title: npc.questTitle,
          status: 'active',
          dueAt: this.state.simTime + 260,
          createdAt: this.state.simTime,
          renegotiations: 0,
        });
        this.addJournal(`התחייבת מול ${npc.name}: ${npc.questTitle}.`, 'promise');
        this.toast(`לקחת אחריות מול ${npc.name}. תמיד אפשר לחזור ולעדכן אם דברים משתנים.`, 'good');
      }
    } else if (choice.action === 'renegotiate') {
      const p = this.state.promises.find(
        (pr) => pr.npc === npcId && (pr.status === 'active' || pr.status === 'overdue'),
      );
      if (p) {
        p.status = 'active';
        p.dueAt = this.state.simTime + 260;
        p.renegotiations++;
        mem.promisesRenegotiated++;
        mem.trust = Math.min(5, mem.trust + 0.3);
        this.addJournal(`תיאמת מחדש עם ${npc.name} את הזמנים להשלמת "${npc.questTitle}".`, 'promise');
        this.toast('הזמנים עודכנו בתיאום מלא עם הדמות.', 'good');
      }
    } else if (choice.action === 'release_promise') {
      const p = this.state.promises.find(
        (pr) => pr.npc === npcId && (pr.status === 'active' || pr.status === 'overdue'),
      );
      if (p) {
        p.status = 'released';
        this.addJournal(`שחררת בגלוי את ההתחייבות מול ${npc.name}.`, 'promise');
        this.toast('שחררת את ההתחייבות בכנות וללא משקעים.', 'info');
      }
    }

    this.persist();
    this.emitHud();
  }

  public giveGiftToNpc(npcId: NpcId, resType: ResourceType): { aligned: boolean; reply: string } {
    if ((this.state.inv[resType] || 0) <= 0) {
      return { aligned: false, reply: 'אין לך את החומר הזה כרגע בתיק.' };
    }
    const npc = NPCS_BASE.find((n) => n.id === npcId)!;
    const mem = this.state.npcMemories[npcId];
    this.state.inv[resType]--;
    const aligned = npc.favoredGift === resType;
    mem.trust = Math.min(5, mem.trust + (aligned ? 0.85 : 0.25));
    mem.mood = Math.min(100, mem.mood + (aligned ? 14 : 4));
    if (aligned) {
      mem.giftsAligned++;
      mem.rememberedEvents.unshift(`הבאת בדיוק את מה שהיה חסר (${RESOURCES[resType].name}).`);
    }
    this.sound.playSfx('gather');
    this.addJournal(`חלקת ${RESOURCES[resType].name} עם ${npc.name}.`, 'bond');
    this.persist();
    this.emitHud();
    return {
      aligned,
      reply: aligned
        ? `בדיוק ${RESOURCES[resType].name} היו חסרים לי! תודה ששמת לב למה שבאמת נחוץ.`
        : `תודה על ה${RESOURCES[resType].name}. כרגע אני זקוקה במיוחד ל${RESOURCES[npc.favoredGift].name}, אבל הכוונה מחממת את הלב.`,
    };
  }

  public saveRealPlan(plan: RealActionPlan | null): void {
    this.state.realPlan = plan;
    if (plan?.status === 'done') this.state.realDoneCount++;
    if (plan) {
      this.addJournal(
        plan.status === 'done'
          ? `צעד אמיתי הושלם: ${plan.action}`
          : `תוכנית גשר למציאות עודכנה: ${plan.action}`,
        'bond',
      );
    }
    this.persist();
    this.emitHud();
  }

  public movePlayerToward(x: number, z: number): void {
    this.walkTarget = { x, z };
    this.walkWaypointMesh.position.set(x, groundHeightAt(x, z) + 0.12, z);
    this.walkWaypointMesh.visible = true;
  }

  public resetWorld(): void {
    localStorage.removeItem(SAVE_KEY);
    this.state = createFreshState();
    this.playerX = this.state.playerPos.x;
    this.playerZ = this.state.playerPos.z;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.walkTarget = null;
    this.walkWaypointMesh.visible = false;
    this.cavernMistMesh.visible = true;
    this.cavernLight.intensity = 0.4;
    this.ruinPillarMeshes.forEach((p) => {
      const ring = p.userData.runeRing as THREE.Mesh;
      (ring.material as THREE.MeshStandardMaterial).emissive.setHex(0x2d2444);
    });
    this.resourceNodes.forEach((r) => {
      r.active = true;
      const m = this.resourceMeshes.get(r.id);
      if (m) m.visible = !r.hiddenUntilPulse;
    });
    this.syncBuildingsToScene();
    this.syncProjectsToScene();
    this.persist();
    this.emitHud();
    this.toast('עולם חדש נזרע. צא לחקור את העמק מחדש!', 'good');
  }

  private canAfford(cost: Partial<ResourceInventory>): boolean {
    return Object.entries(cost).every(([k, v]) => (this.state.inv[k as ResourceType] || 0) >= (v || 0));
  }

  private spendCost(cost: Partial<ResourceInventory>): void {
    for (const [k, v] of Object.entries(cost)) {
      const rk = k as ResourceType;
      this.state.inv[rk] = Math.max(0, (this.state.inv[rk] || 0) - (v || 0));
    }
  }

  private addJournal(text: string, kind: GameState['journal'][number]['kind']): void {
    this.state.journal.unshift({
      id: `j_${Date.now()}_${Math.random().toString(16).slice(2, 5)}`,
      text,
      kind,
      day: this.state.day,
    });
    this.state.journal = this.state.journal.slice(0, 18);
  }

  private toast(text: string, tone: ToastMessage['tone']): void {
    this.callbacks.onToast({
      id: `t_${Date.now()}_${Math.random().toString(16).slice(2, 5)}`,
      text,
      tone,
    });
  }

  private findNearbyPrompt(): NearbyPrompt | null {
    // 1. NPCs
    for (const npc of NPCS_BASE) {
      const nr = this.npcRigs.get(npc.id);
      if (!nr) continue;
      if (Math.hypot(nr.x - this.playerX, nr.z - this.playerZ) < 4.5) {
        return {
          kind: 'npc',
          id: npc.id,
          title: npc.name,
          subtitle: `${npc.title} — לחץ לשיחה מסועפת`,
          keyHint: 'E',
        };
      }
    }

    // 2. Community Projects
    for (const proj of COMMUNITY_PROJECTS_DATA) {
      if (Math.hypot(proj.x - this.playerX, proj.z - this.playerZ) < 4.6) {
        return {
          kind: 'project',
          id: proj.id,
          title: proj.title,
          subtitle: `פרויקט קהילתי (${this.state.communityProjects[proj.id] || 0}/${proj.maxStages})`,
          keyHint: 'E',
        };
      }
    }

    // 3. Ruin Pillars
    const pillarCoords: [number, number][] = [
      [-74, -56],
      [-66, -72],
      [-57, -56],
    ];
    for (let i = 0; i < pillarCoords.length; i++) {
      if (Math.hypot(pillarCoords[i][0] - this.playerX, pillarCoords[i][1] - this.playerZ) < 4.2) {
        return {
          kind: 'pillar',
          id: `pillar_${i}`,
          title: `עמוד רונה ${i + 1}`,
          subtitle: this.state.ruinPillars[i] ? 'כבר מהדהד' : 'להעיר את העמוד העתיק',
          keyHint: 'E',
        };
      }
    }

    // 4. Secrets
    for (const sec of INITIAL_SECRETS) {
      if (Math.hypot(sec.x - this.playerX, sec.z - this.playerZ) < 4.5) {
        return {
          kind: 'secret',
          id: sec.id,
          title: sec.title,
          subtitle: this.state.discoveredSecrets.includes(sec.id) ? 'סוד שנחשף' : 'לחקור תגלית עתיקה',
          keyHint: 'E',
        };
      }
    }

    // 5. Resources
    for (const r of this.resourceNodes) {
      if (!r.active) continue;
      if (r.hiddenUntilPulse && (r.revealedUntil || 0) < this.state.simTime) continue;
      if (Math.hypot(r.x - this.playerX, r.z - this.playerZ) < 4.2) {
        return {
          kind: 'resource',
          id: r.id,
          title: RESOURCES[r.type].name,
          subtitle: RESOURCES[r.type].shortDesc,
          keyHint: 'F',
        };
      }
    }

    // 6. Placed Buildings (for quick inspect/upgrade)
    for (const b of this.state.buildings) {
      if (Math.hypot(b.x - this.playerX, b.z - this.playerZ) < 4.4) {
        const bp = BLUEPRINTS.find((x) => x.id === b.type);
        return {
          kind: 'building',
          id: b.id,
          title: bp?.tiers[b.tier - 1].name || b.type,
          subtitle: `רמה ${b.tier}/3 — לחץ לשדרוג או פירוק`,
          keyHint: 'E',
        };
      }
    }

    return null;
  }

  private loop = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number): void {
    if (!this.pausedForDialog) {
      this.state.simTime += dt;
    }
    const t = this.state.simTime;
    this.waterUniforms.uTime.value = t;
    this.grassUniforms.uTime.value = t;

    this.updateAtmosphereAndDayNight(t);
    this.updatePlayerMovement(dt, t);
    this.updateNpcs(dt, t);
    this.updateWorldObjects(dt, t);
    this.updateBuildGhost();
    this.updateCamera(dt);

    // Periodic simulation (ecosystems, resource respawns, weather shifts, promises)
    this.simTickTimer += dt;
    if (this.simTickTimer >= 1.5 && !this.pausedForDialog) {
      this.stepEcosystemSystems(this.simTickTimer);
      this.simTickTimer = 0;
    }

    // Audio
    this.sound.update(t, this.state.weather, this.computeVitality());

    // HUD & Auto-Save
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.14) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 6) {
      this.saveTimer = 0;
      this.persist();
    }
  }

  private getClockInfo(t: number): {
    cycle: number;
    clockLabel: string;
    timeOfDayLabel: string;
    isNight: boolean;
  } {
    const dayLength = 300;
    const cycle = (t % dayLength) / dayLength; // 0 = 06:00 sunrise, 0.25 = 12:00, 0.5 = 18:00, 0.75 = 00:00
    const totalMinutes = Math.floor(((cycle * 24 + 6) % 24) * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(Math.floor((totalMinutes % 60) / 5) * 5).padStart(2, '0');
    const sunAngle = cycle * TAU;
    const sunH = Math.sin(sunAngle);
    const eastWest = Math.cos(sunAngle);

    let timeOfDayLabel = 'צהריים';
    if (sunH <= -0.15) timeOfDayLabel = 'לילה';
    else if (sunH < 0.2 && eastWest > 0) timeOfDayLabel = 'זריחה';
    else if (sunH < 0.2 && eastWest <= 0) timeOfDayLabel = 'דמדומים';
    else if (sunH < 0.52 && eastWest > 0) timeOfDayLabel = 'בוקר';
    else if (sunH < 0.52 && eastWest <= 0) timeOfDayLabel = 'שעת זהב';

    return {
      cycle,
      clockLabel: `${hh}:${mm}`,
      timeOfDayLabel,
      isNight: sunH < -0.06,
    };
  }

  private updateAtmosphereAndDayNight(t: number): void {
    const dayLength = 300;
    const newDay = 1 + Math.floor(t / dayLength);
    if (newDay > this.state.day) {
      this.state.day = newDay;
      const weathers: WeatherType[] = ['clear', 'breeze', 'mist', 'rain'];
      this.state.weather = weathers[newDay % weathers.length];
      this.toast(`יום ${newDay} בעמק התחיל.`, 'info');
    }

    const cycle = (t % dayLength) / dayLength; // 0..1
    const sunAngle = cycle * TAU;
    const sunHeight = Math.sin(sunAngle); // +1 noon, 0 horizon, -1 midnight
    const eastWest = Math.cos(sunAngle); // +1 east (dawn), -1 west (dusk)
    const isDayArc = sunHeight >= -0.04;

    // Celestial disc positions orbiting around player
    const sunOrbitX = eastWest * 115;
    const sunOrbitY = sunHeight * 92;
    const sunOrbitZ = -38 + Math.abs(eastWest) * 14;
    this.sunDisc.position.set(this.playerX + sunOrbitX, sunOrbitY, this.playerZ + sunOrbitZ);
    this.sunDisc.visible = sunHeight > -0.22;

    this.sunHalo.position.copy(this.sunDisc.position);
    this.sunHalo.lookAt(this.camera.position);
    this.sunHalo.visible = this.sunDisc.visible;

    const moonOrbitX = -sunOrbitX;
    const moonOrbitY = -sunOrbitY;
    this.moonDisc.position.set(this.playerX + moonOrbitX, moonOrbitY, this.playerZ + 44);
    this.moonDisc.visible = moonOrbitY > -18;

    // Directional shadow-casting light sweeps smoothly along the Sun during day and Moon during night
    if (isDayArc) {
      const clampedElev = Math.max(9, sunHeight * 72);
      this.sunLight.position.set(
        this.playerX + eastWest * 64,
        clampedElev,
        this.playerZ - 26,
      );
    } else {
      const clampedMoonElev = Math.max(15, -sunHeight * 58);
      this.sunLight.position.set(
        this.playerX - eastWest * 56,
        clampedMoonElev,
        this.playerZ + 28,
      );
    }
    this.sunLight.target.position.set(this.playerX, this.playerY, this.playerZ);

    // Smooth shadow softness: crisp at midday, softer elongated shadows at dawn/dusk/night
    const elevationAbs = Math.abs(sunHeight);
    this.sunLight.shadow.radius = THREE.MathUtils.lerp(3.4, 1.5, Math.min(1, elevationAbs * 1.4));

    // Multi-stage physical color temperature & hemisphere illumination
    const horizonFade = THREE.MathUtils.smoothstep(sunHeight, -0.06, 0.08);
    if (sunHeight > 0.32) {
      // Morning to Noon daylight
      const noonK = Math.min(1, (sunHeight - 0.32) / 0.68);
      _colA.setHex(0x95c9e0).lerp(_colC.setHex(0x7ebde0), noonK); // Sky
      _colB.setHex(0xffe6c4).lerp(_colC.setHex(0xfff6e2), noonK); // Sun 4800K -> 5800K
      this.sunLight.intensity = 1.65 + noonK * 0.6;
      this.hemiLight.color.setHex(0xa8dcf7);
      this.hemiLight.groundColor.setHex(0x3a5239);
      this.hemiLight.intensity = 0.78 + noonK * 0.14;
      this.scene.environmentIntensity = 0.48 + noonK * 0.1;
      this.renderer.toneMappingExposure = 1.06 + noonK * 0.04;
      (this.sunDisc.material as THREE.MeshBasicMaterial).color.setHex(0xfff4cf);
      (this.sunHalo.material as THREE.MeshBasicMaterial).color.setHex(0xffe2a3);
      (this.sunHalo.material as THREE.MeshBasicMaterial).opacity = 0.45;
    } else if (sunHeight > -0.18) {
      // Dawn (eastWest > 0) or Golden Dusk (eastWest <= 0)
      const k = (sunHeight + 0.18) / 0.5; // 0 (deep twilight) -> 1 (low morning/afternoon)
      const twilightSky = eastWest > 0 ? 0x263554 : 0x232a4d;
      const horizonSky = eastWest > 0 ? 0xd9927c : 0xd67452;
      if (k < 0.52) {
        _colA.setHex(twilightSky).lerp(_colC.setHex(horizonSky), k / 0.52);
      } else {
        _colA.setHex(horizonSky).lerp(_colC.setHex(0x95c9e0), (k - 0.52) / 0.48);
      }

      // Color temperature shifts deeply warm near horizon, smoothly dipping at sun/moon cross
      if (isDayArc) {
        _colB.setHex(0xff7e45).lerp(_colC.setHex(0xffe0b2), horizonFade);
        this.sunLight.intensity = 0.2 + horizonFade * 1.42;
      } else {
        const moonUp = THREE.MathUtils.smoothstep(-sunHeight, 0.04, 0.18);
        _colB.setHex(0x5273a8).lerp(_colC.setHex(0x82b0e6), moonUp);
        this.sunLight.intensity = 0.18 + moonUp * 0.4;
      }

      this.hemiLight.color.setHex(0x4b5c80).lerp(_colC.setHex(0xefb495), k);
      this.hemiLight.groundColor.setHex(0x1b2626).lerp(_colC.setHex(0x4a4332), k);
      this.hemiLight.intensity = 0.44 + k * 0.34;
      this.scene.environmentIntensity = 0.24 + k * 0.24;
      this.renderer.toneMappingExposure = 0.98 + k * 0.08;
      (this.sunDisc.material as THREE.MeshBasicMaterial).color.setHex(0xffae63);
      (this.sunHalo.material as THREE.MeshBasicMaterial).color.setHex(0xff8447);
      (this.sunHalo.material as THREE.MeshBasicMaterial).opacity = 0.72;
    } else {
      // Deep Starry Night
      _colA.setHex(0x091628);
      _colB.setHex(0x82b2e8); // Cool silver-blue moonlight
      this.sunLight.intensity = 0.58;
      this.hemiLight.color.setHex(0x1f3a5c);
      this.hemiLight.groundColor.setHex(0x101c1c);
      this.hemiLight.intensity = 0.42;
      this.scene.environmentIntensity = 0.22;
      this.renderer.toneMappingExposure = 0.98;
    }

    // Weather modulation on sky & fog density
    if (this.state.weather === 'mist') {
      _colA.lerp(_colC.setHex(0x8ba8ad), isDayArc ? 0.45 : 0.25);
      (this.scene.fog as THREE.FogExp2).density = 0.0115;
    } else if (this.state.weather === 'rain') {
      _colA.lerp(_colC.setHex(0x486273), isDayArc ? 0.52 : 0.3);
      (this.scene.fog as THREE.FogExp2).density = 0.0092;
      this.sunLight.intensity *= 0.72;
    } else {
      (this.scene.fog as THREE.FogExp2).density = isDayArc ? 0.0058 : 0.0074;
    }

    this.sunLight.color.copy(_colB);
    (this.scene.background as THREE.Color).copy(_colA);
    (this.scene.fog as THREE.FogExp2).color.copy(_colA);
    (this.skyDome.material as THREE.MeshBasicMaterial).color.copy(_colA);

    // Reactive night elements: stars, fireflies, cottage windows, placed lantern/hearth lights
    const nightFactor = THREE.MathUtils.clamp((-sunHeight + 0.12) / 0.5, 0, 1);
    (this.starsPoints.material as THREE.PointsMaterial).opacity = nightFactor * 0.92;
    (this.firefliesPoints.material as THREE.PointsMaterial).opacity = 0.08 + nightFactor * 0.82;
    this.rainPoints.visible = this.state.weather === 'rain';

    const windowGlow = 0.22 + nightFactor * 1.35;
    for (const mat of this.cottageWindowMats) {
      mat.emissiveIntensity = windowGlow;
    }

    const lightMult = 0.42 + nightFactor * 1.05;
    for (const pt of this.buildingPointLights.values()) {
      const base = (pt.userData.baseIntensity as number) || 2.5;
      pt.intensity = base * lightMult;
    }
  }

  private updatePlayerMovement(dt: number, t: number): void {
    if (this.pausedForDialog) return;

    let inX = 0;
    let inZ = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inX += 1;
    inX += this.touchVector.x;
    inZ += this.touchVector.z;

    const sprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && this.state.stamina > 3;
    let moveWorldX = 0;
    let moveWorldZ = 0;
    let moving = false;

    if (Math.hypot(inX, inZ) > 0.08) {
      this.walkTarget = null;
      this.walkWaypointMesh.visible = false;
      const len = Math.hypot(inX, inZ);
      const nx = inX / len;
      const nz = inZ / len;
      // Rotate input relative to camera yaw
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      moveWorldX = nx * cos + nz * sin;
      moveWorldZ = -nx * sin + nz * cos;
      moving = true;
    } else if (this.walkTarget) {
      const dx = this.walkTarget.x - this.playerX;
      const dz = this.walkTarget.z - this.playerZ;
      const d = Math.hypot(dx, dz);
      if (d < 0.7) {
        this.walkTarget = null;
        this.walkWaypointMesh.visible = false;
      } else {
        moveWorldX = dx / d;
        moveWorldZ = dz / d;
        moving = true;
      }
    }

    const speed = sprinting ? 14.5 : 9.2;
    if (moving && sprinting) {
      this.state.stamina = Math.max(0, this.state.stamina - 22 * dt);
    } else {
      this.state.stamina = Math.min(100, this.state.stamina + (moving ? 9 : 18) * dt);
    }

    if (moving) {
      const candX = THREE.MathUtils.clamp(this.playerX + moveWorldX * speed * dt, -WORLD_HALF + 8, WORLD_HALF - 8);
      const candZ = THREE.MathUtils.clamp(this.playerZ + moveWorldZ * speed * dt, -WORLD_HALF + 8, WORLD_HALF - 8);

      const canMoveTo = (x: number, z: number): boolean => {
        if (!isWalkableWater(x, z, this.state.buildings)) return false;
        if (terrainSlopeAt(x, z) > 1.35) return false;
        if (this.staticObstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) return false;
        return true;
      };

      if (canMoveTo(candX, this.playerZ)) this.playerX = candX;
      if (canMoveTo(this.playerX, candZ)) this.playerZ = candZ;

      const targetYaw = Math.atan2(moveWorldX, moveWorldZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      this.playerYaw += diff * Math.min(1, 12 * dt);
      this.playerWalkPhase += dt * (sprinting ? 15 : 10);
      this.sound.playFootstep(groundHeightAt(this.playerX, this.playerZ) < WATER_LEVEL + 0.15, t);
    }

    // Vertical gravity & terrain / bridge snapping
    const terrainY = groundHeightAt(this.playerX, this.playerZ);
    const bridgeY = bridgeDeckHeightAt(this.playerX, this.playerZ, this.state.buildings);
    const floorY = bridgeY !== null ? Math.max(terrainY, bridgeY) : terrainY;

    if (!this.isGrounded || this.playerY > floorY + 0.04) {
      this.playerVy -= 24 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= floorY) {
        this.playerY = floorY;
        this.playerVy = 0;
        this.isGrounded = true;
      }
    } else {
      this.playerY = THREE.MathUtils.damp(this.playerY, floorY, 18, dt);
    }

    this.playerRig.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.group.rotation.y = this.playerYaw;

    // Procedural limb animation
    const swing = moving ? Math.sin(this.playerWalkPhase) * (sprinting ? 0.72 : 0.5) : 0;
    this.playerRig.leftLeg.rotation.x = swing;
    this.playerRig.rightLeg.rotation.x = -swing;
    this.playerRig.leftArm.rotation.x = -swing * 0.7;
    this.playerRig.rightArm.rotation.x = swing * 0.7;
    this.playerRig.bodyGroup.position.y = moving ? Math.abs(Math.sin(this.playerWalkPhase)) * 0.08 : Math.sin(t * 2.2) * 0.025;
    this.playerRig.scarf.rotation.x = 0.25 + (moving ? (sprinting ? 0.65 : 0.4) : Math.sin(t * 2) * 0.08);

    // Zone arrival detection
    const zId = detectZone(this.playerX, this.playerZ);
    if (zId !== this.lastZoneId) {
      this.lastZoneId = zId;
      if (zId === 'cavern' && !this.state.cavernLit) {
        this.toast('הגעת לפתח מערת הגבישים. שדר פעימת תהודה (Q) או הצב פנס כדי להאיר בפנים.', 'info');
      } else if (zId === 'island') {
        this.toast('הגעת אל אי המפל החבוי!', 'secret');
      }
    }
  }

  private updateNpcs(dt: number, t: number): void {
    const needs = this.computeNpcNeeds();
    const benches = this.state.buildings.filter((b) => b.type === 'bench');
    const isEvening = Math.sin((t % 300) / 300 * TAU) < 0.15;

    for (const npc of NPCS_BASE) {
      const entry = this.npcRigs.get(npc.id);
      if (!entry) continue;

      let goalX = needs[npc.id].focusX;
      let goalZ = needs[npc.id].focusZ;

      // If benches exist in the evening, NPCs actually walk to gather near them!
      if (isEvening && benches.length > 0 && Math.sin(t * 0.08 + entry.phase) > -0.2) {
        const b = benches[0];
        const angle = entry.phase;
        goalX = b.x + Math.cos(angle) * 2.8;
        goalZ = b.z + Math.sin(angle) * 2.8;
      }

      const dx = goalX - entry.x;
      const dz = goalZ - entry.z;
      const dist = Math.hypot(dx, dz);
      let walking = false;

      if (dist > 1.2) {
        const step = Math.min(dist, 3.2 * dt);
        const nx = entry.x + (dx / dist) * step;
        const nz = entry.z + (dz / dist) * step;
        if (isWalkableWater(nx, nz, this.state.buildings)) {
          entry.x = nx;
          entry.z = nz;
          entry.yaw = Math.atan2(dx, dz);
          walking = true;
        }
      } else if (this.focusNpcId === npc.id) {
        entry.yaw = Math.atan2(this.playerX - entry.x, this.playerZ - entry.z);
      }

      const ny = bridgeDeckHeightAt(entry.x, entry.z, this.state.buildings) ?? groundHeightAt(entry.x, entry.z);
      entry.rig.group.position.set(entry.x, ny, entry.z);
      entry.rig.group.rotation.y = entry.yaw;

      const s = walking ? Math.sin(t * 7 + entry.phase) * 0.42 : 0;
      entry.rig.leftLeg.rotation.x = s;
      entry.rig.rightLeg.rotation.x = -s;
      entry.rig.leftArm.rotation.x = -s * 0.6;
      entry.rig.rightArm.rotation.x = s * 0.6;
      entry.rig.bodyGroup.position.y = walking ? Math.abs(Math.sin(t * 7 + entry.phase)) * 0.06 : Math.sin(t * 1.8 + entry.phase) * 0.025;
    }
  }

  private updateWorldObjects(dt: number, t: number): void {
    // Animate invention spinners & glowing crystals
    for (const grp of this.buildingMeshes.values()) {
      const spinners = grp.userData.spinners as THREE.Object3D[] | undefined;
      if (spinners) {
        spinners.forEach((sp, i) => {
          sp.rotation.y += dt * (i % 2 === 0 ? 1.4 : -0.95);
        });
      }
    }

    // Bob resource crystals/drops
    for (const r of this.resourceNodes) {
      if (!r.active && t >= r.respawnAt) {
        r.active = true;
        const m = this.resourceMeshes.get(r.id);
        if (m) m.visible = !r.hiddenUntilPulse || (r.revealedUntil || 0) > t;
      }
      if (r.active && r.hiddenUntilPulse && (r.revealedUntil || 0) < t) {
        const m = this.resourceMeshes.get(r.id);
        if (m && m.visible) m.visible = false;
      }
      const m = this.resourceMeshes.get(r.id);
      if (m && m.visible) {
        m.rotation.y = t * 0.6;
      }
    }

    // Pulse wave expansion
    if (this.pulseActive) {
      this.pulseAge += dt;
      const dur = 1.65;
      if (this.pulseAge >= dur) {
        this.pulseActive = false;
        this.pulseRing.visible = false;
      } else {
        const k = this.pulseAge / dur;
        this.pulseRing.scale.setScalar(1 + k * 42);
        (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.78;
      }
    }

    // Animate wildlife
    const vitality = this.computeVitality();
    for (const deer of this.deerList) {
      deer.group.visible = vitality >= deer.minVitality;
      if (!deer.group.visible) continue;
      deer.phase += dt * 0.4;
      const nx = deer.x + Math.cos(deer.phase) * 3.5;
      const nz = deer.z + Math.sin(deer.phase * 0.7) * 3.5;
      deer.group.position.set(nx, groundHeightAt(nx, nz), nz);
      deer.group.rotation.y = -deer.phase;
    }

    this.birdsGroup.children.forEach((bird) => {
      const u = bird.userData;
      u.angle += dt * u.speed;
      bird.position.set(Math.cos(u.angle) * u.radius, u.height + Math.sin(t * 1.4 + u.angle) * 1.2, Math.sin(u.angle) * u.radius);
      bird.rotation.y = -u.angle;
      const flap = Math.sin(t * 7 + u.angle) * 0.45;
      bird.children[0].rotation.z = flap;
      bird.children[1].rotation.z = -flap;
    });

    // Rain fall around player
    if (this.rainPoints.visible) {
      const pos = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 24 * dt;
        if (y < 0) {
          y = 26;
          pos.setX(i, this.playerX + (Math.random() - 0.5) * 70);
          pos.setZ(i, this.playerZ + (Math.random() - 0.5) * 70);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Waypoint spin
    if (this.walkWaypointMesh.visible) {
      this.walkWaypointMesh.scale.setScalar(1 + Math.sin(t * 6) * 0.14);
    }

    // Update terrain vertex hydration if needed
    if (this.terrainNeedsColorUpdate) {
      this.updateTerrainVitalityColors();
    }
  }

  private updateBuildGhost(): void {
    if (!this.activeBlueprint || !this.ghostGroup) return;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.terrainMesh, false);
    if (hits.length === 0) {
      this.ghostGroup.visible = false;
      this.ghostRing.visible = false;
      this.hoverBuildValid = false;
      return;
    }

    const pt = hits[0].point;
    this.hoverWorldPoint = pt;
    const d = Math.hypot(pt.x - this.playerX, pt.z - this.playerZ);
    const overWater = groundHeightAt(pt.x, pt.z) < WATER_LEVEL + 0.1;
    const slope = terrainSlopeAt(pt.x, pt.z);
    const crowded = this.state.buildings.some((b) => Math.hypot(b.x - pt.x, b.z - pt.z) < 4.8);

    let valid = d <= 36 && !crowded;
    if (this.activeBlueprint === 'bridge') {
      valid = valid && overWater;
    } else {
      valid = valid && !overWater && slope < 0.72;
    }
    this.hoverBuildValid = valid;

    const placeY = this.activeBlueprint === 'bridge' ? WATER_LEVEL : pt.y;
    this.ghostGroup.visible = true;
    this.ghostGroup.position.set(pt.x, placeY, pt.z);
    this.ghostGroup.rotation.y = this.activeBlueprint === 'bridge' ? 0 : this.buildRot;

    this.ghostRing.visible = true;
    this.ghostRing.position.set(pt.x, placeY + 0.16, pt.z);
    (this.ghostRing.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x7ef2c9 : 0xff7070);

    this.ghostGroup.traverse((ch) => {
      if ((ch as THREE.Mesh).isMesh) {
        const m = (ch as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.color.setHex(valid ? 0x7ef2c9 : 0xff6b6b);
        m.emissive.setHex(valid ? 0x2ca880 : 0xa32626);
      }
    });
  }

  private updateCamera(dt: number): void {
    if (this.focusNpcId) {
      const nr = this.npcRigs.get(this.focusNpcId);
      if (nr) {
        const midX = (this.playerX + nr.x) / 2;
        const midZ = (this.playerZ + nr.z) / 2;
        const midY = (this.playerY + groundHeightAt(nr.x, nr.z)) / 2 + 1.4;
        _camTarget.set(midX, midY, midZ);
        const angle = Math.atan2(this.playerX - nr.x, this.playerZ - nr.z) + 0.65;
        _camDesired.set(midX + Math.sin(angle) * 6.8, midY + 1.8, midZ + Math.cos(angle) * 6.8);
        this.camera.position.lerp(_camDesired, 1 - Math.exp(-6 * dt));
        this.camera.lookAt(_camTarget);
        return;
      }
    }

    const horiz = Math.cos(this.camPitch) * this.camDistance;
    const vert = Math.sin(this.camPitch) * this.camDistance;

    _camTarget.set(this.playerX, this.playerY + 1.65, this.playerZ);
    _camDesired.set(
      this.playerX + Math.sin(this.camYaw) * horiz,
      Math.max(groundHeightAt(this.playerX, this.playerZ) + 1.2, this.playerY + vert),
      this.playerZ + Math.cos(this.camYaw) * horiz,
    );

    const smooth = 1 - Math.exp(-9.5 * dt);
    this.camera.position.lerp(_camDesired, smooth);
    this.camera.lookAt(_camTarget);
  }

  private stepEcosystemSystems(dt: number): void {
    let changed = false;
    const synergies = this.computeSynergies();

    // Grow irrigators & generate periodic water/seeds
    for (const b of this.state.buildings) {
      if (b.type === 'irrigator' && b.growth < 1) {
        const hasWaterLink = synergies.some(
          (s) => (s.fromId === b.id || s.toId === b.id) && s.key.startsWith('water_'),
        );
        const rate =
          (this.state.weather === 'rain' ? 0.035 : 0.012) *
          (hasWaterLink ? 2.1 : 1) *
          (b.tier === 3 ? 1.8 : b.tier === 2 ? 1.35 : 1);
        const prev = b.growth;
        b.growth = Math.min(1, b.growth + rate * dt);
        if (Math.floor(prev * 5) !== Math.floor(b.growth * 5)) {
          this.terrainNeedsColorUpdate = true;
          changed = true;
        }
        if (prev < 1 && b.growth >= 1) {
          this.state.inv.seed = (this.state.inv.seed || 0) + 1;
          this.toast('אמת השקיה הגיעה לפריחה מלאה והניבה זרע פלא!', 'good');
          changed = true;
        }
      }
      if (b.type === 'raincatcher') {
        const rate = this.state.weather === 'rain' ? 0.08 : b.tier >= 2 ? 0.025 : 0;
        b.waterSupply += rate * dt;
        if (b.waterSupply >= 1 && (this.state.inv.water || 0) < 15) {
          b.waterSupply = 0;
          this.state.inv.water = (this.state.inv.water || 0) + 1;
          changed = true;
        }
      }
    }

    // Promise deadlines (non-punitive accountability reminder)
    for (const p of this.state.promises) {
      if (p.status === 'active' && this.state.simTime > p.dueAt) {
        p.status = 'overdue';
        const npc = NPCS_BASE.find((n) => n.id === p.npc);
        if (npc) {
          this.toast(`${npc.name} ממתינה לעדכון על ההתחייבות — אפשר לדבר ולתאם מחדש.`, 'warn');
        }
        changed = true;
      }
    }

    if (changed) {
      this.emitHud();
    }
  }

  private emitHud(): void {
    const zId = detectZone(this.playerX, this.playerZ);
    const zMeta = ZONES[zId];
    const { cycle, clockLabel, timeOfDayLabel, isNight } = this.getClockInfo(this.state.simTime);
    const weatherLabels: Record<WeatherType, string> = {
      clear: 'שמיים צלולים',
      breeze: 'רוח עמק קלה',
      mist: 'ערפל עדין',
      rain: 'גשם מרווה',
    };

    this.callbacks.onHudUpdate({
      inv: { ...this.state.inv },
      zoneId: zId,
      zoneName: zMeta.name,
      zoneSubtitle: zMeta.subtitle,
      day: this.state.day,
      timeOfDayLabel,
      clockLabel,
      dayProgress: cycle,
      isNight,
      weather: this.state.weather,
      weatherLabel: weatherLabels[this.state.weather],
      vitality: this.computeVitality(),
      stamina: Math.round(this.state.stamina),
      pulseCooldown: Math.max(0, Math.min(1, (this.pulseCooldownAt - this.state.simTime) / 6)),
      synergies: this.computeSynergies(),
      npcNeeds: this.computeNpcNeeds(),
      npcMemories: this.state.npcMemories,
      buildings: [...this.state.buildings],
      completedQuests: [...this.state.completedQuests],
      promises: [...this.state.promises],
      discoveredSecrets: [...this.state.discoveredSecrets],
      ruinPillars: [...this.state.ruinPillars],
      cavernLit: this.state.cavernLit,
      communityProjects: { ...this.state.communityProjects },
      journal: [...this.state.journal],
      realPlan: this.state.realPlan,
      nearby: this.findNearbyPrompt(),
      playerPos: { x: this.playerX, z: this.playerZ },
      playerYaw: this.playerYaw,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    this.sound.dispose();
    this.tex.dispose();
    this.renderer.dispose();
  }
}
