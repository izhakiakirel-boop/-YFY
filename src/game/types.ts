export type ResourceType = 'wood' | 'glow' | 'water' | 'rune' | 'seed';

export type BlueprintId =
  | 'bridge'
  | 'lantern'
  | 'irrigator'
  | 'raincatcher'
  | 'bench'
  | 'resonance';

export type WeatherType = 'clear' | 'breeze' | 'mist' | 'rain';

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

export interface GameOverState {
  reason: 'health' | 'collapse';
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
  kind: 'discovery' | 'build' | 'bond' | 'promise' | 'project';
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
  completedQuests: string[];
  promises: PromiseRecord[];
  npcMemories: Record<NpcId, NpcMemory>;
  buildings: PlacedBuilding[];
  discoveredSecrets: string[];
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
  playerPos: { x: number; z: number };
  stamina: number;
  tutorialSeen: boolean;
}

export interface NearbyPrompt {
  kind: 'npc' | 'resource' | 'building' | 'secret' | 'pillar' | 'project' | 'blight';
  id: string;
  title: string;
  subtitle: string;
  keyHint: string;
}

export interface HudSnapshot {
  inv: ResourceInventory;
  zoneId: ZoneId;
  zoneName: string;
  zoneSubtitle: string;
  day: number;
  timeOfDayLabel: string;
  clockLabel: string;
  dayProgress: number; // 0..1
  isNight: boolean;
  weather: WeatherType;
  weatherLabel: string;
  vitality: number; // 0..100 valley ecosystem score
  health: number; // 0..100 player survival HP
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

