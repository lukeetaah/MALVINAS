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

export type UnitOrder = "idle" | "move" | "attack";

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
  };
  initialUnits: MissionUnitConfig[];
  objectives: MissionObjective[];
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
  selected: boolean;
  order: UnitOrder;
  destination: Vec2 | null;
  targetUnitId: string | null;
  speed: number;
  attackRange: number;
  damage: number;
  cooldownUntilTick: number;
  alive: boolean;
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
  control: Record<string, Side | null>;
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
  | "REQUEST_REINFORCEMENT";

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
}
