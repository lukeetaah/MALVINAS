import type { TerrainGrid } from "./terrain-types";

export const TICK_RATE = 10;
export const PROTOCOL_VERSION = 1;

export type Language = "es-AR" | "en-GB";
export type Side = "argentina" | "britain";
export type MatchStatus = "lobby" | "playing" | "victory" | "defeat";
export type UnitKind =
  | "infantry"
  | "support-weapon"
  | "artillery"
  | "armour"
  | "aircraft"
  | "ship";

export type Vec2 = { x: number; y: number };

export type UnitOrder =
  | "idle"
  | "move"
  | "attack"
  | "hold"
  | "retreat"
  | "entrench"
  | "suppress";

export interface TerrainFeature {
  id: string;
  kind: "airfield" | "settlement" | "position" | "open-ground";
  position: Vec2;
  radius: number;
  cover: number;
}

export interface MissionUnitConfig {
  id: string;
  side: Side;
  kind: UnitKind;
  label: string;
  position: Vec2;
  health: number;
  morale: number;
  ammunition: number;
  fuel: number;
  speed: number;
  attackRange: number;
  damage: number;
  sightRange?: number;
  stealthRating?: number;
  armorRating?: number;
  penetrationRating?: number;
  suppressionPower?: number;
  maxAmmunition?: number;
  maxFuel?: number;
}

export interface MissionObjective {
  id: string;
  side: Side;
  kind: "hold" | "capture";
  featureId: string;
}

export interface HistoricalOutcome {
  id: string;
  winner: Side;
  summary: LocalizedMissionText;
}

export interface LocalizedMissionText {
  "es-AR": string;
  "en-GB": string;
}

export interface MissionPlan {
  id: string;
  side: Side;
  name: LocalizedMissionText;
  description: LocalizedMissionText;
  effect: LocalizedMissionText;
  moraleBonus: number;
  ammunitionBonus: number;
}

export interface MissionNarrativeMoment {
  id: string;
  atSecond: number;
  title: LocalizedMissionText;
  body: LocalizedMissionText;
  sourceIds: string[];
}

export interface MissionBriefing {
  theatre: LocalizedMissionText;
  situation: LocalizedMissionText;
  historicalFrame: LocalizedMissionText;
  playerObjective: Record<Side, LocalizedMissionText>;
  plans: MissionPlan[];
}

export interface SupplyPoint {
  id: string;
  side: Side;
  position: Vec2;
  radius: number;
  ammunitionRate: number;
  fuelRate: number;
  capacity: number;
  currentStock: number;
}

export interface ScheduledReinforcement {
  id: string;
  atSecond: number;
  side: Side;
  unit: MissionUnitConfig;
  message: LocalizedMissionText;
}

export interface SecondaryObjective {
  id: string;
  side: Side;
  kind: "destroy-unit-kind" | "preserve-units-percent" | "capture-within-seconds";
  description: LocalizedMissionText;
  targetUnitKind?: UnitKind;
  targetPercent?: number;
  targetSeconds?: number;
  points: number;
}

export interface MissionScore {
  primaryCompleted: boolean;
  secondaryCompletedIds: string[];
  totalScore: number;
  maxScore: number;
  rating: "decisive-victory" | "marginal-victory" | "tactical-stalemate" | "defeat";
  losses: Record<Side, number>;
}

export type WeatherType =
  | "clear"
  | "overcast"
  | "dense-fog"
  | "rain"
  | "snow-blizzard"
  | "gale-winds";

export interface WeatherState {
  type: WeatherType;
  visibilityMultiplier: number; // 0.35 to 1.0
  movementCostMultiplier: number; // 1.0 to 1.6
  windVector: Vec2; // drift per unit range
  temperature: number; // in Celsius (-5 to 12)
  aircraftOperational: boolean;
}

export interface WeatherTimelineEntry {
  atSecond: number;
  weather: WeatherState;
  message?: LocalizedMissionText;
}

export interface MissionDefinition {
  id: string;
  title: LocalizedMissionText;
  dateStart: string;
  dateEnd: string;
  tickRate: typeof TICK_RATE;
  timeLimitSeconds: number;
  map: {
    width: number;
    height: number;
    features: TerrainFeature[];
    terrain?: TerrainGrid;
  };
  initialUnits: MissionUnitConfig[];
  objectives: MissionObjective[];
  secondaryObjectives?: SecondaryObjective[];
  reinforcements?: ScheduledReinforcement[];
  supplyPoints?: SupplyPoint[];
  initialWeather?: WeatherState;
  weatherTimeline?: WeatherTimelineEntry[];
  briefing: MissionBriefing;
  narrativeMoments: MissionNarrativeMoment[];
  historicalOutcome: HistoricalOutcome;
  sourceIds: string[];
  abstractionNote: LocalizedMissionText;
}

export interface UnitState {
  id: string;
  side: Side;
  kind: UnitKind;
  label: string;
  position: Vec2;
  health: number;
  morale: number;
  ammunition: number;
  fuel: number;
  maxAmmunition: number;
  maxFuel: number;
  selected: boolean;
  order: UnitOrder;
  destination: Vec2 | null;
  targetUnitId: string | null;
  speed: number;
  attackRange: number;
  damage: number;
  cooldownUntilTick: number;
  alive: boolean;

  // Extended tactical profile & dynamic states
  sightRange: number;
  stealthRating: number;
  armorRating: number;
  penetrationRating: number;
  suppressionPower: number;
  suppressionLevel: number;
  isSuppressed: boolean;
  entrenched: boolean;
  entrenchProgress: number;
  controlGroup: number | null;
  path: Vec2[];
}

export interface LogisticsState {
  ammunition: number;
  fuel: number;
  reinforcements: number;
  supplyPressure: number;
}

export interface MatchState {
  protocolVersion: typeof PROTOCOL_VERSION;
  matchId: string;
  missionId: string;
  tick: number;
  status: MatchStatus;
  units: UnitState[];
  logistics: Record<Side, LogisticsState>;
  selectedUnitIds: string[];
  controlGroups: Record<Side, Record<number, string[]>>;
  control: Record<string, Side | null>;
  fogOfWar?: Record<Side, { width: number; height: number; visibility: Uint8Array }>;
  detectedEnemyUnitIds?: Record<Side, string[]>;
  weather?: WeatherState;
  eventLog: SimulationEvent[];
  endReason?: string;
  winner?: Side;
}

export interface SimulationEvent {
  tick: number;
  type: "unit-damaged" | "unit-destroyed" | "objective-captured" | "reinforcement" | "plan-selected" | "match-ended";
  message: string;
  unitId?: string;
  featureId?: string;
}

export type CommandType =
  | "SELECT"
  | "MOVE"
  | "ATTACK"
  | "USE_SUPPORT"
  | "REQUEST_REINFORCEMENT"
  | "HOLD"
  | "RETREAT"
  | "ENTRENCH"
  | "ASSIGN_GROUP"
  | "SELECT_GROUP";

export interface SimCommand {
  protocolVersion: typeof PROTOCOL_VERSION;
  matchId: string;
  playerId: string;
  side: Side;
  tick: number;
  sequence: number;
  type: CommandType;
  unitIds: string[];
  targetPosition?: Vec2;
  targetUnitIds?: string[];
  groupNumber?: number;
}
