import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SoundEngine } from './audio';
import {
  ACHIEVEMENTS,
  BIOME_PRESETS,
  BLUEPRINTS,
  CLIMATE_EVENT_LABELS,
  COMMUNITY_PROJECTS_DATA,
  CRAFT_ITEMS,
  CRAFT_RECIPES,
  INITIAL_SECRETS,
  NPC_PATROL_ROUTES,
  NPCS_BASE,
  RESOURCES,
  SEASON_LENGTH_DAYS,
  SEASON_ORDER,
  SEASONS,
  SUB_BIOMES,
  VALLEY_BLIGHT_SPOTS,
  ZONES,
} from './data';
import {
  createAncientTempleGroup,
  createBlightNestGroup,
  createBoulderClusterGroup,
  createCharacterRig,
  createCottage,
  createCrystalSpireCluster,
  createDeerGroup,
  createFloatingSkyIsleGroup,
  createForageItemMesh,
  createFoxGroup,
  createGiantMushroomGroup,
  createInventionGroup,
  createMeteorStreakGroup,
  createMonolithGroup,
  createResourceNodeMesh,
  createRuinPillarGroup,
  createShadowWispGroup,
  createStoneCircleGroup,
  createTeleportPortalGroup,
  createThermalSpringGroup,
  createTreeGroup,
  createUpdraftVortexGroup,
  type CharacterRig,
} from './models';
import {
  bridgeDeckHeightAt,
  CHUNK_SIZE,
  chunkSeedHash,
  createSeededRng,
  detectSubBiome,
  detectZone,
  FORD_Z,
  getSkyIsleForChunk,
  getThermalSpringForChunk,
  groundHeightAt,
  ISLAND_BRIDGE_POS,
  isInThermalSpringPool,
  isWalkableWater,
  MAIN_BRIDGE_POS,
  riverCenterX,
  riverHalfWidth,
  setActiveWorldConfig,
  skyPlatformHeightAt,
  terrainSlopeAt,
  WATER_LEVEL,
  WORLD_HALF,
} from './terrain';
import { createProceduralTextures, type ProceduralTexturePack } from './textures';
import type {
  AchievementState,
  AudioMixSettings,
  BiomePresetId,
  BlightNodeState,
  BlueprintId,
  ClimateEventType,
  CraftInventory,
  CraftItemId,
  GameState,
  HudSnapshot,
  LandmarkKind,
  LandmarkRecord,
  NearbyPrompt,
  NpcId,
  NpcMemory,
  NpcNeedState,
  PlacedBuilding,
  PortalDestination,
  ProximityItemNode,
  RealActionPlan,
  ResourceInventory,
  ResourceType,
  SeasonId,
  SubBiomeId,
  SynergyLink,
  ToastMessage,
  WeatherType,
  WorldResourceNode,
  WorldSeedConfig,
  ZoneId,
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
  onAudioChange?: (enabled: boolean) => void;
  onAudioMixChange?: (mix: AudioMixSettings) => void;
  onOpenPortal?: (portals: PortalDestination[]) => void;
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

function defaultCraftInv(): CraftInventory {
  return {
    berry: 2,
    mushroom: 1,
    herb: 1,
    spice_root: 0,
    dew_flask: 2,
    honey_sap: 0,
    ember_stone: 0,
    frost_crystal: 0,
    cloth_fiber: 0,
    star_shard: 0,
    trail_jam: 0,
    berry_skewer: 0,
    spiced_tea: 0,
    mint_cooler: 0,
    frost_nectar: 0,
    hearth_stew: 0,
    healing_salve: 0,
    thermal_cloak: 0,
    star_elixir: 0,
  };
}

function createFreshState(
  worldSeed = 104729,
  seedLabel = '104729',
  biomePreset: BiomePresetId = 'verdant',
): GameState {
  const biomeName = BIOME_PRESETS[biomePreset].name;
  return {
    worldSeed,
    seedLabel,
    biomePreset,
    inv: { wood: 4, glow: 2, water: 2, rune: 0, seed: 0 },
    craftInv: defaultCraftInv(),
    autoSurvivalEnabled: true,
    hasThermalCloak: false,
    starBuffUntil: 0,
    hunger: 92,
    thirst: 92,
    warmth: 88,
    completedQuests: [],
    promises: [],
    npcMemories: defaultNpcMemories(),
    buildings: [],
    discoveredSecrets: [],
    discoveredPortals: [],
    activatedLandmarks: [],
    visitedSubBiomes: ['valley_core'],
    recipesCraftedCount: 0,
    meteorsHarvested: 0,
    ruinPillars: [false, false, false],
    cavernLit: false,
    communityProjects: {
      proj_grand_arch: 0,
      proj_water_conservatory: 0,
      proj_observatory: 0,
    },
    unlockedAchievements: {},
    visitedZones: ['plaza'],
    pulsesTriggered: 0,
    purifiedBlightIds: [],
    blightPurified: 0,
    health: 100,
    collapseTimer: 0,
    gameOver: null,
    journal: [
      {
        id: 'j_init',
        text: `הגעת אל ${biomeName} (זרע ${seedLabel}). העונות מתחלפות כל ${SEASON_LENGTH_DAYS} ימים — אסוף פריטים משתלבים ושרוד עד החורף!`,
        kind: 'discovery',
        day: 1,
      },
    ],
    realPlan: null,
    realDoneCount: 0,
    simTime: 75, // Start in crisp morning light!
    day: 1,
    weather: 'breeze',
    climateEvent: 'none',
    climateEventEndsAt: 0,
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

  // Renderer Postprocessing (GPU only)
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  // Lighting & Sky
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private skyDome!: THREE.Mesh;
  private starsPoints!: THREE.Points;
  private sunDisc!: THREE.Mesh;
  private sunHalo!: THREE.Mesh;
  private moonDisc!: THREE.Mesh;
  private cloudGroup = new THREE.Group();
  private waterfallMistPoints: THREE.Points | null = null;
  private cottageWindowMats: THREE.MeshStandardMaterial[] = [];
  private waterUniforms = { uTime: { value: 0 } };
  private grassUniforms = { uTime: { value: 0 } };
  private waterMesh!: THREE.Mesh;

  // Terrain & Infinite Procedural Chunks
  private terrainGeo!: THREE.PlaneGeometry;
  private terrainMesh!: THREE.Mesh;
  private baseTerrainColors!: Float32Array;
  private terrainNeedsColorUpdate = true;
  private staticPropsGroup = new THREE.Group();
  private frontierChunks = new Map<
    string,
    {
      cx: number;
      cz: number;
      group: THREE.Group;
      terrainMesh: THREE.Mesh;
      obstacles: Array<{ x: number; z: number; r: number }>;
      resourceIds: string[];
      blightIds: string[];
      landmarkIds: string[];
      subBiome: SubBiomeId;
    }
  >();
  private lastChunkKey = '';
  private lastSeasonId: SeasonId = 'spring';
  private lastSubBiomeId: SubBiomeId = 'valley_core';
  private ambientTempC = 19;

  // Dynamic Survival, Proximity Forage, Landmarks, Sky Updrafts, Climate Meteors
  private proximityItems: Array<{ node: ProximityItemNode; mesh: THREE.Group }> = [];
  private chunkLandmarks = new Map<string, LandmarkRecord>();
  private landmarkMeshes = new Map<string, THREE.Group>();
  private skyUpdrafts: Array<{ x: number; z: number; deckY: number; chunkKey: string }> = [];
  private foxList: Array<{ group: THREE.Group; x: number; z: number; yaw: number; phase: number }> = [];
  private fallingMeteors: Array<{
    mesh: THREE.Group;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    targetX: number;
    targetZ: number;
  }> = [];
  private snowPoints!: THREE.Points;
  private nextClimateEventAt = 95;
  private nextMeteorAt = 0;
  private lastRiverDrinkAt = -20;
  private lastAutoSurviveAt = -20;
  private lastSurvivalWarnAt = -30;
  private lastUpdraftAt = -5;

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
  private playerHitCooldownAt = 0;
  private lastExposureWarnAt = -100;

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
  private npcPatrolStates = new Map<NpcId, { stopIdx: number; pauseTimer: number; activity: string }>();
  private buildingMeshes = new Map<string, THREE.Group>();
  private buildingPointLights = new Map<string, THREE.PointLight>();
  private synergyArcsGroup = new THREE.Group();
  private staticObstacles: Array<{ x: number; z: number; r: number }> = [];
  private ruinPillarMeshes: THREE.Group[] = [];
  private secretMeshes = new Map<string, THREE.Group>();
  private cavernMistMesh!: THREE.Mesh;
  private cavernLight!: THREE.PointLight;
  private projectMarkers = new Map<string, THREE.Group>();

  // Threats, Blight & Shadow Wisps
  private blightNodes = new Map<string, BlightNodeState & { group: THREE.Group }>();
  private shadowWisps: Array<{
    id: string;
    x: number;
    z: number;
    yaw: number;
    hp: number;
    maxHp: number;
    stunUntil: number;
    homeNodeId?: string;
    phase: number;
    group: THREE.Group;
  }> = [];
  private wispSpawnTimer = 0;

  // Wildlife & Particles
  private deerList: Array<{ group: THREE.Group; x: number; z: number; yaw: number; phase: number; minVitality: number }> = [];
  private birdsGroup = new THREE.Group();
  private firefliesPoints!: THREE.Points;
  private rainPoints!: THREE.Points;

  // Pulse wave & Custom Shader Overlays
  private pulseRing!: THREE.Mesh;
  private pulseDome!: THREE.Mesh;
  private pulseUniforms = {
    uOrigin: { value: new THREE.Vector3() },
    uTime: { value: -1 },
  };
  private pulseHighlights: Array<{
    id: string;
    kind: 'resource' | 'secret' | 'pillar' | 'npc' | 'project' | 'blight';
    group: THREE.Group;
    mat: THREE.ShaderMaterial;
    getPos: () => { x: number; z: number };
    isEligible: () => boolean;
    startAt: number;
    endAt: number;
  }> = [];
  private buildingHighlights: Array<{
    id: string;
    group: THREE.Group;
    mat: THREE.ShaderMaterial;
    x: number;
    z: number;
    startAt: number;
    endAt: number;
  }> = [];
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
    setActiveWorldConfig(this.state.worldSeed, this.state.biomePreset);
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
    this.lastSeasonId = this.getSeasonInfo(this.state.day).seasonId;
    this.updateFrontierChunks(true);
    this.updateTerrainVitalityColors();
    this.stepProximityItems(true);
    this.evaluateAchievements(false);
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
      const base = createFreshState(
        typeof parsed.worldSeed === 'number' ? parsed.worldSeed : 104729,
        typeof parsed.seedLabel === 'string' ? parsed.seedLabel : String(parsed.worldSeed || 104729),
        parsed.biomePreset && BIOME_PRESETS[parsed.biomePreset] ? parsed.biomePreset : 'verdant',
      );
      return {
        ...base,
        ...parsed,
        inv: { ...base.inv, ...(parsed.inv || {}) },
        craftInv: { ...base.craftInv, ...(parsed.craftInv || {}) },
        autoSurvivalEnabled:
          typeof parsed.autoSurvivalEnabled === 'boolean' ? parsed.autoSurvivalEnabled : true,
        hasThermalCloak: Boolean(parsed.hasThermalCloak),
        starBuffUntil: typeof parsed.starBuffUntil === 'number' ? parsed.starBuffUntil : 0,
        hunger: typeof parsed.hunger === 'number' ? Math.max(0, Math.min(100, parsed.hunger)) : 92,
        thirst: typeof parsed.thirst === 'number' ? Math.max(0, Math.min(100, parsed.thirst)) : 92,
        warmth: typeof parsed.warmth === 'number' ? Math.max(0, Math.min(100, parsed.warmth)) : 88,
        discoveredPortals: Array.isArray(parsed.discoveredPortals) ? parsed.discoveredPortals : [],
        activatedLandmarks: Array.isArray(parsed.activatedLandmarks) ? parsed.activatedLandmarks : [],
        visitedSubBiomes:
          Array.isArray(parsed.visitedSubBiomes) && parsed.visitedSubBiomes.length > 0
            ? (parsed.visitedSubBiomes as SubBiomeId[])
            : ['valley_core'],
        recipesCraftedCount:
          typeof parsed.recipesCraftedCount === 'number' ? parsed.recipesCraftedCount : 0,
        meteorsHarvested: typeof parsed.meteorsHarvested === 'number' ? parsed.meteorsHarvested : 0,
        climateEvent: parsed.climateEvent || 'none',
        climateEventEndsAt:
          typeof parsed.climateEventEndsAt === 'number' ? parsed.climateEventEndsAt : 0,
        npcMemories: { ...base.npcMemories, ...(parsed.npcMemories || {}) },
        communityProjects: { ...base.communityProjects, ...(parsed.communityProjects || {}) },
        unlockedAchievements:
          parsed.unlockedAchievements && typeof parsed.unlockedAchievements === 'object'
            ? parsed.unlockedAchievements
            : {},
        visitedZones:
          Array.isArray(parsed.visitedZones) && parsed.visitedZones.length > 0
            ? (parsed.visitedZones as ZoneId[])
            : ['plaza'],
        pulsesTriggered: typeof parsed.pulsesTriggered === 'number' ? parsed.pulsesTriggered : 0,
        purifiedBlightIds: Array.isArray(parsed.purifiedBlightIds) ? parsed.purifiedBlightIds : [],
        blightPurified: typeof parsed.blightPurified === 'number' ? parsed.blightPurified : 0,
        health: typeof parsed.health === 'number' ? Math.max(0, Math.min(100, parsed.health)) : 100,
        collapseTimer: typeof parsed.collapseTimer === 'number' ? parsed.collapseTimer : 0,
        gameOver: parsed.gameOver ?? null,
        buildings: Array.isArray(parsed.buildings) ? parsed.buildings : [],
        discoveredSecrets: Array.isArray(parsed.discoveredSecrets) ? parsed.discoveredSecrets : [],
        ruinPillars:
          Array.isArray(parsed.ruinPillars) && parsed.ruinPillars.length === 3
            ? parsed.ruinPillars
            : [false, false, false],
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
    this.scene.add(this.staticPropsGroup);
    this.scene.add(this.cloudGroup);

    if (!this.isSoftwareGl) {
      const composer = new EffectComposer(this.renderer);
      composer.setSize(w, h);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.34, 0.45, 0.85);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      this.composer = composer;
      this.bloomPass = bloomPass;
    }

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

    // Resonance pulse custom shader ground wavefront & volumetric dome
    this.pulseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 1.0, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uAge: { value: 0 },
          uColorA: { value: new THREE.Color(0x7ef2c9) },
          uColorB: { value: new THREE.Color(0xc9a6ff) },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uAge;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            float r = length(vPos.xy);
            float rim = smoothstep(0.45, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r));
            float inner = exp(-pow((r - 0.68) * 9.0, 2.0)) * 0.7;
            float fade = 1.0 - smoothstep(1.2, 2.3, uAge);
            vec3 col = mix(uColorA, uColorB, rim);
            gl_FragColor = vec4(col, (rim + inner) * fade * 0.85);
          }
        `,
      }),
    );
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.visible = false;
    this.scene.add(this.pulseRing);

    this.pulseDome = new THREE.Mesh(
      new THREE.SphereGeometry(1, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uAge: { value: 0 },
          uColor: { value: new THREE.Color(0xc9a6ff) },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          varying float vHeight;
          void main() {
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vViewDir = normalize(-mvPos.xyz);
            vHeight = position.y;
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform float uAge;
          uniform vec3 uColor;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          varying float vHeight;
          void main() {
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.2);
            float scan = 0.65 + 0.35 * sin(vHeight * 24.0 - uAge * 10.0);
            float fade = (1.0 - smoothstep(0.7, 2.2, uAge)) * smoothstep(0.0, 0.14, vHeight);
            gl_FragColor = vec4(uColor, fresnel * scan * fade * 0.55);
          }
        `,
      }),
    );
    this.pulseDome.visible = false;
    this.scene.add(this.pulseDome);

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

  private applyPulseShaderToTerrainMat(mat: THREE.MeshStandardMaterial): void {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPulseOrigin = this.pulseUniforms.uOrigin;
      shader.uniforms.uPulseTime = this.pulseUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vPulseWorldPos;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vPulseWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uPulseOrigin;
         uniform float uPulseTime;
         varying vec3 vPulseWorldPos;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         if (uPulseTime >= 0.0 && uPulseTime < 2.4) {
           float pDist = distance(vPulseWorldPos.xz, uPulseOrigin.xz);
           float waveR = uPulseTime * 24.0;
           float ring1 = exp(-pow((pDist - waveR) * 0.65, 2.0));
           float ring2 = exp(-pow((pDist - (waveR - 6.0)) * 0.9, 2.0)) * 0.55;
           float fade = (1.0 - smoothstep(1.3, 2.4, uPulseTime)) * (1.0 - smoothstep(38.0, 50.0, pDist));
           float grid = smoothstep(0.88, 1.0, abs(sin(vPulseWorldPos.x * 0.85))) + smoothstep(0.88, 1.0, abs(sin(vPulseWorldPos.z * 0.85)));
           float topo = smoothstep(0.91, 1.0, abs(sin(vPulseWorldPos.y * 3.1)));
           float wake = smoothstep(waveR - 14.0, waveR, pDist) * (1.0 - smoothstep(waveR, waveR + 1.0, pDist));
           vec3 pulseCol = mix(vec3(0.49, 0.95, 0.79), vec3(0.79, 0.65, 1.0), 0.55);
           totalEmissiveRadiance += pulseCol * (ring1 * 1.45 + ring2 * 0.75 + wake * (grid * 0.16 + topo * 0.22)) * fade;
         }`,
      );
    };
  }

  private getSeasonInfo(day = this.state.day): {
    seasonId: SeasonId;
    dayInSeason: number;
    year: number;
  } {
    const d0 = Math.max(0, day - 1);
    const seasonIndex = Math.floor(d0 / SEASON_LENGTH_DAYS) % SEASON_ORDER.length;
    const seasonId = SEASON_ORDER[seasonIndex];
    const dayInSeason = (d0 % SEASON_LENGTH_DAYS) + 1;
    const year = 1 + Math.floor(d0 / (SEASON_LENGTH_DAYS * SEASON_ORDER.length));
    return { seasonId, dayInSeason, year };
  }

  private sampleBaseTerrainColor(x: number, z: number, y: number, out: THREE.Color): void {
    const biome = BIOME_PRESETS[this.state.biomePreset];
    const radial = Math.hypot(x, z);
    const subBiome = detectSubBiome(x, z);
    const distRiver = Math.abs(x - riverCenterX(z)) - riverHalfWidth(z);
    const onTerrace = Math.hypot(x + 62, z - 54) < 30;
    const inRuins = Math.hypot(x + 66, z + 62) < 20;
    const inCavern = Math.hypot(x - 72, z + 68) < 22;
    const inPlaza = Math.hypot(x + 15, z) < 15;
    const slope = terrainSlopeAt(x, z);

    if (y < WATER_LEVEL + 0.12) {
      out.setHex(0x4b635a);
    } else if (distRiver < 2.3) {
      out.setHex(0x8c876c);
    } else if (inCavern) {
      out.setHex(0x46515b);
    } else if (inRuins) {
      out.setHex(0x737e77);
    } else if (inPlaza) {
      out.setHex(0x8b8669);
    } else if (onTerrace && this.state.biomePreset === 'verdant') {
      out.setHex(0xb99162);
    } else if (x > 26 && radial < 120) {
      out.setHex(biome.forestHex);
    } else {
      out.setHex(biome.grassHex);
    }

    // Smoothly blend Frontier sub-biome soil/flora palette
    if (radial > 106 && subBiome !== 'valley_core' && y >= WATER_LEVEL + 0.12) {
      const subMix = Math.min(1, (radial - 106) / 30);
      _colC.setHex(SUB_BIOMES[subBiome].groundHex);
      out.lerp(_colC, subMix * 0.85);
    }

    // Blend steep rocky cliffs & high ridges into weathered stone strata
    if (slope > 0.45 || y > 5.5) {
      const rockMix = Math.min(0.88, Math.max((slope - 0.45) * 1.15, (y - 5.5) * 0.12));
      _colC.setHex(subBiome === 'obsidian_crags' ? 0x2f2c38 : biome.rockHex);
      out.lerp(_colC, rockMix);
    }

    const shade = 0.92 + Math.min(0.18, Math.max(-0.1, y * 0.025));
    out.multiplyScalar(shade);
  }

  private buildTerrain(): void {
    const size = 240; // Exact 2.0m vertex grid matching CHUNK_SIZE=80 / 40 segs for zero-seam tiling
    const segs = 120;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = groundHeightAt(x, z);
      pos.setY(i, y);
      this.sampleBaseTerrainColor(x, z, y, _colA);
      colors[i * 3] = _colA.r;
      colors[i * 3 + 1] = _colA.g;
      colors[i * 3 + 2] = _colA.b;
    }

    this.baseTerrainColors = new Float32Array(colors);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.tex.terrainDetail,
      normalMap: this.tex.terrainNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.91,
      metalness: 0.02,
    });
    this.applyPulseShaderToTerrainMat(mat);

    this.terrainGeo = geo;
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  private applySeasonTintToColor(
    x: number,
    z: number,
    y: number,
    baseR: number,
    baseG: number,
    baseB: number,
    seasonId: SeasonId,
    blizzardActive: boolean,
  ): [number, number, number] {
    if (y <= WATER_LEVEL + 0.1) return [baseR, baseG, baseB];
    const season = SEASONS[seasonId];
    _colA.setRGB(baseR, baseG, baseB);

    if (seasonId === 'autumn') {
      _colB.setHex(0xb87b40);
      _colA.lerp(_colB, 0.34);
    } else if (seasonId === 'summer') {
      _colB.setHex(0x7ca649);
      _colA.lerp(_colB, 0.18);
    } else if (seasonId === 'spring') {
      _colB.setHex(0x52ad68);
      _colA.lerp(_colB, 0.14);
    }

    const snowFactor = Math.min(1, season.snowLevel + (blizzardActive ? 0.25 : 0));
    if (snowFactor > 0.02) {
      const slope = terrainSlopeAt(x, z);
      const flatSnow = Math.max(0, 1 - slope * 0.9);
      const snowMix = Math.min(0.88, snowFactor * (0.45 + flatSnow * 0.55));
      _colB.setHex(0xddecf5);
      _colA.lerp(_colB, snowMix);
    }

    return [_colA.r, _colA.g, _colA.b];
  }

  private updateTerrainVitalityColors(): void {
    const pos = this.terrainGeo.attributes.position;
    const colAttr = this.terrainGeo.attributes.color as THREE.BufferAttribute;
    const arr = colAttr.array as Float32Array;
    const irrigators = this.state.buildings.filter((b) => b.type === 'irrigator');
    const activeBlights = Array.from(this.blightNodes.values()).filter((bn) => !bn.purified);
    const { seasonId } = this.getSeasonInfo();
    const blizzardActive = this.state.climateEvent === 'blizzard';

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);
      let [r, g, b] = this.applySeasonTintToColor(
        x,
        z,
        y,
        this.baseTerrainColors[i * 3],
        this.baseTerrainColors[i * 3 + 1],
        this.baseTerrainColors[i * 3 + 2],
        seasonId,
        blizzardActive,
      );

      if (irrigators.length > 0 && y > WATER_LEVEL + 0.1) {
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

      if (activeBlights.length > 0 && y > WATER_LEVEL + 0.05) {
        let maxCorrupt = 0;
        for (const bn of activeBlights) {
          const d = Math.hypot(x - bn.x, z - bn.z);
          if (d < bn.radius * 1.55) {
            const k = 1 - d / (bn.radius * 1.55);
            if (k > maxCorrupt) maxCorrupt = k;
          }
        }
        if (maxCorrupt > 0.02) {
          _colA.setRGB(r, g, b);
          _colB.setHex(0x2d1c3d);
          _colA.lerp(_colB, Math.min(0.85, maxCorrupt * 0.95));
          r = _colA.r;
          g = _colA.g;
          b = _colA.b;
        }
      }

      arr[i * 3] = r;
      arr[i * 3 + 1] = g;
      arr[i * 3 + 2] = b;
    }
    colAttr.needsUpdate = true;

    // Also re-tint loaded frontier chunks smoothly for seasonal shifts
    for (const chunk of this.frontierChunks.values()) {
      const geo = chunk.terrainMesh.geometry;
      const cPos = geo.attributes.position;
      const cCol = geo.attributes.color as THREE.BufferAttribute;
      const baseArr = geo.userData.baseColors as Float32Array | undefined;
      if (!cCol || !baseArr) continue;
      const cArr = cCol.array as Float32Array;
      const cx0 = chunk.cx * CHUNK_SIZE;
      const cz0 = chunk.cz * CHUNK_SIZE;
      for (let i = 0; i < cPos.count; i++) {
        const wx = cx0 + cPos.getX(i);
        const wz = cz0 + cPos.getZ(i);
        const wy = cPos.getY(i);
        const [r, g, b] = this.applySeasonTintToColor(
          wx,
          wz,
          wy,
          baseArr[i * 3],
          baseArr[i * 3 + 1],
          baseArr[i * 3 + 2],
          seasonId,
          blizzardActive,
        );
        cArr[i * 3] = r;
        cArr[i * 3 + 1] = g;
        cArr[i * 3 + 2] = b;
      }
      cCol.needsUpdate = true;
    }

    this.terrainNeedsColorUpdate = false;
  }

  private buildWaterAndWaterfall(): void {
    // Boundless player-centered reflective water surface using world-space waves & shoreline froth
    const waterGeo = new THREE.PlaneGeometry(360, 360, 88, 88);
    waterGeo.rotateX(-Math.PI / 2);

    const biome = BIOME_PRESETS[this.state.biomePreset];
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: biome.waterHex,
      roughness: 0.12,
      metalness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
      transparent: true,
      opacity: 0.85,
    });

    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.waterUniforms.uTime;
      shader.uniforms.uPulseOrigin = this.pulseUniforms.uOrigin;
      shader.uniforms.uPulseTime = this.pulseUniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vWPos;`,
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 worldTemp = modelMatrix * vec4(transformed, 1.0);
         transformed.y += sin(worldTemp.x * 0.55 + uTime * 2.1) * 0.048
                        + cos(worldTemp.z * 0.42 - uTime * 2.8) * 0.058
                        + sin((worldTemp.x + worldTemp.z) * 0.9 + uTime * 3.4) * 0.022;
         vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform vec3 uPulseOrigin;
         uniform float uPulseTime;
         varying vec3 vWPos;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float ripple1 = sin(vWPos.z * 1.25 - uTime * 3.2 + sin(vWPos.x * 0.85) * 2.1);
         float ripple2 = cos(vWPos.x * 1.6 + vWPos.z * 0.7 - uTime * 2.4);
         float caustic = smoothstep(0.45, 1.0, ripple1 * 0.6 + ripple2 * 0.4);
         diffuseColor.rgb += vec3(0.08, 0.17, 0.2) * caustic;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         if (uPulseTime >= 0.0 && uPulseTime < 2.4) {
           float pDist = distance(vWPos.xz, uPulseOrigin.xz);
           float waveR = uPulseTime * 24.0;
           float ring = exp(-pow((pDist - waveR) * 0.72, 2.0));
           float fade = (1.0 - smoothstep(1.3, 2.4, uPulseTime)) * (1.0 - smoothstep(38.0, 50.0, pDist));
           totalEmissiveRadiance += vec3(0.55, 0.92, 1.0) * ring * fade * 1.35;
         }`,
      );
    };

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = WATER_LEVEL;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

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

    // Waterfall Splash Mist Particle Plume
    const mistCount = 64;
    const mistPos = new Float32Array(mistCount * 3);
    for (let i = 0; i < mistCount; i++) {
      mistPos[i * 3] = 71.5 + (Math.random() - 0.5) * 4.5;
      mistPos[i * 3 + 1] = WATER_LEVEL + Math.random() * 2.8;
      mistPos[i * 3 + 2] = 45.2 + (Math.random() - 0.5) * 4.5;
    }
    const mistGeo = new THREE.BufferGeometry();
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    this.waterfallMistPoints = new THREE.Points(
      mistGeo,
      new THREE.PointsMaterial({
        map: this.tex.cloudPuff,
        color: 0xdff8ff,
        size: 3.2,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    );
    this.scene.add(this.waterfallMistPoints);
  }

  private buildSkyAndAtmosphere(): void {
    const skyGeo = new THREE.SphereGeometry(320, 24, 16);
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

    // Procedural Drifting 3D Sky Cloud Clusters
    const cloudMat = new THREE.SpriteMaterial({
      map: this.tex.cloudPuff,
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      fog: false,
    });
    const rng = createSeededRng(this.state.worldSeed + 41);
    for (let i = 0; i < 16; i++) {
      const cluster = new THREE.Group();
      const angle = (i / 16) * TAU + rng() * 0.3;
      const dist = 75 + rng() * 145;
      cluster.position.set(Math.cos(angle) * dist, 52 + rng() * 26, Math.sin(angle) * dist);
      cluster.userData.baseOffset = cluster.position.clone();
      cluster.userData.speed = 1.4 + rng() * 1.6;
      const puffs = 3 + Math.floor(rng() * 3);
      for (let p = 0; p < puffs; p++) {
        const sp = new THREE.Sprite(cloudMat);
        sp.position.set((p - 1.5) * 6.5, (rng() - 0.5) * 2.2, (rng() - 0.5) * 4.5);
        const sx = 18 + rng() * 14;
        sp.scale.set(sx, sx * 0.55, 1);
        cluster.add(sp);
      }
      this.cloudGroup.add(cluster);
    }

    // Starfield for dusk & night
    const starCount = 520;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * TAU;
      const phi = Math.random() * Math.PI * 0.44;
      const r = 270;
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
        size: 1.6,
        transparent: true,
        opacity: 0,
        fog: false,
      }),
    );
    this.scene.add(this.starsPoints);
  }

  private buildStaticWorld(): void {
    this.staticObstacles = [];
    this.cottageWindowMats = [];
    this.ruinPillarMeshes = [];
    this.pulseHighlights = this.pulseHighlights.filter((h) => h.kind !== 'pillar');

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
      this.staticPropsGroup.add(mesh);
      this.staticObstacles.push({ x: c.x, z: c.z, r: 4.1 * c.scale });
    });

    // Central Plaza Compass Medallion
    const compassStone = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.9, 0.22, 16),
      new THREE.MeshStandardMaterial({
        map: this.tex.stone,
        normalMap: this.tex.stoneNormal,
        color: 0x8e9994,
        roughness: 0.85,
      }),
    );
    compassStone.position.set(-15, groundHeightAt(-15, 0) + 0.05, 0);
    compassStone.receiveShadow = true;
    this.staticPropsGroup.add(compassStone);

    // 2. Echo Cavern (Northeast: 72, -68) — overarching basalt cliff formation + stalactites + mist
    const rockMat = new THREE.MeshStandardMaterial({
      map: this.tex.stone,
      normalMap: this.tex.stoneNormal,
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
      this.staticPropsGroup.add(m);
      this.staticObstacles.push({ x: rx, z: rz, r: rad * 0.72 });
    });
    // Overhanging cavern roof canopy
    const caveRoof = new THREE.Mesh(new THREE.DodecahedronGeometry(9.5, 1), rockMat);
    caveRoof.position.set(73, 8.2, -71);
    caveRoof.scale.set(1.45, 0.48, 1.35);
    caveRoof.castShadow = true;
    this.staticPropsGroup.add(caveRoof);

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
      this.staticPropsGroup.add(shard);
    }

    this.cavernLight = new THREE.PointLight(0x88e9ff, this.state.cavernLit ? 3.5 : 0.4, 28, 1.5);
    this.cavernLight.position.set(72, 4.5, -68);
    this.staticPropsGroup.add(this.cavernLight);

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
    this.staticPropsGroup.add(this.cavernMistMesh);

    // 3. Sunken Ruins (Northwest: -66, -62) — 3 Interactive Rune Pillars + Sundial Altar
    const altar = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.8, 0.7, 8),
      new THREE.MeshStandardMaterial({ map: this.tex.stone, normalMap: this.tex.stoneNormal, color: 0x778380, roughness: 0.88 }),
    );
    altar.position.set(-66, groundHeightAt(-66, -62) + 0.35, -62);
    altar.receiveShadow = true;
    this.staticPropsGroup.add(altar);

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
      this.staticPropsGroup.add(pillar);
      this.staticObstacles.push({ x: px, z: pz, r: 1.4 });
      this.registerPulseHighlight(
        `pillar_${idx}`,
        'pillar',
        pillar,
        0xc9a6ff,
        1.5,
        6.2,
        () => ({ x: px, z: pz }),
        () => !this.state.ruinPillars[idx],
      );
    });

    // 4. Trees across valley (seeded per world, avoiding paths, water, plazas, and landmarks)
    const trnd = createSeededRng(this.state.worldSeed + 918273);
    const biome = BIOME_PRESETS[this.state.biomePreset];
    let placedTrees = 0;
    const maxTrees = this.state.biomePreset === 'arid_winds' ? 56 : 96;
    for (let i = 0; i < 420 && placedTrees < maxTrees; i++) {
      const tx = (trnd() - 0.5) * 205;
      const tz = (trnd() - 0.5) * 205;
      const y = groundHeightAt(tx, tz);
      if (y < WATER_LEVEL + 0.7) continue;
      if (terrainSlopeAt(tx, tz) > 0.48) continue;
      if (Math.hypot(tx + 15, tz) < 22) continue;
      if (Math.hypot(tx + 66, tz + 62) < 18) continue;
      if (Math.hypot(tx - 72, tz + 68) < 22) continue;
      if (Math.hypot(tx + 62, tz - 54) < 25) continue;
      if (Math.hypot(tx - 56, tz - 50) < 9) continue;
      if (Math.abs(tx - riverCenterX(tz)) < riverHalfWidth(tz) + 5) continue;
      if (this.staticObstacles.some((o) => Math.hypot(tx - o.x, tz - o.z) < o.r + 3.2)) continue;
      if (NPCS_BASE.some((n) => Math.hypot(tx - n.homeX, tz - n.homeZ) < 6.5)) continue;

      const kind =
        tx > 28 || this.state.biomePreset === 'mystic_night'
          ? trnd() > 0.4
            ? 'glowwillow'
            : 'pine'
          : trnd() > 0.5
            ? 'oak'
            : 'pine';
      const scale = 0.85 + trnd() * 0.58;
      const tree = createTreeGroup(kind, this.tex, scale);
      tree.position.set(tx, y - 0.1, tz);
      tree.rotation.y = trnd() * TAU;
      this.staticPropsGroup.add(tree);
      this.staticObstacles.push({ x: tx, z: tz, r: 0.9 * scale });
      placedTrees++;
    }

    // Rock boulders along central hillsides for 3D depth
    for (let i = 0; i < 24; i++) {
      const bx = (trnd() - 0.5) * 205;
      const bz = (trnd() - 0.5) * 205;
      const by = groundHeightAt(bx, bz);
      if (by < WATER_LEVEL + 0.4) continue;
      if (Math.hypot(bx + 15, bz) < 20) continue;
      if (Math.abs(bx - riverCenterX(bz)) < riverHalfWidth(bz) + 4) continue;
      if (this.staticObstacles.some((o) => Math.hypot(bx - o.x, bz - o.z) < o.r + 2.8)) continue;
      const boulder = createBoulderClusterGroup(this.tex, biome.rockHex);
      boulder.position.set(bx, by - 0.15, bz);
      boulder.rotation.y = trnd() * TAU;
      boulder.scale.setScalar(0.8 + trnd() * 0.7);
      this.staticPropsGroup.add(boulder);
      this.staticObstacles.push({ x: bx, z: bz, r: 1.6 });
    }

    // 5. Instanced Swaying Grass Blades (1,450 blades)
    const grassCount = 1450;
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
    for (let i = 0; i < 3600 && gCount < grassCount; i++) {
      const gx = (trnd() - 0.5) * 205;
      const gz = (trnd() - 0.5) * 205;
      const gy = groundHeightAt(gx, gz);
      if (gy < WATER_LEVEL + 0.35) continue;
      if (Math.hypot(gx + 62, gz - 54) < 24 && this.state.biomePreset === 'verdant') continue;
      if (Math.hypot(gx - 72, gz + 68) < 14) continue;
      _dummy.position.set(gx, gy - 0.05, gz);
      _dummy.rotation.set(0, trnd() * TAU, 0);
      const s = 0.75 + trnd() * 0.8;
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      grassMesh.setMatrixAt(gCount, _dummy.matrix);
      _colA.setHex(gx > 26 ? biome.forestHex : biome.grassHex).offsetHSL(0, 0, 0.06 + (trnd() - 0.5) * 0.09);
      grassMesh.setColorAt(gCount, _colA);
      gCount++;
    }
    grassMesh.count = gCount;
    grassMesh.instanceMatrix.needsUpdate = true;
    if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
    grassMesh.computeBoundingSphere();
    this.staticPropsGroup.add(grassMesh);
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
      this.npcPatrolStates.set(npc.id, {
        stopIdx: 0,
        pauseTimer: 2.0,
        activity: NPC_PATROL_ROUTES[npc.id][0]?.activity || 'מסייר בעמק',
      });
      this.registerPulseHighlight(
        `npc_${npc.id}`,
        'npc',
        rig.group,
        0xf5b971,
        0.9,
        2.4,
        () => {
          const entry = this.npcRigs.get(npc.id);
          return { x: entry?.x ?? npc.homeX, z: entry?.z ?? npc.homeZ };
        },
        () => true,
      );
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
      this.registerPulseHighlight(
        node.id,
        'resource',
        mesh,
        0x7ef2c9,
        0.95,
        2.6,
        () => ({ x, z }),
        () => node.active,
      );
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
      this.registerPulseHighlight(
        sec.id,
        'secret',
        grp,
        0xffcb77,
        1.5,
        5.8,
        () => ({ x: sec.x, z: sec.z }),
        () => !this.state.discoveredSecrets.includes(sec.id),
      );
    }

    // Central Valley Blight Nests (create tense survival stakes right outside safe Plaza)
    for (const spot of VALLEY_BLIGHT_SPOTS) {
      this.spawnBlightNode(spot.id, spot.x, spot.z, spot.hp, spot.radius);
    }
  }

  private spawnBlightNode(
    id: string,
    x: number,
    z: number,
    maxHp: number,
    radius: number,
    chunkKey?: string,
  ): void {
    if (this.blightNodes.has(id)) return;
    const purified = this.state.purifiedBlightIds.includes(id);
    const grp = createBlightNestGroup(this.tex, purified);
    grp.position.set(x, groundHeightAt(x, z), z);
    this.scene.add(grp);

    const node: BlightNodeState & { group: THREE.Group } = {
      id,
      x,
      z,
      hp: purified ? 0 : maxHp,
      maxHp,
      purified,
      radius,
      chunkKey,
      group: grp,
    };
    this.blightNodes.set(id, node);
    this.registerPulseHighlight(
      `blight_${id}`,
      'blight',
      grp,
      0xff5c9d,
      2.2,
      4.8,
      () => ({ x, z }),
      () => !node.purified,
    );
  }

  private disposeObjectTree(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => mat.dispose());
      }
    });
  }

  private updateFrontierChunks(force = false): void {
    const pcx = Math.round(this.playerX / CHUNK_SIZE);
    const pcz = Math.round(this.playerZ / CHUNK_SIZE);
    const key = `${pcx},${pcz}`;
    if (!force && key === this.lastChunkKey) return;
    this.lastChunkKey = key;

    const keepRadius = 2; // 5x5 chunk grid = 400m x 400m live procedural world around player
    for (const [k, chunk] of this.frontierChunks.entries()) {
      if (Math.abs(chunk.cx - pcx) > keepRadius || Math.abs(chunk.cz - pcz) > keepRadius) {
        this.scene.remove(chunk.group);
        this.disposeObjectTree(chunk.group);
        for (const rid of chunk.resourceIds) {
          const rm = this.resourceMeshes.get(rid);
          if (rm) {
            this.scene.remove(rm);
            this.disposeObjectTree(rm);
            this.resourceMeshes.delete(rid);
          }
          this.resourceNodes = this.resourceNodes.filter((n) => n.id !== rid);
          this.pulseHighlights = this.pulseHighlights.filter((h) => h.id !== rid);
        }
        for (const bid of chunk.blightIds) {
          const bn = this.blightNodes.get(bid);
          if (bn) {
            this.scene.remove(bn.group);
            this.disposeObjectTree(bn.group);
            this.blightNodes.delete(bid);
            this.pulseHighlights = this.pulseHighlights.filter((h) => h.id !== `blight_${bid}`);
          }
        }
        for (const lid of chunk.landmarkIds) {
          const lm = this.landmarkMeshes.get(lid);
          if (lm) {
            this.scene.remove(lm);
            this.disposeObjectTree(lm);
            this.landmarkMeshes.delete(lid);
          }
          this.chunkLandmarks.delete(lid);
          this.pulseHighlights = this.pulseHighlights.filter((h) => h.id !== lid);
        }
        this.skyUpdrafts = this.skyUpdrafts.filter((u) => u.chunkKey !== k);
        this.frontierChunks.delete(k);
      }
    }

    let builtAny = false;
    for (let cx = pcx - keepRadius; cx <= pcx + keepRadius; cx++) {
      for (let cz = pcz - keepRadius; cz <= pcz + keepRadius; cz++) {
        // Inner hero [-120..120] covers cx in [-1, 1] && cz in [-1, 1]
        if (Math.abs(cx) <= 1 && Math.abs(cz) <= 1) continue;
        const cKey = `${cx}_${cz}`;
        if (!this.frontierChunks.has(cKey)) {
          this.buildFrontierChunk(cx, cz, cKey);
          builtAny = true;
        }
      }
    }
    if (builtAny) {
      this.terrainNeedsColorUpdate = true;
    }
  }

  private buildFrontierChunk(cx: number, cz: number, cKey: string): void {
    const centerX = cx * CHUNK_SIZE;
    const centerZ = cz * CHUNK_SIZE;
    const group = new THREE.Group();
    const biome = BIOME_PRESETS[this.state.biomePreset];
    const subBiome = detectSubBiome(centerX, centerZ);
    const { seasonId } = this.getSeasonInfo();
    const blizzardActive = this.state.climateEvent === 'blizzard';

    // Exact 2.0m grid (80 / 40) matching central terrain edge seamlessly
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 40, 40);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const baseColors = new Float32Array(pos.count * 3);
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = centerX + lx;
      const wz = centerZ + lz;
      const wy = groundHeightAt(wx, wz);
      pos.setY(i, wy);
      this.sampleBaseTerrainColor(wx, wz, wy, _colA);
      baseColors[i * 3] = _colA.r;
      baseColors[i * 3 + 1] = _colA.g;
      baseColors[i * 3 + 2] = _colA.b;
      const [tr, tg, tb] = this.applySeasonTintToColor(
        wx,
        wz,
        wy,
        _colA.r,
        _colA.g,
        _colA.b,
        seasonId,
        blizzardActive,
      );
      colors[i * 3] = tr;
      colors[i * 3 + 1] = tg;
      colors[i * 3 + 2] = tb;
    }
    geo.userData.baseColors = baseColors;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.tex.terrainDetail,
      normalMap: this.tex.terrainNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.91,
      metalness: 0.02,
    });
    this.applyPulseShaderToTerrainMat(mat);

    const chunkTerrain = new THREE.Mesh(geo, mat);
    chunkTerrain.position.set(centerX, 0, centerZ);
    chunkTerrain.receiveShadow = true;
    group.add(chunkTerrain);

    const seed = chunkSeedHash(this.state.worldSeed, cx, cz);
    const rng = createSeededRng(seed);
    const obstacles: Array<{ x: number; z: number; r: number }> = [];
    const resourceIds: string[] = [];
    const blightIds: string[] = [];
    const landmarkIds: string[] = [];

    // 1. Sub-biome-specific flora & geological formations
    if (subBiome === 'crystal_canyon') {
      for (let i = 0; i < 6; i++) {
        const wx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wy = groundHeightAt(wx, wz);
        if (wy < WATER_LEVEL + 0.35) continue;
        const spire = createCrystalSpireCluster(i % 2 === 0 ? 0x88e9ff : 0xc9a6ff);
        spire.position.set(wx, wy - 0.1, wz);
        spire.rotation.y = rng() * TAU;
        group.add(spire);
        obstacles.push({ x: wx, z: wz, r: 1.5 });
      }
    } else if (subBiome === 'mushroom_grove') {
      for (let i = 0; i < 7; i++) {
        const wx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wy = groundHeightAt(wx, wz);
        if (wy < WATER_LEVEL + 0.4) continue;
        const capHex = i % 3 === 0 ? 0xf29eb9 : i % 3 === 1 ? 0x7ef2c9 : 0xb4a3ff;
        const mush = createGiantMushroomGroup(capHex);
        const sc = 0.75 + rng() * 0.7;
        mush.position.set(wx, wy - 0.1, wz);
        mush.scale.setScalar(sc);
        group.add(mush);
        obstacles.push({ x: wx, z: wz, r: 0.7 * sc });
      }
    } else if (subBiome === 'obsidian_crags') {
      for (let i = 0; i < 6; i++) {
        const wx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 12);
        const wy = groundHeightAt(wx, wz);
        if (wy < WATER_LEVEL + 0.3) continue;
        const crag = createCrystalSpireCluster(0xff6e4a);
        crag.position.set(wx, wy - 0.15, wz);
        crag.scale.set(1.15, 0.85 + rng() * 0.6, 1.15);
        group.add(crag);
        obstacles.push({ x: wx, z: wz, r: 1.5 });
      }
    }

    // 2. Trees & Rock Boulders
    const treeBudget =
      subBiome === 'obsidian_crags' || subBiome === 'crystal_canyon'
        ? 4
        : subBiome === 'bloom_meadow'
          ? 12
          : this.state.biomePreset === 'arid_winds'
            ? 5
            : 9;
    for (let i = 0; i < treeBudget; i++) {
      const wx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 8);
      const wz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 8);
      const wy = groundHeightAt(wx, wz);
      if (wy < WATER_LEVEL + 0.5 || terrainSlopeAt(wx, wz) > 0.6) continue;
      if (Math.abs(wx - riverCenterX(wz)) < riverHalfWidth(wz) + 3) continue;
      const kind =
        subBiome === 'mushroom_grove' || this.state.biomePreset === 'mystic_night'
          ? rng() > 0.4
            ? 'glowwillow'
            : 'pine'
          : subBiome === 'bloom_meadow'
            ? 'oak'
            : rng() > 0.5
              ? 'pine'
              : 'oak';
      const scale = 0.85 + rng() * 0.65;
      const tree = createTreeGroup(kind, this.tex, scale);
      tree.position.set(wx, wy - 0.1, wz);
      tree.rotation.y = rng() * TAU;
      group.add(tree);
      obstacles.push({ x: wx, z: wz, r: 0.9 * scale });
    }

    for (let i = 0; i < 4; i++) {
      const wx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 10);
      const wz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 10);
      const wy = groundHeightAt(wx, wz);
      if (wy < WATER_LEVEL + 0.35) continue;
      const boulder = createBoulderClusterGroup(
        this.tex,
        subBiome === 'obsidian_crags' ? 0x3a3742 : biome.rockHex,
      );
      boulder.position.set(wx, wy - 0.15, wz);
      boulder.rotation.y = rng() * TAU;
      boulder.scale.setScalar(0.85 + rng() * 0.75);
      group.add(boulder);
      obstacles.push({ x: wx, z: wz, r: 1.6 });
    }

    // 3. Thermal Spring Geothermal Pool
    const spring = getThermalSpringForChunk(cx, cz);
    if (spring) {
      const spY = groundHeightAt(spring.x, spring.z);
      if (spY > WATER_LEVEL + 0.25) {
        const spMesh = createThermalSpringGroup(this.tex, spring.radius);
        spMesh.position.set(spring.x, spY + 0.04, spring.z);
        group.add(spMesh);
      }
    }

    // 4. Floating Sky Isle + Updraft Wind Vortex + Elevated Treasure
    const skyIsle = getSkyIsleForChunk(cx, cz);
    if (skyIsle) {
      const isleMesh = createFloatingSkyIsleGroup(this.tex, skyIsle.radius);
      isleMesh.position.set(skyIsle.x, skyIsle.deckY, skyIsle.z);
      group.add(isleMesh);

      const upY = groundHeightAt(skyIsle.updraftX, skyIsle.updraftZ);
      const vortex = createUpdraftVortexGroup();
      vortex.position.set(skyIsle.updraftX, upY, skyIsle.updraftZ);
      group.add(vortex);

      this.skyUpdrafts.push({
        x: skyIsle.updraftX,
        z: skyIsle.updraftZ,
        deckY: skyIsle.deckY,
        chunkKey: cKey,
      });

      // Spawn a rare star_shard / frost_crystal right on top of the sky isle
      const rareId = `sky_item_${cKey}`;
      if (!this.proximityItems.some((p) => p.node.id === rareId)) {
        const itemId: CraftItemId = rng() > 0.4 ? 'star_shard' : 'frost_crystal';
        const mesh = createForageItemMesh(itemId);
        mesh.position.set(skyIsle.x, skyIsle.deckY, skyIsle.z);
        this.scene.add(mesh);
        this.proximityItems.push({
          node: { id: rareId, itemId, x: skyIsle.x, y: skyIsle.deckY, z: skyIsle.z, isMeteorDrop: true },
          mesh,
        });
      }
    }

    // 5. Random Ancient Landmark (Ancient Temple, Stone Circle, or Fast-Travel Portal)
    const landmarkRoll = rng();
    if (landmarkRoll < 0.42) {
      const lx = centerX + (rng() - 0.5) * 32;
      const lz = centerZ + (rng() - 0.5) * 32;
      const ly = groundHeightAt(lx, lz);
      if (ly > WATER_LEVEL + 0.45 && terrainSlopeAt(lx, lz) < 0.6) {
        const lid = `lm_${cKey}`;
        const kind: LandmarkKind =
          landmarkRoll < 0.14 ? 'portal' : landmarkRoll < 0.28 ? 'ancient_temple' : 'stone_circle';
        const activated =
          kind === 'portal'
            ? this.state.discoveredPortals.some((p) => p.id === lid)
            : this.state.activatedLandmarks.includes(lid);
        const lmName =
          kind === 'portal'
            ? `שער ${SUB_BIOMES[subBiome].name}`
            : kind === 'ancient_temple'
              ? `מקדש ${SUB_BIOMES[subBiome].name}`
              : `מעגל אבנים עתיק`;

        const lmMesh =
          kind === 'portal'
            ? createTeleportPortalGroup(this.tex, activated)
            : kind === 'ancient_temple'
              ? createAncientTempleGroup(this.tex, activated)
              : createStoneCircleGroup(this.tex, activated);
        lmMesh.position.set(lx, ly, lz);
        lmMesh.rotation.y = rng() * TAU;
        this.scene.add(lmMesh);

        const rec: LandmarkRecord = {
          id: lid,
          kind,
          name: lmName,
          subBiome,
          x: lx,
          z: lz,
          activated,
          chunkKey: cKey,
        };
        this.chunkLandmarks.set(lid, rec);
        this.landmarkMeshes.set(lid, lmMesh);
        landmarkIds.push(lid);
        this.registerPulseHighlight(
          lid,
          'secret',
          lmMesh,
          kind === 'portal' ? 0x88e9ff : 0xffcb77,
          2.6,
          6.0,
          () => ({ x: lx, z: lz }),
          () => kind === 'portal' || !rec.activated,
        );
      }
    } else if (rng() < 0.38) {
      const mx = centerX + (rng() - 0.5) * 32;
      const mz = centerZ + (rng() - 0.5) * 32;
      const my = groundHeightAt(mx, mz);
      if (my > WATER_LEVEL + 0.45 && terrainSlopeAt(mx, mz) < 0.55) {
        const mono = createMonolithGroup(this.tex, biome.id === 'mystic_night' ? 0xc9a6ff : 0x7ef2c9);
        mono.position.set(mx, my, mz);
        mono.rotation.y = rng() * TAU;
        group.add(mono);
        obstacles.push({ x: mx, z: mz, r: 1.5 });
      }
    }

    // 6. Seeded Frontier Resource Nodes
    const resTypes: ResourceType[] = ['wood', 'glow', 'water', 'rune', 'seed'];
    const resCount = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < resCount; i++) {
      const rx = centerX + (rng() - 0.5) * (CHUNK_SIZE - 14);
      const rz = centerZ + (rng() - 0.5) * (CHUNK_SIZE - 14);
      const ry = groundHeightAt(rx, rz);
      if (ry < WATER_LEVEL + 0.35 || terrainSlopeAt(rx, rz) > 0.7) continue;
      const rType = resTypes[Math.floor(rng() * resTypes.length)];
      const rid = `fres_${cKey}_${i}`;
      const node: WorldResourceNode = {
        id: rid,
        type: rType,
        x: rx,
        z: rz,
        active: true,
        respawnAt: 0,
        chunkKey: cKey,
      };
      this.resourceNodes.push(node);
      resourceIds.push(rid);
      const mesh = createResourceNodeMesh(rType);
      mesh.position.set(rx, ry, rz);
      this.resourceMeshes.set(rid, mesh);
      this.scene.add(mesh);
      this.registerPulseHighlight(
        rid,
        'resource',
        mesh,
        0x7ef2c9,
        0.95,
        2.6,
        () => ({ x: rx, z: rz }),
        () => node.active,
      );
    }

    // 7. Procedural Frontier Blight Nest in wild chunks (~48% chance)
    if (rng() < 0.48) {
      const bx = centerX + (rng() - 0.5) * 40;
      const bz = centerZ + (rng() - 0.5) * 40;
      const by = groundHeightAt(bx, bz);
      if (by > WATER_LEVEL + 0.45 && terrainSlopeAt(bx, bz) < 0.65) {
        const bid = `fblight_${cKey}`;
        this.spawnBlightNode(bid, bx, bz, 3, 7.8, cKey);
        blightIds.push(bid);
      }
    }

    this.scene.add(group);
    this.frontierChunks.set(cKey, {
      cx,
      cz,
      group,
      terrainMesh: chunkTerrain,
      obstacles,
      resourceIds,
      blightIds,
      landmarkIds,
      subBiome,
    });
  }

  private createHighlightShell(colorHex: number, radius: number, height: number): {
    group: THREE.Group;
    mat: THREE.ShaderMaterial;
  } {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uColor: { value: new THREE.Color(colorHex) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vUv;
        void main() {
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 1.7);
          float scan = 0.55 + 0.45 * sin(vUv.y * 22.0 - uTime * 7.5);
          float vFade = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
          float pulse = 0.78 + 0.22 * sin(uTime * 5.0);
          float alpha = (0.35 + fresnel * 0.85) * scan * vFade * pulse * uIntensity;
          gl_FragColor = vec4(uColor * 1.25, alpha);
        }
      `,
    });

    const group = new THREE.Group();
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.78, radius * 1.15, height, 20, 1, true),
      mat,
    );
    shell.position.y = height * 0.5;
    const baseRing = new THREE.Mesh(new THREE.RingGeometry(radius * 0.85, radius * 1.25, 24), mat);
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.16;
    group.add(shell, baseRing);
    group.visible = false;
    return { group, mat };
  }

  private registerPulseHighlight(
    id: string,
    kind: 'resource' | 'secret' | 'pillar' | 'npc' | 'project' | 'blight',
    parent: THREE.Group,
    colorHex: number,
    radius: number,
    height: number,
    getPos: () => { x: number; z: number },
    isEligible: () => boolean,
  ): void {
    const { group, mat } = this.createHighlightShell(colorHex, radius, height);
    parent.add(group);
    this.pulseHighlights.push({
      id,
      kind,
      group,
      mat,
      getPos,
      isEligible,
      startAt: -1,
      endAt: -1,
    });
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

    // Agile roaming spirit foxes across the valley & meadows
    const foxSpots: [number, number][] = [
      [34, -14],
      [-28, 30],
      [48, 38],
      [-48, -28],
      [85, 22],
      [-95, 10],
    ];
    foxSpots.forEach(([fx, fz]) => {
      const grp = createFoxGroup();
      grp.position.set(fx, groundHeightAt(fx, fz), fz);
      this.scene.add(grp);
      this.foxList.push({ group: grp, x: fx, z: fz, yaw: Math.random() * TAU, phase: Math.random() * TAU });
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

    // Seasonal Snowflakes / Autumn Leaves / Magic Spores Particle System
    const snowCount = 520;
    const sPos = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 86;
      sPos[i * 3 + 1] = Math.random() * 28;
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 86;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this.snowPoints = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({
        color: 0xeef9ff,
        size: 0.36,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      }),
    );
    this.snowPoints.visible = false;
    this.scene.add(this.snowPoints);
  }

  private syncBuildingsToScene(): void {
    // Clear existing
    for (const m of this.buildingMeshes.values()) this.scene.remove(m);
    for (const l of this.buildingPointLights.values()) this.scene.remove(l);
    this.buildingMeshes.clear();
    this.buildingPointLights.clear();
    this.buildingHighlights = [];

    for (const b of this.state.buildings) {
      const grp = createInventionGroup(b.type, b.tier, this.tex, false);
      const y = b.type === 'bridge' ? WATER_LEVEL : groundHeightAt(b.x, b.z);
      grp.position.set(b.x, y, b.z);
      grp.rotation.y = b.rot;
      grp.userData.buildingId = b.id;
      this.buildingMeshes.set(b.id, grp);
      this.scene.add(grp);

      const hl = this.createHighlightShell(0x88e9ff, 2.0, 4.4);
      grp.add(hl.group);
      this.buildingHighlights.push({
        id: b.id,
        group: hl.group,
        mat: hl.mat,
        x: b.x,
        z: b.z,
        startAt: -1,
        endAt: -1,
      });

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
      this.pulseHighlights = this.pulseHighlights.filter((h) => h.id !== proj.id);
      this.registerPulseHighlight(
        proj.id,
        'project',
        grp,
        0x7ef2c9,
        2.2,
        5.5,
        () => ({ x: proj.x, z: proj.z }),
        () => (this.state.communityProjects[proj.id] || 0) < proj.maxStages,
      );
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
    let score = 12;
    score += this.state.completedQuests.length * 10;
    score += Math.min(20, this.state.buildings.reduce((acc, b) => acc + b.tier * 3, 0));
    score += Math.min(16, this.computeSynergies().length * 5);
    score += this.state.discoveredSecrets.length * 5;
    score += Object.values(this.state.communityProjects).reduce((a, b) => a + b * 3, 0);
    const bloomSum = this.state.buildings
      .filter((b) => b.type === 'irrigator')
      .reduce((acc, b) => acc + b.growth * 10, 0);
    score += Math.min(15, Math.round(bloomSum));

    // Unpurified central blight drains the valley's vitality
    let activeCentralBlight = 0;
    for (const spot of VALLEY_BLIGHT_SPOTS) {
      const bn = this.blightNodes.get(spot.id);
      if (bn && !bn.purified) activeCentralBlight++;
    }
    score -= activeCentralBlight * 6;
    score += Math.min(12, this.state.blightPurified * 3);

    return Math.max(0, Math.min(100, Math.round(score)));
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
    this.composer?.setSize(w, h);
    this.bloomPass?.setSize(w, h);
  };

  private handleBlur = (): void => {
    this.keys = {};
    this.isDraggingCam = false;
  };

  private unlockAudioFromGesture(): void {
    if (this.sound.unlockOnGesture()) {
      this.callbacks.onAudioChange?.(true);
      this.callbacks.onAudioMixChange?.(this.sound.getMixSettings());
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const t = e.target;
    if (t instanceof HTMLElement && (t.matches('input,textarea,select') || t.isContentEditable)) {
      return;
    }
    this.unlockAudioFromGesture();
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
    this.unlockAudioFromGesture();
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

  private getTerrainRaycastTargets(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [this.terrainMesh];
    for (const ch of this.frontierChunks.values()) {
      list.push(ch.terrainMesh);
    }
    return list;
  }

  private handlePointerUp = (e: PointerEvent): void => {
    const wasClick = this.isDraggingCam && !this.dragMoved;
    this.isDraggingCam = false;
    if (!wasClick || this.pausedForDialog || this.state.gameOver) return;

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

    // 3. Otherwise raycast hero + frontier terrain to set unbounded walk target
    const terrainHits = this.raycaster.intersectObjects(this.getTerrainRaycastTargets(), false);
    if (terrainHits.length > 0) {
      const pt = terrainHits[0].point;
      this.walkTarget = { x: pt.x, z: pt.z };
      this.walkWaypointMesh.position.set(pt.x, groundHeightAt(pt.x, pt.z) + 0.12, pt.z);
      this.walkWaypointMesh.visible = true;
      this.sound.playSfx('click');
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
    const next = this.sound.toggle();
    this.callbacks.onAudioChange?.(next);
    this.callbacks.onAudioMixChange?.(this.sound.getMixSettings());
    return next;
  }

  public isAudioEnabled(): boolean {
    return this.sound.isEnabled();
  }

  public getAudioMix(): AudioMixSettings {
    return this.sound.getMixSettings();
  }

  public setMusicVolume(vol: number): void {
    const mix = this.sound.setMusicVolume(vol);
    this.callbacks.onAudioMixChange?.(mix);
  }

  public setAmbienceVolume(vol: number): void {
    const mix = this.sound.setAmbienceVolume(vol);
    this.callbacks.onAudioMixChange?.(mix);
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
    this.evaluateAchievements(true);
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
    this.evaluateAchievements(true);
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
    this.evaluateAchievements(true);
    this.persist();
    this.emitHud();
    return true;
  }

  public interact(): void {
    if (this.state.gameOver) return;
    const prompt = this.findNearbyPrompt();
    if (!prompt) {
      this.toast('אין אינטראקציה ממש לידך. התקרב לדמות, חומר, שריד, שער, נבג קמילה או מבנה.', 'info');
      return;
    }
    if (prompt.kind === 'npc') {
      const npcId = prompt.id as NpcId;
      this.state.npcMemories[npcId].met = true;
      this.sound.playSfx('talk');
      this.callbacks.onOpenNpc(npcId);
      this.emitHud();
    } else if (prompt.kind === 'blight') {
      const purified = this.damageBlightNode(prompt.id, 1);
      if (!purified) {
        const bn = this.blightNodes.get(prompt.id);
        this.sound.playSfx('pulse');
        this.toast(`פגעת בנבג הקמילה (${bn?.hp ?? 0}/${bn?.maxHp ?? 0} נותר). לחץ שוב E או שדר Q!`, 'info');
      }
      this.persist();
      this.emitHud();
    } else if (prompt.kind === 'portal' || prompt.kind === 'landmark') {
      this.activateLandmark(prompt.id);
    } else if (prompt.kind === 'water_drink') {
      this.drinkFromRiver();
    } else if (prompt.kind === 'forage' || prompt.kind === 'resource') {
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

  private drinkFromRiver(): void {
    if (this.state.simTime - this.lastRiverDrinkAt < 3) return;
    this.lastRiverDrinkAt = this.state.simTime;
    this.state.thirst = Math.min(100, this.state.thirst + 34);
    this.state.craftInv.dew_flask = Math.min(15, (this.state.craftInv.dew_flask || 0) + 1);
    this.sound.playSfx('gather');
    this.toast('שתית מהנחל הטהור (+34 צמא) ומילאת נאד מי טל!', 'good');
    this.persist();
    this.emitHud();
  }

  public gatherNearby(): void {
    // Prefer closest either proximity combinable forage item or WorldResourceNode
    let bestForageIdx = -1;
    let bestForageDist = 5.0;
    for (let i = 0; i < this.proximityItems.length; i++) {
      const p = this.proximityItems[i].node;
      const d = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (d < bestForageDist) {
        bestForageDist = d;
        bestForageIdx = i;
      }
    }

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

    if (bestForageIdx >= 0 && (!best || bestForageDist <= bestD)) {
      this.collectProximityItemAt(bestForageIdx);
      return;
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

  private collectProximityItemAt(idx: number): void {
    const entry = this.proximityItems[idx];
    if (!entry) return;
    this.scene.remove(entry.mesh);
    this.disposeObjectTree(entry.mesh);
    this.proximityItems.splice(idx, 1);

    const meta = CRAFT_ITEMS[entry.node.itemId];
    this.state.craftInv[entry.node.itemId] = (this.state.craftInv[entry.node.itemId] || 0) + 1;
    if (entry.node.isMeteorDrop) {
      this.state.meteorsHarvested = (this.state.meteorsHarvested || 0) + 1;
    }
    this.sound.playSfx('gather');
    this.toast(`אספת ${meta.name} (חומר משתלב)!`, entry.node.isMeteorDrop ? 'secret' : 'good');
    this.persist();
    this.emitHud();
  }

  private pickProximityItemId(subBiome: SubBiomeId, seasonId: SeasonId): CraftItemId {
    const r = Math.random();
    if (subBiome === 'crystal_canyon') {
      if (r < 0.36) return 'frost_crystal';
      if (r < 0.56) return 'ember_stone';
      if (r < 0.74) return 'dew_flask';
      return r < 0.88 ? 'mushroom' : 'cloth_fiber';
    }
    if (subBiome === 'mushroom_grove') {
      if (r < 0.42) return 'mushroom';
      if (r < 0.65) return 'herb';
      if (r < 0.82) return 'honey_sap';
      return 'berry';
    }
    if (subBiome === 'thermal_springs') {
      if (r < 0.35) return 'ember_stone';
      if (r < 0.58) return 'spice_root';
      if (r < 0.78) return 'dew_flask';
      return 'herb';
    }
    if (subBiome === 'obsidian_crags') {
      if (r < 0.42) return 'ember_stone';
      if (r < 0.66) return 'spice_root';
      if (r < 0.84) return 'cloth_fiber';
      return 'frost_crystal';
    }
    if (subBiome === 'bloom_meadow') {
      if (r < 0.32) return 'berry';
      if (r < 0.52) return 'honey_sap';
      if (r < 0.72) return 'herb';
      if (r < 0.86) return 'dew_flask';
      return 'cloth_fiber';
    }

    // Valley core & seasonal availability balance
    if (seasonId === 'winter') {
      if (r < 0.24) return 'frost_crystal';
      if (r < 0.46) return 'spice_root';
      if (r < 0.64) return 'ember_stone';
      if (r < 0.78) return 'mushroom';
      if (r < 0.9) return 'cloth_fiber';
      return 'dew_flask';
    }
    if (seasonId === 'summer') {
      if (r < 0.28) return 'dew_flask';
      if (r < 0.5) return 'berry';
      if (r < 0.68) return 'honey_sap';
      if (r < 0.82) return 'herb';
      if (r < 0.92) return 'frost_crystal';
      return 'cloth_fiber';
    }
    if (seasonId === 'autumn') {
      if (r < 0.26) return 'mushroom';
      if (r < 0.48) return 'spice_root';
      if (r < 0.64) return 'berry';
      if (r < 0.78) return 'honey_sap';
      if (r < 0.9) return 'cloth_fiber';
      return 'dew_flask';
    }
    // Spring
    if (r < 0.28) return 'berry';
    if (r < 0.48) return 'herb';
    if (r < 0.64) return 'dew_flask';
    if (r < 0.78) return 'honey_sap';
    if (r < 0.9) return 'mushroom';
    return Math.random() < 0.5 ? 'cloth_fiber' : 'spice_root';
  }

  private stepProximityItems(force = false): void {
    const { seasonId } = this.getSeasonInfo();
    const targetCount = Math.max(11, Math.round(18 * SEASONS[seasonId].forageDensityMult));

    // Recycle distant items smoothly around moving player
    for (let i = this.proximityItems.length - 1; i >= 0; i--) {
      const entry = this.proximityItems[i];
      const maxR = entry.node.isMeteorDrop ? 92 : 68;
      const d = Math.hypot(entry.node.x - this.playerX, entry.node.z - this.playerZ);
      if (d > maxR) {
        this.scene.remove(entry.mesh);
        this.disposeObjectTree(entry.mesh);
        this.proximityItems.splice(i, 1);
      }
    }

    let attempts = 0;
    const capAttempts = force ? 80 : 24;
    while (this.proximityItems.length < targetCount && attempts < capAttempts) {
      attempts++;
      const angle = Math.random() * TAU;
      const dist = (force ? 8 : 14) + Math.random() * 40;
      const x = this.playerX + Math.cos(angle) * dist;
      const z = this.playerZ + Math.sin(angle) * dist;
      const y = groundHeightAt(x, z);
      if (y < WATER_LEVEL + 0.14 || terrainSlopeAt(x, z) > 0.74) continue;
      if (this.proximityItems.some((p) => Math.hypot(p.node.x - x, p.node.z - z) < 4.5)) continue;

      const subBiome = detectSubBiome(x, z);
      const itemId = this.pickProximityItemId(subBiome, seasonId);
      const id = `prox_${Date.now()}_${attempts}_${Math.random().toString(16).slice(2, 6)}`;
      const mesh = createForageItemMesh(itemId);
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.random() * TAU;
      this.scene.add(mesh);
      this.proximityItems.push({
        node: { id, itemId, x, y, z },
        mesh,
      });
    }
  }

  public toggleAutoSurvival(): void {
    this.state.autoSurvivalEnabled = !this.state.autoSurvivalEnabled;
    this.sound.playSfx('click');
    this.toast(
      this.state.autoSurvivalEnabled
        ? 'הישרדות אוטומטית חכמה הופעלה — המערכת תבשל ותשלים מזון/שתייה/חימום במצבי חירום.'
        : 'הישרדות אוטומטית כובתה — שליטה ידנית מלאה מהתיק.',
      'info',
    );
    this.persist();
    this.emitHud();
  }

  public craftRecipe(recipeId: string, andUse = false): boolean {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    for (const [k, qty] of Object.entries(recipe.ingredients)) {
      if ((this.state.craftInv[k as CraftItemId] || 0) < (qty || 0)) {
        this.toast('חסרים פריטים משתלבים בתיק למתכון זה.', 'warn');
        return false;
      }
    }
    for (const [k, qty] of Object.entries(recipe.ingredients)) {
      const ck = k as CraftItemId;
      this.state.craftInv[ck] = Math.max(0, (this.state.craftInv[ck] || 0) - (qty || 0));
    }

    this.state.recipesCraftedCount = (this.state.recipesCraftedCount || 0) + 1;

    if (recipe.outputId === 'rune_transmute') {
      if (recipe.resourceBonus) {
        for (const [rk, rv] of Object.entries(recipe.resourceBonus)) {
          this.state.inv[rk as ResourceType] = (this.state.inv[rk as ResourceType] || 0) + (rv || 0);
        }
      }
      this.sound.playSfx('craft');
      this.addJournal(`זיקקת ${recipe.name} ויצרת משאבי רונה ואור-ירח.`, 'survival');
      this.toast(`זוקק בהצלחה: ${recipe.name}!`, 'secret');
      this.evaluateAchievements(true);
      this.persist();
      this.emitHud();
      return true;
    }

    const outId = recipe.outputId;
    if (outId === 'thermal_cloak') {
      this.state.hasThermalCloak = true;
      this.state.warmth = Math.min(100, this.state.warmth + 35);
      this.sound.playSfx('upgrade');
      this.addJournal('תפרת גלימת פרווה ותהודה — איבוד החום בחורף פחת ב-58%!', 'survival');
      this.toast('גלימת הפרווה והתהודה נלבשה! הגנה קבועה מפני הקור.', 'secret');
    } else {
      this.state.craftInv[outId] = (this.state.craftInv[outId] || 0) + 1;
      this.sound.playSfx('craft');
      this.toast(`הכנת ${recipe.name}!`, 'good');
      if (andUse) {
        this.consumeCraftItem(outId);
      }
    }

    this.evaluateAchievements(true);
    this.persist();
    this.emitHud();
    return true;
  }

  public consumeCraftItem(itemId: CraftItemId): boolean {
    if ((this.state.craftInv[itemId] || 0) <= 0) return false;
    const meta = CRAFT_ITEMS[itemId];
    if (itemId === 'thermal_cloak') {
      this.state.hasThermalCloak = true;
      this.state.craftInv[itemId]--;
      this.state.warmth = Math.min(100, this.state.warmth + 35);
      this.sound.playSfx('upgrade');
      this.toast('לבשת גלימת פרווה ותהודה!', 'good');
      this.persist();
      this.emitHud();
      return true;
    }
    if (
      !meta.hungerGain &&
      !meta.thirstGain &&
      !meta.warmthGain &&
      !meta.healthGain &&
      !meta.staminaGain
    ) {
      return false;
    }

    this.state.craftInv[itemId]--;
    if (meta.hungerGain) this.state.hunger = Math.min(100, this.state.hunger + meta.hungerGain);
    if (meta.thirstGain) this.state.thirst = Math.min(100, this.state.thirst + meta.thirstGain);
    if (meta.warmthGain) this.state.warmth = Math.min(100, this.state.warmth + meta.warmthGain);
    if (meta.healthGain) this.state.health = Math.min(100, this.state.health + meta.healthGain);
    if (meta.staminaGain) this.state.stamina = Math.min(100, this.state.stamina + meta.staminaGain);
    if (itemId === 'star_elixir') {
      this.state.starBuffUntil = this.state.simTime + 90;
    }

    this.sound.playSfx('consume');
    this.toast(`צרכת ${meta.name}!`, 'good');
    this.persist();
    this.emitHud();
    return true;
  }

  private tryAutoSurvival(t: number): void {
    if (!this.state.autoSurvivalEnabled) return;
    if (t - this.lastAutoSurviveAt < 2.4) return;

    const tryDirectOrCraft = (
      existingPriority: CraftItemId[],
      recipePriority: string[],
      rawFallback: CraftItemId[],
      label: string,
    ): boolean => {
      for (const id of existingPriority) {
        if ((this.state.craftInv[id] || 0) > 0) {
          this.lastAutoSurviveAt = t;
          this.consumeCraftItem(id);
          this.toast(`הישרדות אוטומטית (${label}): צרכת ${CRAFT_ITEMS[id].name}`, 'info');
          return true;
        }
      }
      for (const recId of recipePriority) {
        const rec = CRAFT_RECIPES.find((r) => r.id === recId);
        if (!rec) continue;
        const can = Object.entries(rec.ingredients).every(
          ([k, qty]) => (this.state.craftInv[k as CraftItemId] || 0) >= (qty || 0),
        );
        if (can) {
          this.lastAutoSurviveAt = t;
          this.craftRecipe(recId, rec.outputId !== 'thermal_cloak');
          this.toast(`שילוב חכם אוטומטי (${label}): ${rec.name}`, 'good');
          return true;
        }
      }
      for (const id of rawFallback) {
        if ((this.state.craftInv[id] || 0) > 0) {
          this.lastAutoSurviveAt = t;
          this.consumeCraftItem(id);
          this.toast(`הישרדות אוטומטית (${label}): ${CRAFT_ITEMS[id].name}`, 'info');
          return true;
        }
      }
      return false;
    };

    if (this.state.warmth < 28) {
      if (
        !this.state.hasThermalCloak &&
        tryDirectOrCraft([], ['rec_thermal_cloak'], [], 'מיגון קור')
      ) {
        return;
      }
      if (
        tryDirectOrCraft(
          ['hearth_stew', 'spiced_tea', 'star_elixir'],
          ['rec_spiced_tea', 'rec_hearth_stew'],
          ['ember_stone', 'spice_root', 'star_shard'],
          'חימום',
        )
      ) {
        return;
      }
    }

    if (this.state.thirst < 30) {
      if (
        tryDirectOrCraft(
          ['frost_nectar', 'mint_cooler', 'spiced_tea', 'star_elixir'],
          ['rec_mint_cooler', 'rec_frost_nectar', 'rec_spiced_tea'],
          ['dew_flask', 'frost_crystal', 'herb', 'berry'],
          'שתייה',
        )
      ) {
        return;
      }
    }

    if (this.state.hunger < 30) {
      if (
        tryDirectOrCraft(
          ['hearth_stew', 'berry_skewer', 'trail_jam', 'star_elixir'],
          ['rec_trail_jam', 'rec_berry_skewer', 'rec_hearth_stew'],
          ['berry', 'mushroom', 'honey_sap', 'spice_root'],
          'מזון',
        )
      ) {
        return;
      }
    }

    if (this.state.health < 42) {
      tryDirectOrCraft(
        ['healing_salve', 'star_elixir', 'hearth_stew'],
        ['rec_healing_salve', 'rec_star_elixir'],
        ['herb', 'star_shard'],
        'מרפא',
      );
    }
  }

  public teleportToPortal(dest: PortalDestination): void {
    this.playerX = dest.x;
    this.playerZ = dest.z;
    this.playerY = groundHeightAt(dest.x, dest.z) + 0.25;
    this.playerVy = 0;
    this.isGrounded = true;
    this.walkTarget = null;
    this.walkWaypointMesh.visible = false;
    this.playerHitCooldownAt = this.state.simTime + 2.5;
    this.updateFrontierChunks(true);
    this.stepProximityItems(true);
    this.sound.playSfx('portal');
    this.toast(`שוגרת בהצלחה אל ${dest.name}!`, 'secret');
    this.persist();
    this.emitHud();
  }

  private activateLandmark(landmarkId: string): void {
    const rec = this.chunkLandmarks.get(landmarkId);
    if (!rec) return;

    if (rec.kind === 'portal') {
      const already = this.state.discoveredPortals.some((p) => p.id === rec.id);
      if (!already) {
        rec.activated = true;
        this.state.discoveredPortals.push({
          id: rec.id,
          name: rec.name,
          subBiome: rec.subBiome,
          x: rec.x,
          z: rec.z,
        });
        const mesh = this.landmarkMeshes.get(rec.id);
        const vMat = mesh?.userData.vortexMat as THREE.MeshBasicMaterial | undefined;
        if (vMat) {
          vMat.color.setHex(0x88e9ff);
          vMat.opacity = 0.62;
        }
        this.sound.playSfx('portal');
        this.addJournal(`חיברת שער שיגור חדש: ${rec.name}.`, 'discovery');
        this.toast(`שער שיגור חובר: ${rec.name}!`, 'secret');
        this.evaluateAchievements(true);
        this.persist();
        this.emitHud();
      } else {
        this.sound.playSfx('portal');
      }
      this.callbacks.onOpenPortal?.([
        { id: 'home_plaza', name: 'כיכר הלב המרכזית', subBiome: 'valley_core', x: -12, z: 2 },
        ...this.state.discoveredPortals,
      ]);
      return;
    }

    if (rec.activated || this.state.activatedLandmarks.includes(rec.id)) {
      this.toast(`${rec.name} כבר מהדהד בשלווה.`, 'info');
      return;
    }

    rec.activated = true;
    this.state.activatedLandmarks.push(rec.id);
    const mesh = this.landmarkMeshes.get(rec.id);
    const orbMat = mesh?.userData.orbMat as THREE.MeshStandardMaterial | undefined;
    if (orbMat) {
      orbMat.color.setHex(0x7ef2c9);
      orbMat.emissive.setHex(0x3ad49f);
      orbMat.emissiveIntensity = 0.85;
    }

    if (rec.kind === 'ancient_temple') {
      this.state.inv.rune = (this.state.inv.rune || 0) + 2;
      this.state.inv.glow = (this.state.inv.glow || 0) + 2;
      this.state.craftInv.star_shard = (this.state.craftInv.star_shard || 0) + 1;
      this.toast(`${rec.name} התעורר! קיבלת 2 רונות, 2 אור-ירח ושבר כוכבים!`, 'secret');
    } else {
      this.state.inv.seed = (this.state.inv.seed || 0) + 2;
      this.state.craftInv.ember_stone = (this.state.craftInv.ember_stone || 0) + 1;
      this.state.craftInv.herb = (this.state.craftInv.herb || 0) + 2;
      this.toast(`${rec.name} הופעל! קיבלת זרעי פלא, אבן גחלת ועשבי מרפא!`, 'secret');
    }

    this.sound.playSfx('secret');
    this.addJournal(`חקרת והארת מבנה עתיק: ${rec.name}.`, 'discovery');
    this.evaluateAchievements(true);
    this.persist();
    this.emitHud();
  }

  private triggerClimateEvent(forceType?: ClimateEventType): void {
    const { seasonId } = this.getSeasonInfo();
    let chosen: ClimateEventType = forceType || 'sunbeam_bloom';
    if (!forceType) {
      const r = Math.random();
      if (seasonId === 'winter') {
        chosen = r < 0.55 ? 'blizzard' : r < 0.82 ? 'magic_fog' : 'meteor_shower';
      } else if (seasonId === 'summer') {
        chosen = r < 0.48 ? 'sunbeam_bloom' : r < 0.8 ? 'meteor_shower' : 'magic_fog';
      } else if (seasonId === 'autumn') {
        chosen = r < 0.48 ? 'leaf_gust' : r < 0.8 ? 'meteor_shower' : 'magic_fog';
      } else {
        chosen = r < 0.42 ? 'sunbeam_bloom' : r < 0.72 ? 'magic_fog' : 'meteor_shower';
      }
    }

    this.state.climateEvent = chosen;
    this.state.climateEventEndsAt = this.state.simTime + (chosen === 'blizzard' ? 58 : 65);
    this.nextMeteorAt = this.state.simTime + 2.5;
    if (chosen === 'blizzard') {
      this.terrainNeedsColorUpdate = true;
    }
    const meta = CLIMATE_EVENT_LABELS[chosen];
    this.toast(`תופעת טבע: ${meta.name} — ${meta.desc}`, chosen === 'blizzard' ? 'warn' : 'secret');
    this.addJournal(`תופעת אקלים בעמק: ${meta.name}.`, 'discovery');
    this.emitHud();
  }

  private spawnMeteor(): void {
    const ang = Math.random() * TAU;
    const dist = 16 + Math.random() * 34;
    const targetX = this.playerX + Math.cos(ang) * dist;
    const targetZ = this.playerZ + Math.sin(ang) * dist;
    const targetY = groundHeightAt(targetX, targetZ);
    if (targetY < WATER_LEVEL + 0.15) return;

    const startX = targetX + (Math.random() - 0.5) * 26;
    const startY = targetY + 46;
    const startZ = targetZ + (Math.random() - 0.5) * 26;
    const flightTime = 1.65;
    const mesh = createMeteorStreakGroup();
    mesh.position.set(startX, startY, startZ);
    this.scene.add(mesh);

    this.fallingMeteors.push({
      mesh,
      x: startX,
      y: startY,
      z: startZ,
      vx: (targetX - startX) / flightTime,
      vy: (targetY - startY) / flightTime,
      vz: (targetZ - startZ) / flightTime,
      targetX,
      targetZ,
    });
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
    this.evaluateAchievements(true);
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
    this.evaluateAchievements(true);
    this.persist();
    this.emitHud();
  }

  private damageBlightNode(id: string, dmg: number): boolean {
    const bn = this.blightNodes.get(id);
    if (!bn || bn.purified) return false;

    bn.hp = Math.max(0, bn.hp - dmg);
    const orb = bn.group.userData.orb as THREE.Mesh | undefined;
    const orbMat = bn.group.userData.orbMat as THREE.MeshStandardMaterial | undefined;
    const fangMat = bn.group.userData.fangMat as THREE.MeshStandardMaterial | undefined;
    const auraRing = bn.group.userData.auraRing as THREE.Mesh | undefined;

    if (bn.hp <= 0) {
      bn.purified = true;
      if (!this.state.purifiedBlightIds.includes(id)) {
        this.state.purifiedBlightIds.push(id);
      }
      this.state.blightPurified++;
      this.state.inv.glow = (this.state.inv.glow || 0) + 1;
      if (id.startsWith('fblight_')) {
        this.state.inv.seed = (this.state.inv.seed || 0) + 1;
      } else {
        this.state.inv.rune = (this.state.inv.rune || 0) + 1;
      }

      if (orbMat) {
        orbMat.color.setHex(0x7ef2c9);
        orbMat.emissive.setHex(0x3ad49f);
        orbMat.emissiveIntensity = 1.1;
      }
      if (fangMat) {
        fangMat.color.setHex(0x6ba68e);
        fangMat.emissive.setHex(0x1e5c45);
        fangMat.emissiveIntensity = 0.3;
      }
      if (auraRing) {
        const rm = auraRing.material as THREE.MeshBasicMaterial;
        rm.color.setHex(0x7ef2c9);
        rm.opacity = 0.16;
      }
      if (orb) orb.scale.setScalar(0.8);

      // Stun any nearby wisps tied to this node
      for (const w of this.shadowWisps) {
        if (w.homeNodeId === id) {
          w.hp -= 50;
          w.stunUntil = this.state.simTime + 3;
        }
      }

      this.terrainNeedsColorUpdate = true;
      this.sound.playSfx('purify');
      this.addJournal(`טיהרת נבג קמילה והחזרת חיים לקרקע.`, 'discovery');
      this.toast('נבג קמילה טוהר! הקרקע התנקה והרווחת גביש אור-ירח.', 'good');
      this.evaluateAchievements(true);
      return true;
    }

    if (orb) orb.scale.setScalar(1.22);
    return false;
  }

  public triggerPulse(): void {
    if (this.pausedForDialog || this.state.gameOver) return;
    if (this.state.simTime < this.pulseCooldownAt) {
      this.toast('גל התהודה עדיין נטען...', 'info');
      return;
    }
    const now = this.state.simTime;
    this.pulseCooldownAt = now + 5;
    this.state.pulsesTriggered++;
    this.pulseActive = true;
    this.pulseAge = 0;
    this.pulseOrigin.set(this.playerX, this.playerY + 0.35, this.playerZ);
    this.pulseUniforms.uOrigin.value.copy(this.pulseOrigin);
    this.pulseUniforms.uTime.value = 0;

    this.pulseRing.position.copy(this.pulseOrigin);
    this.pulseRing.scale.setScalar(1);
    this.pulseRing.visible = true;
    (this.pulseRing.material as THREE.ShaderMaterial).uniforms.uAge.value = 0;

    this.pulseDome.position.set(this.playerX, this.playerY, this.playerZ);
    this.pulseDome.scale.setScalar(1);
    this.pulseDome.visible = true;
    (this.pulseDome.material as THREE.ShaderMaterial).uniforms.uAge.value = 0;
    this.sound.playSfx('pulse');

    let revealed = 0;
    for (const r of this.resourceNodes) {
      if (r.active && r.hiddenUntilPulse && Math.hypot(r.x - this.playerX, r.z - this.playerZ) < 46) {
        r.revealedUntil = now + 22;
        const m = this.resourceMeshes.get(r.id);
        if (m) m.visible = true;
        revealed++;
      }
    }

    // Repel, damage & shatter chasing Shadow Wisps within shockwave radius
    let shatteredWisps = 0;
    let damagedWisps = 0;
    for (let i = this.shadowWisps.length - 1; i >= 0; i--) {
      const w = this.shadowWisps[i];
      const dx = w.x - this.playerX;
      const dz = w.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= 26) {
        w.hp -= 85;
        w.stunUntil = now + 3.5;
        if (dist > 0.2) {
          const pushX = w.x + (dx / dist) * 6.5;
          const pushZ = w.z + (dz / dist) * 6.5;
          if (isWalkableWater(pushX, pushZ, this.state.buildings)) {
            w.x = pushX;
            w.z = pushZ;
          }
        }
        if (w.hp <= 0) {
          this.scene.remove(w.group);
          this.disposeObjectTree(w.group);
          this.shadowWisps.splice(i, 1);
          shatteredWisps++;
          if (Math.random() < 0.55) {
            this.state.inv.glow = (this.state.inv.glow || 0) + 1;
          }
        } else {
          damagedWisps++;
        }
      }
    }

    // Purify / weaken Blight Nests within 20m
    let blightHits = 0;
    let purifiedNow = 0;
    for (const bn of this.blightNodes.values()) {
      if (!bn.purified && Math.hypot(bn.x - this.playerX, bn.z - this.playerZ) <= 20) {
        blightHits++;
        if (this.damageBlightNode(bn.id, 1)) {
          purifiedNow++;
        }
      }
    }

    // Schedule staggered custom-shader highlight overlays as the wavefront reaches each object (max 50m)
    let highlightedSecrets = 0;
    let highlightedInteractives = 0;
    for (const h of this.pulseHighlights) {
      if (!h.isEligible()) continue;
      const p = h.getPos();
      const dist = Math.hypot(p.x - this.playerX, p.z - this.playerZ);
      if (dist <= 50) {
        const delay = dist / 24;
        h.startAt = now + delay;
        h.endAt = h.startAt + 7.5;
        if (h.kind === 'secret' || h.kind === 'pillar' || h.kind === 'blight') highlightedSecrets++;
        else highlightedInteractives++;
      }
    }
    for (const bh of this.buildingHighlights) {
      const dist = Math.hypot(bh.x - this.playerX, bh.z - this.playerZ);
      if (dist <= 50) {
        const delay = dist / 24;
        bh.startAt = now + delay;
        bh.endAt = bh.startAt + 6.0;
        highlightedInteractives++;
      }
    }

    // If pulsed near cavern entrance, lift mist and illuminate cavern
    if (!this.state.cavernLit && Math.hypot(this.playerX - 66, this.playerZ + 62) < 22) {
      this.igniteCavern();
    }

    this.evaluateAchievements(true);
    this.persist();
    this.emitHud();

    if (shatteredWisps > 0 || purifiedNow > 0) {
      this.toast(
        `הדף תהודה! נופצו ${shatteredWisps} רוחות צל וטוהרו ${purifiedNow} נבגי קמילה!`,
        'good',
      );
    } else if (blightHits > 0 || damagedWisps > 0) {
      this.toast('גל התהודה החליש והמם איומי קמילה בקרבתך!', 'good');
    } else if (revealed > 0 || highlightedSecrets > 0) {
      this.toast(
        `גל התהודה חשף ${revealed} מרבצים חבויים והאיר ${highlightedSecrets + highlightedInteractives} מוקדים בסביבה!`,
        'secret',
      );
    } else if (highlightedInteractives > 0) {
      this.toast(`פעימת תהודה האירה ${highlightedInteractives} אובייקטים אינטראקטיביים בטווח.`, 'info');
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

  public generateNewWorld(config: WorldSeedConfig): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // Ignore storage errors
    }

    const prevAch = config.keepAchievements ? { ...this.state.unlockedAchievements } : {};
    setActiveWorldConfig(config.seed, config.biome);
    this.state = createFreshState(config.seed, config.seedLabel, config.biome);
    this.state.unlockedAchievements = prevAch;

    // Reset player & camera state
    this.playerX = this.state.playerPos.x;
    this.playerZ = this.state.playerPos.z;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerVy = 0;
    this.isGrounded = true;
    this.walkTarget = null;
    this.walkWaypointMesh.visible = false;
    this.playerHitCooldownAt = 0;
    this.lastExposureWarnAt = -100;
    this.setBuildBlueprint(null);

    // Clear Shadow Wisps
    for (const w of this.shadowWisps) {
      this.scene.remove(w.group);
      this.disposeObjectTree(w.group);
    }
    this.shadowWisps = [];

    // Clear Blight Nests
    for (const bn of this.blightNodes.values()) {
      this.scene.remove(bn.group);
      this.disposeObjectTree(bn.group);
    }
    this.blightNodes.clear();

    // Clear Resources & Secrets
    for (const rm of this.resourceMeshes.values()) {
      this.scene.remove(rm);
      this.disposeObjectTree(rm);
    }
    this.resourceMeshes.clear();
    this.resourceNodes = [];
    for (const sm of this.secretMeshes.values()) {
      this.scene.remove(sm);
      this.disposeObjectTree(sm);
    }
    this.secretMeshes.clear();

    // Clear Frontier Chunks & Landmarks
    for (const chunk of this.frontierChunks.values()) {
      this.scene.remove(chunk.group);
      this.disposeObjectTree(chunk.group);
    }
    this.frontierChunks.clear();
    for (const lm of this.landmarkMeshes.values()) {
      this.scene.remove(lm);
      this.disposeObjectTree(lm);
    }
    this.landmarkMeshes.clear();
    this.chunkLandmarks.clear();
    this.skyUpdrafts = [];

    // Clear Proximity Items & Meteors
    for (const p of this.proximityItems) {
      this.scene.remove(p.mesh);
      this.disposeObjectTree(p.mesh);
    }
    this.proximityItems = [];
    for (const m of this.fallingMeteors) {
      this.scene.remove(m.mesh);
      this.disposeObjectTree(m.mesh);
    }
    this.fallingMeteors = [];
    this.nextClimateEventAt = 95;
    this.nextMeteorAt = 0;
    this.lastChunkKey = '';

    // Filter non-NPC highlights cleanly
    this.pulseHighlights = this.pulseHighlights.filter((h) => h.kind === 'npc');

    // Rebuild Hero Terrain for new seed & biome
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh);
      this.terrainMesh.geometry.dispose();
      (this.terrainMesh.material as THREE.Material).dispose();
    }
    this.buildTerrain();

    // Update Water tint
    const biome = BIOME_PRESETS[config.biome];
    if (this.waterMesh) {
      (this.waterMesh.material as THREE.MeshPhysicalMaterial).color.setHex(biome.waterHex);
    }

    // Rebuild static world props (trees, cottages, ruins, cavern, grass) on new terrain
    this.disposeObjectTree(this.staticPropsGroup);
    this.staticPropsGroup.clear();
    this.buildStaticWorld();

    // Reset NPC positions & Patrol states
    for (const npc of NPCS_BASE) {
      const entry = this.npcRigs.get(npc.id);
      if (entry) {
        entry.x = npc.homeX;
        entry.z = npc.homeZ;
        entry.yaw = 0;
        entry.rig.group.position.set(npc.homeX, groundHeightAt(npc.homeX, npc.homeZ), npc.homeZ);
      }
      this.npcPatrolStates.set(npc.id, {
        stopIdx: 0,
        pauseTimer: 2.0,
        activity: NPC_PATROL_ROUTES[npc.id][0]?.activity || 'מסייר בעמק',
      });
    }

    // Repopulate resources, secrets, central blight & outer frontier
    this.buildResourcesAndSecrets();
    this.syncBuildingsToScene();
    this.syncProjectsToScene();
    this.lastSeasonId = this.getSeasonInfo(this.state.day).seasonId;
    this.updateFrontierChunks(true);
    this.updateTerrainVitalityColors();
    this.stepProximityItems(true);
    this.updateAtmosphereAndDayNight(this.state.simTime);
    this.evaluateAchievements(false);
    this.persist();
    this.emitHud();

    this.sound.playSfx('secret');
    this.toast(`עולם חדש נוצר: ${biome.name} (זרע ${config.seedLabel})!`, 'secret');
  }

  public retryCurrentWorld(): void {
    this.state.health = 100;
    this.state.hunger = Math.max(82, this.state.hunger);
    this.state.thirst = Math.max(82, this.state.thirst);
    this.state.warmth = Math.max(84, this.state.warmth);
    this.state.collapseTimer = 0;
    this.state.gameOver = null;
    this.state.climateEvent = 'none';
    this.playerX = -12;
    this.playerZ = 2;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerVy = 0;
    this.isGrounded = true;
    this.walkTarget = null;
    this.walkWaypointMesh.visible = false;
    this.playerHitCooldownAt = this.state.simTime + 3;

    // Clear nearby pursuing wisps so player gets a safe breather at the Plaza
    for (let i = this.shadowWisps.length - 1; i >= 0; i--) {
      const w = this.shadowWisps[i];
      if (Math.hypot(w.x - this.playerX, w.z - this.playerZ) < 42) {
        this.scene.remove(w.group);
        this.disposeObjectTree(w.group);
        this.shadowWisps.splice(i, 1);
      }
    }

    this.updateFrontierChunks(true);
    this.stepProximityItems(true);
    this.persist();
    this.emitHud();
    this.toast('התעוררת מחדש בכיכר הלב! שמור על החום, הרעב והצמא וטהר נבגי קמילה.', 'good');
  }

  public resetWorld(): void {
    const seed = Math.floor(100000 + Math.random() * 899999);
    this.generateNewWorld({
      seed,
      seedLabel: String(seed),
      biome: this.state.biomePreset,
      keepAchievements: false,
    });
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

    // 1.5 Active Blight Nests (E or Q to purify)
    for (const bn of this.blightNodes.values()) {
      if (bn.purified) continue;
      if (Math.hypot(bn.x - this.playerX, bn.z - this.playerZ) < 5.6) {
        return {
          kind: 'blight',
          id: bn.id,
          title: 'נבג קמילה פעיל',
          subtitle: `חוזק ${bn.hp}/${bn.maxHp} — לחץ E או שדר Q לטיהור`,
          keyHint: 'E',
        };
      }
    }

    // 2. Landmarks & Portals
    for (const rec of this.chunkLandmarks.values()) {
      if (Math.hypot(rec.x - this.playerX, rec.z - this.playerZ) < 4.8) {
        return {
          kind: rec.kind === 'portal' ? 'portal' : 'landmark',
          id: rec.id,
          title: rec.name,
          subtitle:
            rec.kind === 'portal'
              ? rec.activated
                ? 'שער שיגור פעיל — לחץ למעבר מהיר'
                : 'שער עתיק כבוי — לחץ לחיבור לרשת הפורטלים'
              : rec.activated
                ? 'מונומנט מואר'
                : 'מונומנט עתיק — לחץ לגילוי אוצרות',
          keyHint: 'E',
        };
      }
    }

    // 2.5 Community Projects
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

    // 4.5 Proximity Combinable Forage Items
    for (const p of this.proximityItems) {
      if (Math.hypot(p.node.x - this.playerX, p.node.z - this.playerZ) < 4.0) {
        const meta = CRAFT_ITEMS[p.node.itemId];
        return {
          kind: 'forage',
          id: p.node.id,
          title: meta.name,
          subtitle: meta.desc,
          keyHint: 'F',
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

    // 7. Riverbank fresh water drinking & flask refill
    const distRiverBank = Math.abs(this.playerX - riverCenterX(this.playerZ)) - riverHalfWidth(this.playerZ);
    if (distRiverBank < 4.2 && this.state.thirst < 92) {
      return {
        kind: 'water_drink',
        id: 'river_water',
        title: 'שפת הנחל הטהור',
        subtitle: 'שתייה מהזרם (+34 צמא) ומילוי נאד מי טל',
        keyHint: 'E',
      };
    }

    return null;
  }

  private loop = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.stepSimulation(dt);
    if (!this.isSoftwareGl && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

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
    const activePlay = !this.pausedForDialog && !this.state.gameOver;
    if (activePlay) {
      this.state.simTime += dt;
    }
    const t = this.state.simTime;
    this.waterUniforms.uTime.value = t;
    this.grassUniforms.uTime.value = t;

    this.updateAtmosphereAndDayNight(t);
    if (activePlay) {
      this.updatePlayerMovement(dt, t);
      this.updateFrontierChunks(false);
      this.updateThreatsAndHealth(dt, t);
    }
    if (!this.state.gameOver) {
      this.updateNpcs(dt, t);
      this.updateWorldObjects(dt, t);
      this.updateBuildGhost();
    }
    this.updateCamera(dt);

    // Infinite water grid follows player in 16m quantized increments to avoid UV/wave shimmer
    if (this.waterMesh) {
      this.waterMesh.position.set(
        Math.round(this.playerX / 16) * 16,
        WATER_LEVEL,
        Math.round(this.playerZ / 16) * 16,
      );
    }

    // Periodic simulation (ecosystems, wisps, resource respawns, weather shifts, promises)
    this.simTickTimer += dt;
    if (this.simTickTimer >= 1.5 && activePlay) {
      this.stepEcosystemSystems(this.simTickTimer);
      this.simTickTimer = 0;
    }

    // Zone-adaptive music + 3D spatial nature ambience
    const activeZone = detectZone(this.playerX, this.playerZ);
    const { isNight } = this.getClockInfo(t);
    const { seasonId } = this.getSeasonInfo(this.state.day);
    this.sound.update({
      simTime: t,
      weather: this.state.weather,
      vitality: this.computeVitality(),
      zone: activeZone,
      isNight,
      playerX: this.playerX,
      playerY: this.playerY,
      playerZ: this.playerZ,
      camYaw: this.camYaw,
      riverX: riverCenterX(this.playerZ),
      season: seasonId,
      climateEvent: this.state.climateEvent,
      subBiome: detectSubBiome(this.playerX, this.playerZ),
    });

    // HUD & Auto-Save
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.14) {
      this.hudSyncTimer = 0;
      this.emitHud();
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 6 && activePlay) {
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
      const { seasonId, year } = this.getSeasonInfo(newDay);
      if (seasonId !== this.lastSeasonId) {
        this.lastSeasonId = seasonId;
        this.terrainNeedsColorUpdate = true;
        const sMeta = SEASONS[seasonId];
        this.addJournal(`שנה ${year}: נכנסנו לעונת ${sMeta.name} — ${sMeta.subtitle}`, 'survival');
        this.toast(`עונה חדשה התחילה: ${sMeta.name}!`, seasonId === 'winter' ? 'warn' : 'secret');
      } else {
        this.toast(`יום ${newDay} בעמק התחיל.`, 'info');
      }
      this.evaluateAchievements(true);
    }

    // Dynamic Climate Events cycle
    if (this.state.climateEvent !== 'none' && t >= this.state.climateEventEndsAt) {
      const wasBlizzard = this.state.climateEvent === 'blizzard';
      this.state.climateEvent = 'none';
      this.nextClimateEventAt = t + 70 + Math.random() * 55;
      if (wasBlizzard) this.terrainNeedsColorUpdate = true;
      this.toast('מזג האוויר בעמק התאזן והתופעה האקלימית חלפה.', 'info');
    } else if (this.state.climateEvent === 'none' && t >= this.nextClimateEventAt) {
      this.triggerClimateEvent();
    }

    const { seasonId } = this.getSeasonInfo(this.state.day);
    const seasonMeta = SEASONS[seasonId];

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

    // Weather & seasonal climate modulation on sky & fog density
    if (this.state.climateEvent === 'blizzard') {
      _colA.lerp(_colC.setHex(0xa8c3d4), isDayArc ? 0.58 : 0.35);
      (this.scene.fog as THREE.FogExp2).density = 0.0135;
      this.sunLight.intensity *= 0.65;
    } else if (this.state.climateEvent === 'magic_fog') {
      _colA.lerp(_colC.setHex(0x74639c), isDayArc ? 0.42 : 0.28);
      (this.scene.fog as THREE.FogExp2).density = 0.0112;
    } else if (this.state.weather === 'mist') {
      _colA.lerp(_colC.setHex(0x8ba8ad), isDayArc ? 0.45 : 0.25);
      (this.scene.fog as THREE.FogExp2).density = 0.0115;
    } else if (this.state.weather === 'rain') {
      _colA.lerp(_colC.setHex(0x486273), isDayArc ? 0.52 : 0.3);
      (this.scene.fog as THREE.FogExp2).density = 0.0092;
      this.sunLight.intensity *= 0.72;
    } else {
      (this.scene.fog as THREE.FogExp2).density = isDayArc ? 0.0058 : 0.0074;
    }

    // Blend subtle biome + season atmospheric tint
    const biomeMeta = BIOME_PRESETS[this.state.biomePreset];
    if (this.state.biomePreset !== 'verdant') {
      _colC.setHex(biomeMeta.skyTintHex);
      _colA.lerp(_colC, this.state.biomePreset === 'mystic_night' ? 0.32 : 0.2);
    }
    if (isDayArc) {
      _colC.setHex(seasonMeta.skyTintHex);
      _colA.lerp(_colC, 0.16);
    }

    this.sunLight.color.copy(_colB);
    (this.scene.background as THREE.Color).copy(_colA);
    (this.scene.fog as THREE.FogExp2).color.copy(_colA);
    (this.skyDome.material as THREE.MeshBasicMaterial).color.copy(_colA);

    // Keep sky dome & starfield centered around player for boundless horizons
    this.skyDome.position.set(this.playerX, 0, this.playerZ);
    this.starsPoints.position.set(this.playerX, 0, this.playerZ);

    // Reactive night elements: stars, fireflies, snow/leaves/spores, cottage windows, lights
    const nightFactor = THREE.MathUtils.clamp((-sunHeight + 0.12) / 0.5, 0, 1);
    (this.starsPoints.material as THREE.PointsMaterial).opacity =
      this.state.climateEvent === 'meteor_shower' ? Math.max(0.55, nightFactor * 0.95) : nightFactor * 0.92;
    (this.firefliesPoints.material as THREE.PointsMaterial).opacity = 0.08 + nightFactor * 0.82;
    this.rainPoints.visible = this.state.weather === 'rain' && seasonId !== 'winter';

    const showSeasonParticles =
      seasonId === 'winter' ||
      this.state.climateEvent === 'blizzard' ||
      seasonId === 'autumn' ||
      this.state.climateEvent === 'leaf_gust' ||
      this.state.climateEvent === 'magic_fog';
    this.snowPoints.visible = showSeasonParticles;
    if (showSeasonParticles) {
      const sMat = this.snowPoints.material as THREE.PointsMaterial;
      if (seasonId === 'winter' || this.state.climateEvent === 'blizzard') {
        sMat.color.setHex(0xeef9ff);
        sMat.size = this.state.climateEvent === 'blizzard' ? 0.44 : 0.34;
      } else if (this.state.climateEvent === 'magic_fog') {
        sMat.color.setHex(0xc9a6ff);
        sMat.size = 0.4;
      } else {
        sMat.color.setHex(0xe88b54);
        sMat.size = 0.38;
      }
    }

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
      const candX = this.playerX + moveWorldX * speed * dt;
      const candZ = this.playerZ + moveWorldZ * speed * dt;

      const canMoveTo = (x: number, z: number): boolean => {
        if (!isWalkableWater(x, z, this.state.buildings)) return false;
        if (terrainSlopeAt(x, z) > 1.38) return false;
        if (Math.hypot(x, z) < 128 && this.staticObstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) {
          return false;
        }
        const pcx = Math.round(x / CHUNK_SIZE);
        const pcz = Math.round(z / CHUNK_SIZE);
        const ch = this.frontierChunks.get(`${pcx}_${pcz}`);
        if (ch && ch.obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.5)) {
          return false;
        }
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

    // Wind Updraft Vortex lift to Floating Sky Isles
    for (const up of this.skyUpdrafts) {
      if (
        t - this.lastUpdraftAt > 1.2 &&
        this.playerY < up.deckY - 1.5 &&
        Math.hypot(this.playerX - up.x, this.playerZ - up.z) < 2.6
      ) {
        this.playerVy = 16.8;
        this.isGrounded = false;
        this.lastUpdraftAt = t;
        this.sound.playSfx('updraft');
        this.toast('מערבולת רוח שיגרה אותך אל אי השמיים הצף!', 'secret');
        break;
      }
    }

    // Vertical gravity & terrain / bridge / sky platform snapping
    const terrainY = groundHeightAt(this.playerX, this.playerZ);
    const bridgeY = bridgeDeckHeightAt(this.playerX, this.playerZ, this.state.buildings);
    const skyY = skyPlatformHeightAt(this.playerX, this.playerZ);
    let floorY = bridgeY !== null ? Math.max(terrainY, bridgeY) : terrainY;
    if (skyY !== null && this.playerY >= skyY - 1.2) {
      floorY = Math.max(floorY, skyY);
    }

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

    // Zone & Sub-Biome arrival detection & achievement tracking
    const zId = detectZone(this.playerX, this.playerZ);
    if (!this.state.visitedZones.includes(zId)) {
      this.state.visitedZones.push(zId);
      this.evaluateAchievements(true);
    }
    const subId = detectSubBiome(this.playerX, this.playerZ);
    if (!this.state.visitedSubBiomes.includes(subId)) {
      this.state.visitedSubBiomes.push(subId);
      const sbMeta = SUB_BIOMES[subId];
      this.addJournal(`גילית מחוז ספר חדש: ${sbMeta.name} — ${sbMeta.desc}`, 'discovery');
      this.toast(`גילית תת-ביום חדש: ${sbMeta.name}!`, 'secret');
      this.evaluateAchievements(true);
    }
    this.lastSubBiomeId = subId;

    if (zId !== this.lastZoneId) {
      this.lastZoneId = zId;
      if (zId === 'cavern' && !this.state.cavernLit) {
        this.toast('הגעת לפתח מערת הגבישים. שדר פעימת תהודה (Q) או הצב פנס כדי להאיר בפנים.', 'info');
      } else if (zId === 'island') {
        this.toast('הגעת אל אי המפל החבוי!', 'secret');
      } else if (zId === 'ruins') {
        this.toast('נכנסת לשרידים השקועים — אווירה מסתורית ועמודי רונה עתיקים סביבך.', 'info');
      } else if (zId === 'forest') {
        this.toast('נכנסת ליער הערפל והנבגים — לחץ Q כדי לחשוף נבגים חבויים.', 'info');
      } else if (zId === 'frontier') {
        this.toast('חצית אל מרחבי הספר האינסופיים! תתי-ביומים, שערים ומטאורים ממתינים לך.', 'secret');
      }
    }
  }

  private triggerGameOver(reason: 'health' | 'collapse' | 'starvation' | 'hypothermia'): void {
    if (this.state.gameOver) return;
    const biomeName = BIOME_PRESETS[this.state.biomePreset].name;
    let title = 'הרוח בעמק כבתה';
    let message = 'רוחות הצל הכריעו אותך, אך זיכרון העמק עוד מהדהד וממתין לסיבוב נוסף.';
    if (reason === 'collapse') {
      title = 'העמק שקע בקמילה';
      message = 'נבגי הקמילה רוקנו את חיוניות העמק לחלוטין. עליך לפזר אותם בעזרת תהודה (Q) ובנייה מתואמת.';
    } else if (reason === 'starvation') {
      title = 'תשישות מרעב וצמא';
      message = 'נגמרו מאגרי האנרגיה והנוזלים בשטח. אסוף פריטים משתלבים (F) וצור ארוחות וחליטות בתיק (C).';
    } else if (reason === 'hypothermia') {
      title = 'קיפאון עמוק בעמק';
      message = 'הקור העונתי הכריע את חום גופך. חפש מדורות, מעיינות חמים, חליטות ג׳ינג׳ר או גלימת פרווה בחורף.';
    }
    this.state.gameOver = {
      reason,
      title,
      message,
      daysSurvived: this.state.day,
      blightPurified: this.state.blightPurified,
      vitality: this.computeVitality(),
      seedLabel: this.state.seedLabel,
      biomeLabel: biomeName,
    };
    this.walkTarget = null;
    this.walkWaypointMesh.visible = false;
    this.setBuildBlueprint(null);
    this.sound.playSfx('damage');
    this.persist();
    this.emitHud();
  }

  private updateThreatsAndHealth(dt: number, t: number): void {
    const { isNight, cycle } = this.getClockInfo(t);
    const { seasonId } = this.getSeasonInfo(this.state.day);
    const sMeta = SEASONS[seasonId];
    const subBiome = detectSubBiome(this.playerX, this.playerZ);
    const sbMeta = SUB_BIOMES[subBiome];

    const sanctuaries = this.state.buildings.filter(
      (b) => b.type === 'lantern' || b.type === 'resonance' || b.type === 'bench',
    );
    const inPlazaHearth = Math.hypot(this.playerX + 15, this.playerZ) < 15;
    const nearBench = sanctuaries.some(
      (b) => b.type === 'bench' && Math.hypot(this.playerX - b.x, this.playerZ - b.z) < 11,
    );
    const nearAnyLight =
      inPlazaHearth ||
      sanctuaries.some(
        (b) => Math.hypot(this.playerX - b.x, this.playerZ - b.z) < (b.type === 'resonance' ? 20 : 14),
      );
    const inThermalPool = isInThermalSpringPool(this.playerX, this.playerZ);
    const starBuffActive = t < (this.state.starBuffUntil || 0);

    // Ambient Temperature calculation (°C)
    const sunHeight = Math.sin(cycle * TAU);
    const nightChill = Math.max(0, -sunHeight) * sMeta.nightTempDropC;
    let tempC = sMeta.baseTempC + sbMeta.tempOffsetC - nightChill;
    if (this.state.climateEvent === 'blizzard') tempC -= 12;
    else if (this.state.climateEvent === 'sunbeam_bloom') tempC += 5;
    if (inThermalPool) tempC += 22;
    else if (nearBench || inPlazaHearth) tempC += 13;
    else if (nearAnyLight) tempC += 7;
    this.ambientTempC = Math.round(tempC);

    // Hunger, Thirst & Thermal Warmth Dynamics
    const sprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && this.state.stamina > 3;
    const buffMult = starBuffActive ? 0.42 : 1;
    this.state.hunger = Math.max(
      0,
      this.state.hunger - 0.36 * sMeta.hungerDrainMult * (sprinting ? 1.45 : 1) * buffMult * dt,
    );
    this.state.thirst = Math.max(
      0,
      this.state.thirst -
        0.46 * sMeta.thirstDrainMult * (sprinting ? 1.5 : 1) * (tempC > 25 ? 1.28 : 1) * buffMult * dt,
    );
    if (this.state.weather === 'rain' && seasonId !== 'winter') {
      this.state.thirst = Math.min(100, this.state.thirst + 1.2 * dt);
    }

    if (inThermalPool) {
      this.state.warmth = Math.min(100, this.state.warmth + 24 * dt);
      this.state.health = Math.min(100, this.state.health + 5.5 * dt);
    } else if (nearBench) {
      this.state.warmth = Math.min(100, this.state.warmth + 18 * dt);
    } else if (inPlazaHearth || nearAnyLight) {
      this.state.warmth = Math.min(100, this.state.warmth + 11 * dt);
    } else if (tempC < 8) {
      const chillRate = (8 - tempC) * (this.state.hasThermalCloak ? 0.08 : 0.19) * buffMult;
      this.state.warmth = Math.max(0, this.state.warmth - chillRate * dt);
    } else {
      this.state.warmth = Math.min(100, this.state.warmth + 4.5 * dt);
    }

    // Smart Auto-Survival Check before critical health loss
    this.tryAutoSurvival(t);

    // Low-survival periodic toast warning
    if (
      (this.state.hunger < 20 || this.state.thirst < 20 || this.state.warmth < 20) &&
      t - this.lastSurvivalWarnAt > 28
    ) {
      this.lastSurvivalWarnAt = t;
      if (this.state.warmth < 20) {
        this.toast('חום הגוף צונח! חפש מדורה, מעיין חם או פתח תיק (C) לחליטה חמה.', 'warn');
      } else if (this.state.thirst < 20) {
        this.toast('צמא מסוכן! שתה מהנחל או הכן משקה בתיק (C).', 'warn');
      } else {
        this.toast('רעב חמור! אסוף פריטים משתלבים (F) או הכן ארוחה בתיק (C).', 'warn');
      }
    }

    let deathCause: 'health' | 'starvation' | 'hypothermia' = 'health';

    if (this.state.hunger <= 0) {
      this.state.health = Math.max(0, this.state.health - 3.6 * dt);
      deathCause = 'starvation';
    }
    if (this.state.thirst <= 0) {
      this.state.health = Math.max(0, this.state.health - 4.2 * dt);
      deathCause = 'starvation';
    }
    if (this.state.warmth <= 0) {
      this.state.health = Math.max(0, this.state.health - 4.5 * dt);
      deathCause = 'hypothermia';
    }

    // Health regeneration in safe sanctuaries & Benches (when well-fed & warm)
    if (this.state.hunger > 20 && this.state.thirst > 20 && this.state.warmth > 20) {
      if (nearBench) {
        this.state.health = Math.min(100, this.state.health + 4.8 * dt);
      } else if (inPlazaHearth) {
        this.state.health = Math.min(100, this.state.health + 2.4 * dt);
      }
    }

    // Night freezing rain exposure outside lit shelter
    if (isNight && this.state.weather === 'rain' && !nearAnyLight) {
      this.state.health = Math.max(0, this.state.health - 1.5 * dt);
      if (t - this.lastExposureWarnAt > 26) {
        this.lastExposureWarnAt = t;
        this.toast('גשם לילי מקפיא! התקרב לפנס, ספסל או לכיכר הלב.', 'warn');
      }
    }

    // Blight Spore Aura DoT
    const shieldedByResonance = sanctuaries.some(
      (b) => b.type === 'resonance' && Math.hypot(this.playerX - b.x, this.playerZ - b.z) < 14,
    );
    for (const bn of this.blightNodes.values()) {
      if (bn.purified) continue;
      if (Math.hypot(this.playerX - bn.x, this.playerZ - bn.z) < bn.radius && !shieldedByResonance) {
        this.state.health = Math.max(0, this.state.health - 6.8 * dt);
      }
    }

    // Update patrolling & chasing Shadow Wisps
    for (let i = this.shadowWisps.length - 1; i >= 0; i--) {
      const w = this.shadowWisps[i];
      if (w.hp <= 0) {
        this.scene.remove(w.group);
        this.disposeObjectTree(w.group);
        this.shadowWisps.splice(i, 1);
        continue;
      }

      if (t < w.stunUntil) continue;

      // Placed Lanterns & Resonance Towers burn and repel nearby Shadow Wisps
      let burned = false;
      for (const s of sanctuaries) {
        if (s.type !== 'lantern' && s.type !== 'resonance') continue;
        const rLight = s.type === 'resonance' ? 18 : 13;
        const dLight = Math.hypot(w.x - s.x, w.z - s.z);
        if (dLight < rLight && dLight > 0.2) {
          w.hp -= 28 * dt;
          w.x += ((w.x - s.x) / dLight) * 6.0 * dt;
          w.z += ((w.z - s.z) / dLight) * 6.0 * dt;
          burned = true;
        }
      }
      if (burned && w.hp <= 0) {
        this.scene.remove(w.group);
        this.disposeObjectTree(w.group);
        this.shadowWisps.splice(i, 1);
        continue;
      }

      const dx = this.playerX - w.x;
      const dz = this.playerZ - w.z;
      const dPlayer = Math.hypot(dx, dz);

      const aggroRange = isNight ? 46 : 30;
      if (dPlayer < aggroRange && !inPlazaHearth) {
        const wSpeed = isNight ? 6.1 : 4.4;
        const nx = w.x + (dx / Math.max(0.01, dPlayer)) * wSpeed * dt;
        const nz = w.z + (dz / Math.max(0.01, dPlayer)) * wSpeed * dt;
        w.x = nx;
        w.z = nz;
        w.yaw = Math.atan2(dx, dz);
      } else {
        w.phase += dt * 0.9;
        w.x += Math.cos(w.phase) * 1.4 * dt;
        w.z += Math.sin(w.phase * 0.8) * 1.4 * dt;
        w.yaw = Math.atan2(Math.cos(w.phase), Math.sin(w.phase * 0.8));
      }

      if (dPlayer < 1.85 && t >= this.playerHitCooldownAt) {
        this.playerHitCooldownAt = t + 1.5;
        this.state.health = Math.max(0, this.state.health - (starBuffActive ? 10 : 18));
        this.sound.playSfx('damage');
        this.toast('רוח צל פגעה בך! הפעל תהודה (Q) כדי להדוף ולנפץ אותה!', 'warn');
        if (dPlayer > 0.1) {
          const kx = this.playerX + (dx / dPlayer) * 2.2;
          const kz = this.playerZ + (dz / dPlayer) * 2.2;
          if (isWalkableWater(kx, kz, this.state.buildings)) {
            this.playerX = kx;
            this.playerZ = kz;
          }
        }
      }
    }

    if (this.state.health <= 0) {
      this.triggerGameOver(deathCause);
    }
  }

  private updateNpcs(dt: number, t: number): void {
    const benches = this.state.buildings.filter((b) => b.type === 'bench');
    const cycleSin = Math.sin(((t % 300) / 300) * TAU);
    const isDayPatrol = cycleSin >= 0.08;
    const isEveningGather = cycleSin < 0.08 && cycleSin >= -0.25 && benches.length > 0;
    const hasMainBridge = this.state.buildings.some(
      (b) => b.type === 'bridge' && Math.hypot(b.x - MAIN_BRIDGE_POS.x, b.z - MAIN_BRIDGE_POS.z) < 14,
    );

    for (const npc of NPCS_BASE) {
      const entry = this.npcRigs.get(npc.id);
      const pState = this.npcPatrolStates.get(npc.id);
      if (!entry || !pState) continue;

      const route = NPC_PATROL_ROUTES[npc.id];
      let goalX = npc.homeX;
      let goalZ = npc.homeZ;
      let desiredActivity = pState.activity;

      const nearPlayer = Math.hypot(this.playerX - entry.x, this.playerZ - entry.z) < 3.6;

      if (this.focusNpcId === npc.id || (nearPlayer && !this.pausedForDialog)) {
        goalX = entry.x;
        goalZ = entry.z;
        desiredActivity = 'משוחח איתך';
        entry.yaw = Math.atan2(this.playerX - entry.x, this.playerZ - entry.z);
      } else if (isDayPatrol && route && route.length > 0) {
        const stop = route[pState.stopIdx % route.length];
        goalX = stop.x;
        goalZ = stop.z;
        const dStop = Math.hypot(goalX - entry.x, goalZ - entry.z);
        if (dStop <= 1.35) {
          pState.pauseTimer -= dt;
          desiredActivity = stop.activity;
          if (pState.pauseTimer <= 0) {
            pState.stopIdx = (pState.stopIdx + 1) % route.length;
            pState.pauseTimer = route[pState.stopIdx].pause;
            desiredActivity = 'בדרכו לתחנה הבאה';
          }
        } else {
          desiredActivity = stop.activity;
        }
      } else if (isEveningGather && benches.length > 0) {
        const b = benches[0];
        goalX = b.x + Math.cos(entry.phase) * 2.8;
        goalZ = b.z + Math.sin(entry.phase) * 2.8;
        desiredActivity = 'נח ליד מדורת המפגש';
      } else {
        goalX = npc.homeX;
        goalZ = npc.homeZ;
        desiredActivity = cycleSin < -0.25 ? 'שוהה בנקודה מוארת בלילה' : 'שב לכיכר';
      }

      pState.activity = desiredActivity;

      // Smart river crossing routing if waypoint lies across the river
      const myRiverX = riverCenterX(entry.z);
      const goalRiverX = riverCenterX(goalZ);
      const crossesRiver =
        (entry.x < myRiverX - 5 && goalX > goalRiverX + 5) ||
        (entry.x > myRiverX + 5 && goalX < goalRiverX - 5);
      let moveTargetX = goalX;
      let moveTargetZ = goalZ;
      if (crossesRiver && Math.hypot(goalX - entry.x, goalZ - entry.z) > 10) {
        if (hasMainBridge) {
          moveTargetX = MAIN_BRIDGE_POS.x;
          moveTargetZ = MAIN_BRIDGE_POS.z;
        } else {
          moveTargetX = riverCenterX(FORD_Z);
          moveTargetZ = FORD_Z;
        }
      }

      const dx = moveTargetX - entry.x;
      const dz = moveTargetZ - entry.z;
      const dist = Math.hypot(dx, dz);
      let walking = false;

      if (dist > 1.25 && desiredActivity !== 'משוחח איתך') {
        const step = Math.min(dist, 3.4 * dt);
        const nx = entry.x + (dx / dist) * step;
        const nz = entry.z + (dz / dist) * step;
        if (isWalkableWater(nx, nz, this.state.buildings)) {
          entry.x = nx;
          entry.z = nz;
          entry.yaw = Math.atan2(dx, dz);
          walking = true;
        } else if (isWalkableWater(entry.x, nz, this.state.buildings)) {
          entry.z = nz;
          entry.yaw = Math.atan2(0, dz);
          walking = true;
        }
      }

      const ny = bridgeDeckHeightAt(entry.x, entry.z, this.state.buildings) ?? groundHeightAt(entry.x, entry.z);
      entry.rig.group.position.set(entry.x, ny, entry.z);
      entry.rig.group.rotation.y = entry.yaw;

      const s = walking ? Math.sin(t * 7 + entry.phase) * 0.42 : 0;
      entry.rig.leftLeg.rotation.x = s;
      entry.rig.rightLeg.rotation.x = -s;
      entry.rig.leftArm.rotation.x = -s * 0.6;
      entry.rig.rightArm.rotation.x = s * 0.6;
      entry.rig.bodyGroup.position.y = walking
        ? Math.abs(Math.sin(t * 7 + entry.phase)) * 0.06
        : Math.sin(t * 1.8 + entry.phase) * 0.025;
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

    // Pulse wave expansion & custom shader overlay updates
    if (this.pulseActive) {
      this.pulseAge += dt;
      this.pulseUniforms.uTime.value = this.pulseAge;
      const dur = 2.4;
      if (this.pulseAge >= dur) {
        this.pulseActive = false;
        this.pulseUniforms.uTime.value = -1;
        this.pulseRing.visible = false;
        this.pulseDome.visible = false;
      } else {
        const radius = 1 + this.pulseAge * 24;
        this.pulseRing.scale.setScalar(radius);
        (this.pulseRing.material as THREE.ShaderMaterial).uniforms.uAge.value = this.pulseAge;
        this.pulseDome.scale.setScalar(radius);
        (this.pulseDome.material as THREE.ShaderMaterial).uniforms.uAge.value = this.pulseAge;
      }
    }

    // Update custom Fresnel/scanline highlight overlays on interactives & secrets
    for (const h of this.pulseHighlights) {
      if (h.endAt > t && t >= h.startAt && h.isEligible()) {
        const fadeIn = Math.min(1, (t - h.startAt) / 0.35);
        const fadeOut = Math.min(1, (h.endAt - t) / 1.4);
        h.group.visible = true;
        h.mat.uniforms.uTime.value = t;
        h.mat.uniforms.uIntensity.value = fadeIn * fadeOut;
      } else if (h.group.visible) {
        h.group.visible = false;
      }
    }
    for (const bh of this.buildingHighlights) {
      if (bh.endAt > t && t >= bh.startAt) {
        const fadeIn = Math.min(1, (t - bh.startAt) / 0.35);
        const fadeOut = Math.min(1, (bh.endAt - t) / 1.4);
        bh.group.visible = true;
        bh.mat.uniforms.uTime.value = t;
        bh.mat.uniforms.uIntensity.value = fadeIn * fadeOut * 0.85;
      } else if (bh.group.visible) {
        bh.group.visible = false;
      }
    }

    // Animate wildlife (deer + agile spirit foxes)
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

    for (const fox of this.foxList) {
      fox.phase += dt * 0.65;
      const nx = fox.x + Math.cos(fox.phase) * 5.2;
      const nz = fox.z + Math.sin(fox.phase * 1.3) * 4.4;
      const fy = groundHeightAt(nx, nz);
      fox.group.visible = fy > WATER_LEVEL + 0.05;
      if (!fox.group.visible) continue;
      const vx = -Math.sin(fox.phase) * 5.2;
      const vz = Math.cos(fox.phase * 1.3) * 4.4 * 1.3;
      fox.group.position.set(nx, fy, nz);
      fox.group.rotation.y = Math.atan2(vx, vz);
    }

    // Bob & magnetic auto-collect proximity combinable items
    for (let i = this.proximityItems.length - 1; i >= 0; i--) {
      const p = this.proximityItems[i];
      p.mesh.rotation.y += dt * 1.1;
      p.mesh.position.y = p.node.y + Math.sin(t * 2.6 + p.node.x) * 0.08;
      if (
        !this.pausedForDialog &&
        !this.state.gameOver &&
        Math.hypot(p.node.x - this.playerX, p.node.z - this.playerZ) < 1.85 &&
        Math.abs(p.node.y - this.playerY) < 2.4
      ) {
        this.collectProximityItemAt(i);
      }
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

    // Seasonal Snow / Falling Leaves / Magic Spores around player
    if (this.snowPoints?.visible) {
      const sPos = this.snowPoints.geometry.attributes.position as THREE.BufferAttribute;
      const blizzardFactor = this.state.climateEvent === 'blizzard' ? 2.1 : 1.0;
      for (let i = 0; i < sPos.count; i++) {
        let sx = sPos.getX(i) + Math.sin(t * 1.4 + i) * 0.9 * blizzardFactor * dt;
        let sy = sPos.getY(i) - 3.6 * blizzardFactor * dt;
        let sz = sPos.getZ(i) + Math.cos(t * 1.1 + i) * 0.7 * blizzardFactor * dt;
        if (sy < 0 || Math.abs(sx - this.playerX) > 48 || Math.abs(sz - this.playerZ) > 48) {
          sx = this.playerX + (Math.random() - 0.5) * 84;
          sy = 25 + Math.random() * 6;
          sz = this.playerZ + (Math.random() - 0.5) * 84;
        }
        sPos.setXYZ(i, sx, sy, sz);
      }
      sPos.needsUpdate = true;
    }

    // Meteor Shower Spawns & Falling Meteor Impacts
    if (this.state.climateEvent === 'meteor_shower' && t >= this.nextMeteorAt) {
      this.nextMeteorAt = t + 3.4 + Math.random() * 2.4;
      this.spawnMeteor();
    }
    for (let i = this.fallingMeteors.length - 1; i >= 0; i--) {
      const m = this.fallingMeteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      m.mesh.position.set(m.x, m.y, m.z);
      const impactY = groundHeightAt(m.targetX, m.targetZ);
      if (m.y <= impactY + 0.4) {
        this.scene.remove(m.mesh);
        this.disposeObjectTree(m.mesh);
        this.fallingMeteors.splice(i, 1);

        const shardMesh = createForageItemMesh('star_shard');
        shardMesh.position.set(m.targetX, impactY, m.targetZ);
        this.scene.add(shardMesh);
        this.proximityItems.push({
          node: {
            id: `meteor_${Date.now()}_${i}`,
            itemId: 'star_shard',
            x: m.targetX,
            y: impactY,
            z: m.targetZ,
            isMeteorDrop: true,
          },
          mesh: shardMesh,
        });
        this.sound.playSfx('meteor');
        this.toast('מטאור נחת בקרבתך והשאיר שבר כוכבים זוהר!', 'secret');
      }
    }

    // Waypoint spin
    if (this.walkWaypointMesh.visible) {
      this.walkWaypointMesh.scale.setScalar(1 + Math.sin(t * 6) * 0.14);
    }

    // Animate active Shadow Wisps & Blight orbs
    for (const w of this.shadowWisps) {
      const groundY = groundHeightAt(w.x, w.z);
      const bob = Math.sin(t * 3.4 + w.phase) * 0.25;
      w.group.position.set(w.x, groundY + bob, w.z);
      w.group.rotation.y = w.yaw;
      const orbit = w.group.userData.orbit as THREE.Group | undefined;
      if (orbit) orbit.rotation.y += dt * (t < w.stunUntil ? 0.6 : 3.2);
    }

    for (const bn of this.blightNodes.values()) {
      const orb = bn.group.userData.orb as THREE.Mesh | undefined;
      if (orb) {
        orb.rotation.y = t * (bn.purified ? 0.6 : 1.8);
        orb.position.y = 2.0 + Math.sin(t * 2.5 + bn.x) * 0.16;
      }
    }

    // Drift 3D clouds smoothly overhead relative to player
    for (const ch of this.cloudGroup.children) {
      const base = ch.userData.baseOffset as THREE.Vector3 | undefined;
      const spd = (ch.userData.speed as number) || 1.5;
      if (base) {
        const wx = ((base.x + t * spd + 200) % 400) - 200 + this.playerX;
        const wz = ((base.z + t * spd * 0.25 + 200) % 400) - 200 + this.playerZ;
        ch.position.set(wx, base.y, wz);
      }
    }

    // Swirl waterfall splash mist plume
    if (this.waterfallMistPoints) {
      const mPos = this.waterfallMistPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < mPos.count; i++) {
        let my = mPos.getY(i) + 1.45 * dt;
        if (my > WATER_LEVEL + 3.2) {
          my = WATER_LEVEL + 0.1;
          mPos.setX(i, 71.5 + (Math.random() - 0.5) * 4.5);
          mPos.setZ(i, 45.2 + (Math.random() - 0.5) * 4.5);
        }
        mPos.setY(i, my);
      }
      mPos.needsUpdate = true;
    }

    // Wrap fireflies subtly around player for endless world ambience
    if (this.firefliesPoints) {
      const fPos = this.firefliesPoints.geometry.attributes.position as THREE.BufferAttribute;
      let fDirty = false;
      for (let i = 0; i < fPos.count; i++) {
        const fx = fPos.getX(i);
        const fz = fPos.getZ(i);
        if (Math.abs(fx - this.playerX) > 95 || Math.abs(fz - this.playerZ) > 95) {
          const nx = this.playerX + (Math.random() - 0.5) * 140;
          const nz = this.playerZ + (Math.random() - 0.5) * 140;
          fPos.setXYZ(i, nx, groundHeightAt(nx, nz) + 1.1 + Math.random() * 2.5, nz);
          fDirty = true;
        }
      }
      if (fDirty) fPos.needsUpdate = true;
    }

    // Update terrain vertex hydration / blight / seasonal coloration if needed
    if (this.terrainNeedsColorUpdate) {
      this.updateTerrainVitalityColors();
    }
  }

  private updateBuildGhost(): void {
    if (!this.activeBlueprint || !this.ghostGroup) return;

    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.getTerrainRaycastTargets(), false);
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

    // Spawn Shadow Wisps from nearby unpurified Blight Nests
    const { isNight } = this.getClockInfo(this.state.simTime);
    const biomeRate = BIOME_PRESETS[this.state.biomePreset].blightRate;
    const maxWisps = isNight ? 6 : 3;
    this.wispSpawnTimer += dt * (isNight ? 1.5 : 0.7) * biomeRate;
    if (this.wispSpawnTimer >= 9.5 && this.shadowWisps.length < maxWisps) {
      this.wispSpawnTimer = 0;
      const nearbyBlights = Array.from(this.blightNodes.values()).filter(
        (bn) => !bn.purified && Math.hypot(bn.x - this.playerX, bn.z - this.playerZ) < 95,
      );
      if (nearbyBlights.length > 0) {
        const src = nearbyBlights[Math.floor(Math.random() * nearbyBlights.length)];
        const angle = Math.random() * TAU;
        const wx = src.x + Math.cos(angle) * 4.5;
        const wz = src.z + Math.sin(angle) * 4.5;
        const grp = createShadowWispGroup();
        grp.position.set(wx, groundHeightAt(wx, wz), wz);
        this.scene.add(grp);
        this.shadowWisps.push({
          id: `wisp_${Date.now()}_${Math.random().toString(16).slice(2, 5)}`,
          x: wx,
          z: wz,
          yaw: Math.random() * TAU,
          hp: 100,
          maxHp: 100,
          stunUntil: 0,
          homeNodeId: src.id,
          phase: Math.random() * TAU,
          group: grp,
        });
        changed = true;
      }
    }

    // Valley Ecosystem Collapse Countdown when vitality hits 0% under active blight
    const activeBlightCount = Array.from(this.blightNodes.values()).filter((bn) => !bn.purified).length;
    const vitality = this.computeVitality();
    if (vitality <= 0 && activeBlightCount > 0) {
      this.state.collapseTimer += dt;
      if (this.state.collapseTimer >= 30) {
        this.triggerGameOver('collapse');
      }
      changed = true;
    } else if (this.state.collapseTimer > 0) {
      this.state.collapseTimer = Math.max(0, this.state.collapseTimer - dt * 1.5);
      changed = true;
    }

    // Stream continuous combinable forage clusters around the player
    this.stepProximityItems(false);

    if (changed) {
      this.evaluateAchievements(true);
      this.emitHud();
    }
  }

  private getAchievementMetric(id: string): number {
    switch (id) {
      case 'ach_first_spark':
      case 'ach_build_streak':
        return this.state.buildings.length;
      case 'ach_synergy_weaver':
        return this.computeSynergies().length;
      case 'ach_master_architect':
        return this.state.buildings.filter((b) => b.tier >= 3).length;
      case 'ach_pulse_seeker':
        return this.state.pulsesTriggered;
      case 'ach_cavern_light':
        return this.state.cavernLit ? 1 : 0;
      case 'ach_ruins_awakener':
        return this.state.ruinPillars.filter(Boolean).length;
      case 'ach_all_secrets':
        return this.state.discoveredSecrets.length;
      case 'ach_world_wanderer':
        return this.state.visitedZones.length;
      case 'ach_kindred_spirits':
        return this.state.completedQuests.length;
      case 'ach_community_builder':
        return COMMUNITY_PROJECTS_DATA.filter(
          (p) => (this.state.communityProjects[p.id] || 0) >= p.maxStages,
        ).length;
      case 'ach_valley_bloom':
        return this.computeVitality();
      case 'ach_master_chef':
        return this.state.recipesCraftedCount || 0;
      case 'ach_winter_survivor':
        return this.state.day;
      case 'ach_biome_explorer':
        return this.state.visitedSubBiomes.filter((sb) => sb !== 'valley_core').length;
      case 'ach_portal_weaver':
        return this.state.discoveredPortals.length;
      default:
        return 0;
    }
  }

  private getAchievementStates(): AchievementState[] {
    return ACHIEVEMENTS.map((def) => {
      const unlockedDay = this.state.unlockedAchievements[def.id];
      const metric = this.getAchievementMetric(def.id);
      const unlocked = unlockedDay !== undefined || metric >= def.target;
      return {
        id: def.id,
        unlocked,
        unlockedDay,
        current: Math.min(def.target, metric),
        target: def.target,
      };
    });
  }

  private evaluateAchievements(notify = true): void {
    let anyNew = false;
    for (const def of ACHIEVEMENTS) {
      if (this.state.unlockedAchievements[def.id] !== undefined) continue;
      const metric = this.getAchievementMetric(def.id);
      if (metric >= def.target) {
        this.state.unlockedAchievements[def.id] = this.state.day;
        anyNew = true;
        if (def.reward) {
          for (const [k, v] of Object.entries(def.reward)) {
            const rk = k as ResourceType;
            this.state.inv[rk] = (this.state.inv[rk] || 0) + (v || 0);
          }
        }
        if (notify) {
          this.sound.playSfx('complete');
          this.addJournal(`הישג נפתח: ${def.title} — ${def.desc}`, 'discovery');
          this.toast(`הישג חדש נפתח: ${def.title}!`, 'secret');
        }
      }
    }
    if (anyNew) {
      this.persist();
    }
  }

  private emitHud(): void {
    const zId = detectZone(this.playerX, this.playerZ);
    const zMeta = ZONES[zId];
    const biomeMeta = BIOME_PRESETS[this.state.biomePreset];
    const { cycle, clockLabel, timeOfDayLabel, isNight } = this.getClockInfo(this.state.simTime);
    const weatherLabels: Record<WeatherType, string> = {
      clear: 'שמיים צלולים',
      breeze: 'רוח עמק קלה',
      mist: 'ערפל עדין',
      rain: 'גשם מרווה',
    };

    const vitality = this.computeVitality();
    const activeBlightCount = Array.from(this.blightNodes.values()).filter((bn) => !bn.purified).length;
    const activeWispsCount = this.shadowWisps.length;
    const threatLevel = Math.min(
      100,
      Math.round(activeBlightCount * 14 + activeWispsCount * 15 + (isNight ? 18 : 0)),
    );
    const collapseCountdown =
      vitality <= 0 && activeBlightCount > 0 && this.state.collapseTimer > 0
        ? Math.max(0, Math.ceil(30 - this.state.collapseTimer))
        : null;

    const npcPositions = {} as Record<NpcId, { x: number; z: number; activity: string }>;
    for (const npc of NPCS_BASE) {
      const rig = this.npcRigs.get(npc.id);
      const pSt = this.npcPatrolStates.get(npc.id);
      npcPositions[npc.id] = {
        x: rig?.x ?? npc.homeX,
        z: rig?.z ?? npc.homeZ,
        activity: pSt?.activity || 'מסייר בעמק',
      };
    }

    const { seasonId, dayInSeason, year } = this.getSeasonInfo(this.state.day);
    const seasonMeta = SEASONS[seasonId];
    const subBiomeId = detectSubBiome(this.playerX, this.playerZ);
    const subBiomeMeta = SUB_BIOMES[subBiomeId];
    const climateMeta = CLIMATE_EVENT_LABELS[this.state.climateEvent || 'none'];

    this.callbacks.onHudUpdate({
      inv: { ...this.state.inv },
      craftInv: { ...this.state.craftInv },
      autoSurvivalEnabled: this.state.autoSurvivalEnabled,
      hasThermalCloak: this.state.hasThermalCloak,
      starBuffActive: this.state.simTime < (this.state.starBuffUntil || 0),
      zoneId: zId,
      zoneName: zMeta.name,
      zoneSubtitle: zMeta.subtitle,
      subBiomeId,
      subBiomeName: subBiomeMeta.name,
      subBiomeDesc: subBiomeMeta.desc,
      seasonId,
      seasonName: seasonMeta.name,
      seasonColor: seasonMeta.color,
      dayInSeason,
      seasonLengthDays: SEASON_LENGTH_DAYS,
      year,
      ambientTempC: this.ambientTempC,
      climateEvent: this.state.climateEvent || 'none',
      climateEventLabel: climateMeta?.name || '',
      day: this.state.day,
      timeOfDayLabel,
      clockLabel,
      dayProgress: cycle,
      isNight,
      weather: this.state.weather,
      weatherLabel: weatherLabels[this.state.weather],
      vitality,
      health: Math.round(this.state.health),
      hunger: Math.round(this.state.hunger),
      thirst: Math.round(this.state.thirst),
      warmth: Math.round(this.state.warmth),
      stamina: Math.round(this.state.stamina),
      threatLevel,
      activeBlightCount,
      activeWispsCount,
      blightPurified: this.state.blightPurified,
      collapseCountdown,
      worldSeed: this.state.worldSeed,
      seedLabel: this.state.seedLabel,
      biomePreset: this.state.biomePreset,
      biomeLabel: biomeMeta.name,
      distanceFromOrigin: Math.round(Math.hypot(this.playerX, this.playerZ)),
      isNightThreat: isNight && (activeBlightCount > 0 || activeWispsCount > 0),
      gameOver: this.state.gameOver,
      pulseCooldown: Math.max(0, Math.min(1, (this.pulseCooldownAt - this.state.simTime) / 6)),
      synergies: this.computeSynergies(),
      npcNeeds: this.computeNpcNeeds(),
      npcPositions,
      npcMemories: this.state.npcMemories,
      buildings: [...this.state.buildings],
      discoveredPortals: [...this.state.discoveredPortals],
      completedQuests: [...this.state.completedQuests],
      promises: [...this.state.promises],
      discoveredSecrets: [...this.state.discoveredSecrets],
      ruinPillars: [...this.state.ruinPillars],
      cavernLit: this.state.cavernLit,
      communityProjects: { ...this.state.communityProjects },
      achievements: this.getAchievementStates(),
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

    for (const chunk of this.frontierChunks.values()) {
      this.disposeObjectTree(chunk.group);
    }
    this.frontierChunks.clear();
    for (const lm of this.landmarkMeshes.values()) {
      this.disposeObjectTree(lm);
    }
    this.landmarkMeshes.clear();
    for (const p of this.proximityItems) {
      this.disposeObjectTree(p.mesh);
    }
    this.proximityItems = [];
    for (const m of this.fallingMeteors) {
      this.disposeObjectTree(m.mesh);
    }
    this.fallingMeteors = [];
    for (const bn of this.blightNodes.values()) {
      this.disposeObjectTree(bn.group);
    }
    this.blightNodes.clear();
    for (const w of this.shadowWisps) {
      this.disposeObjectTree(w.group);
    }
    this.shadowWisps = [];
    this.disposeObjectTree(this.staticPropsGroup);
    this.disposeObjectTree(this.cloudGroup);
    this.composer?.dispose();

    this.sound.dispose();
    this.tex.dispose();
    this.renderer.dispose();
  }
}
