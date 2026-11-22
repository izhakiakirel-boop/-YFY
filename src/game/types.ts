export type ResourceType = 'wood' | 'glow' | 'water' | 'rune' | 'seed';

export type BlueprintId =
  | 'bridge'
  | 'lantern'
  | 'irrigator'
  | 'raincatcher'
  | 'bench'
  | 'resonance';

export type WeatherType = 'clear' | 'breeze' | 'mist' | 'rain';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export type ClimateEventType =
  | 'none'
  | 'meteor_shower'
  | 'magic_fog'
  | 'blizzard'
  | 'sunbeam_bloom'
  | 'leaf_gust';

export type SubBiomeId =
  | 'valley_core'
  | 'bloom_meadow'
  | 'crystal_canyon'
  | 'sky_isles'
  | 'mushroom_grove'
  | 'thermal_springs'
  | 'obsidian_crags';

export type LandmarkKind = 'ancient_temple' | 'stone_circle' | 'portal';

export type CraftItemId =
  // Raw proximity-spawned combinable items
  | 'berry'
  | 'mushroom'
  | 'herb'
  | 'spice_root'
  | 'dew_flask'
  | 'honey_sap'
  | 'ember_stone'
  | 'frost_crystal'
  | 'cloth_fiber'
  | 'star_shard'
  // Crafted consumables & gear
  | 'trail_jam'
  | 'berry_skewer'
  | 'spiced_tea'
  | 'mint_cooler'
  | 'frost_nectar'
  | 'hearth_stew'
  | 'healing_salve'
  | 'thermal_cloak'
  | 'star_elixir';

export type ZoneId =
  | 'plaza'
  | 'river'
  | 'forest'
  | 'cavern'
  | 'ruins'
  | 'terrace'
  | 'island'
  | 'frontier';

export type BiomePresetId = 'verdant' | 'arid_winds' | 'mystic_night' | 'archipelago';

export interface BiomePresetMeta {
  id: BiomePresetId;
  name: string;
  desc: string;
  accentColor: string;
  grassHex: number;
  forestHex: number;
  rockHex: number;
  skyTintHex: number;
  waterHex: number;
  riverAmpScale: number;
  hillScale: number;
  blightRate: number;
}

export interface SeasonMeta {
  id: SeasonId;
  name: string;
  subtitle: string;
  color: string;
  baseTempC: number;
  nightTempDropC: number;
  grassTintHex: number;
  foliageTintHex: number;
  skyTintHex: number;
  snowLevel: number; // 0..1
  hungerDrainMult: number;
  thirstDrainMult: number;
  forageDensityMult: number;
}

export interface CraftItemMeta {
  id: CraftItemId;
  name: string;
  desc: string;
  color: string;
  hex: number;
  kind: 'raw' | 'food' | 'drink' | 'medicine' | 'gear';
  hungerGain?: number;
  thirstGain?: number;
  warmthGain?: number;
  healthGain?: number;
  staminaGain?: number;
}

export interface CraftRecipe {
  id: string;
  outputId: CraftItemId | 'rune_transmute';
  name: string;
  desc: string;
  category: 'food' | 'drink' | 'warmth' | 'relic';
  ingredients: Partial<Record<CraftItemId, number>>;
  resourceBonus?: Partial<ResourceInventory>;
  grantBuffSeconds?: number;
}

export interface WorldSeedConfig {
  seed: number;
  seedLabel: string;
  biome: BiomePresetId;
  keepAchievements?: boolean;
}

export interface BlightNodeState {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  purified: boolean;
  radius: number;
  chunkKey?: string;
}

export interface LandmarkRecord {
  id: string;
  kind: LandmarkKind;
  name: string;
  subBiome: SubBiomeId;
  x: number;
  z: number;
  activated: boolean;
  chunkKey?: string;
}

export interface PortalDestination {
  id: string;
  name: string;
  subBiome: SubBiomeId;
  x: number;
  z: number;
}

