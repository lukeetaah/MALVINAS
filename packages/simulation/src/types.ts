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

export interface UnitState {
  id: string;
  side: Side;
  kind: UnitKind;
  position: Vec2;
  health: number;
  morale: number;
  ammunition: number;
  fuel: number;
  selected: boolean;
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
  winner?: Side;
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
