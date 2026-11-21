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
  | 'island';

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
}

export interface RuinPillarState {
  id: string;
  x: number;
  z: number;
  activated: boolean;
}

export interface GameState {
  inv: ResourceInventory;
  completedQuests: string[];
  promises: PromiseRecord[];
  npcMemories: Record<NpcId, NpcMemory>;
  buildings: PlacedBuilding[];
  discoveredSecrets: string[];
  ruinPillars: boolean[];
  cavernLit: boolean;
  communityProjects: Record<string, number>; // projectId -> stage (0..3)
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
  kind: 'npc' | 'resource' | 'building' | 'secret' | 'pillar' | 'project';
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
  stamina: number; // 0..100
  pulseCooldown: number; // 0..1 (0 = ready)
  synergies: SynergyLink[];
  npcNeeds: Record<NpcId, NpcNeedState>;
  npcMemories: Record<NpcId, NpcMemory>;
  buildings: PlacedBuilding[];
  completedQuests: string[];
  promises: PromiseRecord[];
  discoveredSecrets: string[];
  ruinPillars: boolean[];
  cavernLit: boolean;
  communityProjects: Record<string, number>;
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