export interface ProximityItemNode {
  id: string;
  itemId: CraftItemId;
  x: number;
  y: number;
  z: number;
  isMeteorDrop?: boolean;
}

export interface GameOverState {
  reason: 'health' | 'collapse' | 'starvation' | 'hypothermia';
  title: string;
  message: string;
  daysSurvived: number;
  blightPurified: number;
  vitality: number;
  seedLabel: string;
  biomeLabel: string;
}

export type NpcId = 'noa' | 'mika' | 'tali' | 'oren';

export type ResourceInventory = Record<ResourceType, number>;
export type CraftInventory = Record<CraftItemId, number>;

export interface PlacedBuilding {
  id: string;
  type: BlueprintId;
  x: number;
  z: number;
  rot: number;
  tier: 1 | 2 | 3;
  growth: number; // 0..1 ecosystem bloom progress (especially for irrigator/terrace)
  energy: number; // 0..1 powered state from wind/resonance
  waterSupply: number; // 0..1 hydration level
  placedAt: number;
  note: string;
}

export interface SynergyLink {
  key: string;
  label: string;
  desc: string;
  fromId: string;
  toId: string;
  color: string;
}

export interface PromiseRecord {
  id: string;
  npc: NpcId;
  questId: string;
  title: string;
  status: 'active' | 'overdue' | 'done' | 'done_late' | 'released';
  dueAt: number;
  createdAt: number;
  renegotiations: number;
}

export interface NpcMemory {
  met: boolean;
  trust: number; // 0..5
  mood: number; // 0..100
  conversations: number;
  promisesKept: number;
  promisesRenegotiated: number;
  giftsAligned: number;
  secretsShared: string[];
  lastChoiceTone: 'empathy' | 'curious' | 'practical' | null;
  rememberedEvents: string[];
}

export interface NpcNeedState {
  key: string;
  label: string;
  satisfied: boolean;
  urgency: number;
  focusX: number;
  focusZ: number;
}

export interface SecretDiscovery {
  id: string;
  title: string;
  zone: ZoneId;
  x: number;
  z: number;
  lore: string;
  reward: Partial<ResourceInventory>;
  discovered: boolean;
}

export interface CommunityProjectState {
  id: string;
  title: string;
  desc: string;
  stage: number; // 0..3 (3 = complete)
  maxStages: number;
  x: number;
  z: number;
  requirements: Array<{
    label: string;
    cost: Partial<ResourceInventory>;
    minVitality?: number;
  }>;
}

export interface JournalEntry {
  id: string;
  text: string;
  kind: 'discovery' | 'build' | 'bond' | 'promise' | 'project' | 'survival';
  day: number;
}

export interface RealActionPlan {
  action: string;
  when: string;
  ifThen: string;
  status: 'planned' | 'done' | 'later';
  createdAt: number;
}

export interface WorldResourceNode {
  id: string;
  type: ResourceType;
  x: number;
  z: number;
  active: boolean;
  respawnAt: number;
  hiddenUntilPulse?: boolean;
  revealedUntil?: number;
  chunkKey?: string;
}

export interface RuinPillarState {
  id: string;
  x: number;
  z: number;
  activated: boolean;
}

export type AchievementCategory = 'explore' | 'build' | 'bond' | 'mastery';

export interface AchievementDefinition {
  id: string;
  title: string;
  desc: string;
  category: AchievementCategory;
  categoryLabel: string;
  target: number;
  reward?: Partial<ResourceInventory>;
}

export interface AchievementState {
  id: string;
  unlocked: boolean;
  unlockedDay?: number;
  current: number;
  target: number;
}

export interface GameState {
  worldSeed: number;
  seedLabel: string;
  biomePreset: BiomePresetId;
  inv: ResourceInventory;
  craftInv: CraftInventory;
  autoSurvivalEnabled: boolean;
  hasThermalCloak: boolean;
  starBuffUntil: number;
  hunger: number; // 0..100
  thirst: number; // 0..100
  warmth: number; // 0..100
  completedQuests: string[];
  promises: PromiseRecord[];
  npcMemories: Record<NpcId, NpcMemory>;
  buildings: PlacedBuilding[];
  discoveredSecrets: string[];
  discoveredPortals: PortalDestination[];
  activatedLandmarks: string[];
  visitedSubBiomes: SubBiomeId[];
  recipesCraftedCount: number;
  meteorsHarvested: number;
  ruinPillars: boolean[];
  cavernLit: boolean;
  communityProjects: Record<string, number>; // projectId -> stage (0..3)
  unlockedAchievements: Record<string, number>; // achievementId -> day unlocked
  visitedZones: ZoneId[];
  pulsesTriggered: number;
  purifiedBlightIds: string[];
  blightPurified: number;
  health: number; // 0..100
  collapseTimer: number; // 0..30s emergency countdown when vitality <= 0 under blight
  gameOver: GameOverState | null;
  journal: JournalEntry[];
  realPlan: RealActionPlan | null;
  realDoneCount: number;
  simTime: number;
  day: number;
  weather: WeatherType;
  climateEvent: ClimateEventType;
  climateEventEndsAt: number;
  playerPos: { x: number; z: number };
  stamina: number;
  tutorialSeen: boolean;
}

export interface NearbyPrompt {
  kind:
    | 'npc'
    | 'resource'
    | 'forage'
    | 'building'
    | 'secret'
    | 'pillar'
    | 'project'
    | 'blight'
    | 'landmark'
    | 'portal'
    | 'water_drink';
  id: string;
  title: string;
  subtitle: string;
  keyHint: string;
}

export interface HudSnapshot {
  inv: ResourceInventory;
  craftInv: CraftInventory;
  autoSurvivalEnabled: boolean;
  hasThermalCloak: boolean;
  starBuffActive: boolean;
  zoneId: ZoneId;
  zoneName: string;
  zoneSubtitle: string;
  subBiomeId: SubBiomeId;
  subBiomeName: string;
  subBiomeDesc: string;
  seasonId: SeasonId;
  seasonName: string;
  seasonColor: string;
  dayInSeason: number; // 1..5
  seasonLengthDays: number; // 5
  year: number;
  ambientTempC: number;
  climateEvent: ClimateEventType;
  climateEventLabel: string;
  day: number;
  timeOfDayLabel: string;
  clockLabel: string;
  dayProgress: number; // 0..1
  isNight: boolean;
  weather: WeatherType;
  weatherLabel: string;
  vitality: number; // 0..100 valley ecosystem score
  health: number; // 0..100 player survival HP
  hunger: number; // 0..100
  thirst: number; // 0..100
  warmth: number; // 0..100 thermal comfort
  stamina: number; // 0..100
  threatLevel: number; // 0..100 active blight/night threat
  activeBlightCount: number;
  activeWispsCount: number;
  blightPurified: number;
  collapseCountdown: number | null;
  worldSeed: number;
  seedLabel: string;
  biomePreset: BiomePresetId;
  biomeLabel: string;
  distanceFromOrigin: number;
  isNightThreat: boolean;
  gameOver: GameOverState | null;
  pulseCooldown: number; // 0..1 (0 = ready)
  synergies: SynergyLink[];
  npcNeeds: Record<NpcId, NpcNeedState>;
  npcPositions: Record<NpcId, { x: number; z: number; activity: string }>;
  npcMemories: Record<NpcId, NpcMemory>;
  buildings: PlacedBuilding[];
  discoveredPortals: PortalDestination[];
  completedQuests: string[];
  promises: PromiseRecord[];
  discoveredSecrets: string[];
  ruinPillars: boolean[];
  cavernLit: boolean;
  communityProjects: Record<string, number>;
  achievements: AchievementState[];
  journal: JournalEntry[];
  realPlan: RealActionPlan | null;
  nearby: NearbyPrompt | null;
  playerPos: { x: number; z: number };
  playerYaw: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'secret';
}

export interface AudioMixSettings {
  muted: boolean;
  musicVolume: number; // 0..1
  ambienceVolume: number; // 0..1
}
