import rawGooseGreen from "../../../data/missions/goose-green.json";
import type {
  MatchState,
  MissionDefinition,
  SimCommand,
  Side,
  SimulationEvent,
  UnitState,
  Vec2,
} from "./types";
import { PROTOCOL_VERSION, TICK_RATE } from "./types";

export const GOOSE_GREEN_MISSION = rawGooseGreen as unknown as MissionDefinition;

export interface MissionResult {
  missionId: string;
  playerSide: Side;
  historicalOutcomeId: string;
  historicalWinner: Side;
  playerOutcomeId: "player-victory" | "player-defeat";
  playerWon: boolean;
  winner?: Side;
  endReason: string;
  comparison: {
    "es-AR": string;
    "en-GB": string;
  };
}

const dt = 1 / TICK_RATE;

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function direction(from: Vec2, to: Vec2): Vec2 {
  const length = distance(from, to);
  if (length === 0) return { x: 0, y: 0 };
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function featureCover(state: MatchState, mission: MissionDefinition, position: Vec2): number {
  return mission.map.features.reduce((cover, feature) => {
    return distance(feature.position, position) <= feature.radius
      ? Math.max(cover, feature.cover)
      : cover;
  }, 0);
}

function pushEvent(state: MatchState, event: SimulationEvent): void {
  state.eventLog.push(event);
  if (state.eventLog.length > 80) state.eventLog.splice(0, state.eventLog.length - 80);
}

function livingUnits(state: MatchState, side?: Side): UnitState[] {
  return state.units.filter((unit) => unit.alive && (!side || unit.side === side));
}

function nearestEnemy(state: MatchState, unit: UnitState): UnitState | undefined {
  return livingUnits(state, unit.side === "argentina" ? "britain" : "argentina")
    .sort((a, b) => distance(unit.position, a.position) - distance(unit.position, b.position))[0];
}

function nearestObjective(origin: Vec2, mission: MissionDefinition, side: Side): Vec2 {
  const objective = mission.objectives
    .filter((item) => item.side === side)
    .map((item) => mission.map.features.find((feature) => feature.id === item.featureId))
    .filter((feature): feature is MissionDefinition["map"]["features"][number] => Boolean(feature))
    .sort((a, b) => distance(origin, a.position) - distance(origin, b.position))[0];
  return objective?.position ?? { x: mission.map.width / 2, y: mission.map.height / 2 };
}

function applyCommand(state: MatchState, mission: MissionDefinition, command: SimCommand): void {
  if (command.matchId !== state.matchId || command.tick > state.tick + 2) return;
  const ownUnitIds = new Set(
    command.unitIds.filter((id) => state.units.some((unit) => unit.id === id && unit.side === command.side && unit.alive)),
  );

  if (command.type === "SELECT") {
    state.selectedUnitIds = [...ownUnitIds];
    for (const unit of state.units) unit.selected = ownUnitIds.has(unit.id);
    return;
  }

  const selected = state.units.filter((unit) => ownUnitIds.has(unit.id));
  if (command.type === "MOVE" && command.targetPosition) {
    for (const unit of selected) {
      unit.destination = {
        x: clamp(command.targetPosition.x, 0, mission.map.width),
        y: clamp(command.targetPosition.y, 0, mission.map.height),
      };
      unit.targetUnitId = null;
      unit.order = "move";
    }
  }

  if (command.type === "ATTACK" && command.targetUnitIds?.[0]) {
    for (const unit of selected) {
      const target = state.units.find((candidate) => candidate.id === command.targetUnitIds?.[0]);
      if (!target || target.side === unit.side || !target.alive) continue;
      unit.targetUnitId = target.id;
      unit.destination = null;
      unit.order = "attack";
    }
  }

  if (command.type === "USE_SUPPORT" && command.targetUnitIds?.[0]) {
    for (const unit of selected.filter((candidate) => candidate.kind === "artillery" || candidate.kind === "support-weapon")) {
      const target = state.units.find((candidate) => candidate.id === command.targetUnitIds?.[0]);
      if (!target || target.side === unit.side || !target.alive || unit.ammunition < 2) continue;
      unit.targetUnitId = target.id;
      unit.destination = null;
      unit.order = "attack";
      unit.cooldownUntilTick = Math.min(unit.cooldownUntilTick, state.tick);
    }
  }

  if (command.type === "REQUEST_REINFORCEMENT" && state.logistics[command.side].reinforcements > 0) {
    state.logistics[command.side].reinforcements -= 1;
    state.logistics[command.side].ammunition += 18;
    for (const unit of selected) unit.morale = Math.min(1, unit.morale + 0.08);
    pushEvent(state, {
      tick: state.tick,
      type: "reinforcement",
      message: `${command.side} recibe un refuerzo logístico abstracto`,
    });
  }
}

function runAi(state: MatchState, mission: MissionDefinition, side: Side): void {
  for (const unit of livingUnits(state, side)) {
    const enemy = nearestEnemy(state, unit);
    if (enemy && distance(unit.position, enemy.position) <= unit.attackRange * 1.4) {
      unit.targetUnitId = enemy.id;
      unit.destination = null;
      unit.order = "attack";
      continue;
    }
    const objective = nearestObjective(unit.position, mission, side === "britain" ? "britain" : "argentina");
    unit.destination = objective;
    unit.order = "move";
  }
}

function moveUnits(state: MatchState, mission: MissionDefinition): void {
  for (const unit of livingUnits(state)) {
    if (!unit.destination || unit.order !== "move") continue;
    const remaining = distance(unit.position, unit.destination);
    if (remaining <= 0.25) {
      unit.position = { ...unit.destination };
      unit.destination = null;
      unit.order = "idle";
      continue;
    }
    const heading = direction(unit.position, unit.destination);
    const step = Math.min(remaining, unit.speed * dt);
    unit.position = {
      x: clamp(unit.position.x + heading.x * step, 0, mission.map.width),
      y: clamp(unit.position.y + heading.y * step, 0, mission.map.height),
    };
  }
}

function resolveCombat(state: MatchState, mission: MissionDefinition): void {
  for (const attacker of livingUnits(state)) {
    if (!attacker.targetUnitId || attacker.cooldownUntilTick > state.tick || attacker.ammunition <= 0) continue;
    const target = state.units.find((unit) => unit.id === attacker.targetUnitId);
    if (!target || !target.alive) {
      attacker.targetUnitId = null;
      attacker.order = "idle";
      continue;
    }
    if (distance(attacker.position, target.position) > attacker.attackRange) continue;
    const cover = featureCover(state, mission, target.position);
    const damage = Math.max(1, Math.round(attacker.damage * (1 - cover) * Math.max(0.45, attacker.morale)));
    target.health = Math.max(0, target.health - damage);
    target.morale = Math.max(0, target.morale - 0.025);
    attacker.ammunition -= 1;
    attacker.cooldownUntilTick = state.tick + (attacker.kind === "artillery" ? 18 : 10);
    pushEvent(state, {
      tick: state.tick,
      type: "unit-damaged",
      message: `${attacker.label} impacta a ${target.label} (-${damage})`,
      unitId: target.id,
    });
    if (target.health === 0) {
      target.alive = false;
      target.order = "idle";
      target.destination = null;
      pushEvent(state, {
        tick: state.tick,
        type: "unit-destroyed",
        message: `${target.label} queda fuera de combate`,
        unitId: target.id,
      });
    }
  }
}

function updateControl(state: MatchState, mission: MissionDefinition): void {
  for (const feature of mission.map.features) {
    const occupants = livingUnits(state).filter((unit) => distance(unit.position, feature.position) <= feature.radius);
    const argentina = occupants.filter((unit) => unit.side === "argentina").length;
    const britain = occupants.filter((unit) => unit.side === "britain").length;
    const previous = state.control[feature.id] ?? null;
    const next = argentina === britain ? previous : argentina > britain ? "argentina" : "britain";
    state.control[feature.id] = next;
    if (next && next !== previous) {
      pushEvent(state, {
        tick: state.tick,
        type: "objective-captured",
        message: `${next} controla ${feature.id}`,
        featureId: feature.id,
      });
    }
  }
}

function objectiveComplete(state: MatchState, mission: MissionDefinition, side: Side): boolean {
  return mission.objectives
    .filter((objective) => objective.side === side)
    .every((objective) => state.control[objective.featureId] === side);
}

function finishIfNeeded(state: MatchState, mission: MissionDefinition): void {
  const argentinaAlive = livingUnits(state, "argentina").length;
  const britainAlive = livingUnits(state, "britain").length;
  let winner: Side | undefined;
  let reason = "";

  if (argentinaAlive === 0) {
    winner = "britain";
    reason = "No quedan unidades argentinas operativas.";
  } else if (britainAlive === 0) {
    winner = "argentina";
    reason = "No quedan unidades británicas operativas.";
  } else if (objectiveComplete(state, mission, "britain")) {
    winner = "britain";
    reason = "Las dos posiciones objetivo quedaron bajo control británico.";
  } else if (state.tick >= mission.timeLimitSeconds * mission.tickRate) {
    winner = objectiveComplete(state, mission, "argentina") ? "argentina" : "britain";
    reason = winner === "argentina" ? "La defensa sostuvo los objetivos hasta el límite de tiempo." : "La defensa no sostuvo todos los objetivos al terminar el tiempo.";
  }

  if (!winner) return;
  state.status = winner === "argentina" ? "victory" : "defeat";
  state.winner = winner;
  state.endReason = reason;
  pushEvent(state, { tick: state.tick, type: "match-ended", message: reason });
}

export function createMissionState(
  mission: MissionDefinition = GOOSE_GREEN_MISSION,
  matchId = "local-goose-green",
  planId?: string,
): MatchState {
  const units = mission.initialUnits.map<UnitState>((config) => ({
    ...config,
    selected: false,
    order: "idle",
    destination: null,
    targetUnitId: null,
    cooldownUntilTick: 0,
    alive: true,
  }));
  const control = Object.fromEntries(mission.map.features.map((feature) => [feature.id, null])) as Record<string, Side | null>;
  const state: MatchState = {
    protocolVersion: PROTOCOL_VERSION,
    matchId,
    missionId: mission.id,
    tick: 0,
    status: "playing",
    units,
    logistics: {
      argentina: { ammunition: 120, fuel: 1, reinforcements: 1, supplyPressure: 0.72 },
      britain: { ammunition: 160, fuel: 1, reinforcements: 0, supplyPressure: 0.45 },
    },
    selectedUnitIds: [],
    control,
    eventLog: [],
  };
  const plan = mission.briefing.plans.find((candidate) => candidate.id === planId);
  if (plan) {
    for (const unit of state.units.filter((candidate) => candidate.side === plan.side)) {
      unit.morale = Math.min(1, unit.morale + plan.moraleBonus);
      unit.ammunition += plan.ammunitionBonus;
    }
    state.logistics[plan.side].ammunition += plan.ammunitionBonus * state.units.filter((unit) => unit.side === plan.side).length;
    pushEvent(state, {
      tick: 0,
      type: "plan-selected",
      message: `${plan.side} adopta: ${plan.name["es-AR"]}`,
    });
  }
  updateControl(state, mission);
  return state;
}

export function stepMission(
  current: MatchState,
  mission: MissionDefinition = GOOSE_GREEN_MISSION,
  commands: SimCommand[] = [],
  aiSide: Side = "britain",
): MatchState {
  if (current.status !== "playing") return current;
  const state = structuredClone(current) as MatchState;
  state.tick += 1;
  for (const command of commands.sort((a, b) => a.sequence - b.sequence)) applyCommand(state, mission, command);
  runAi(state, mission, aiSide);
  moveUnits(state, mission);
  resolveCombat(state, mission);
  updateControl(state, mission);
  finishIfNeeded(state, mission);
  return state;
}

export function resolveMissionResult(
  state: MatchState,
  mission: MissionDefinition = GOOSE_GREEN_MISSION,
  playerSide: Side = "argentina",
): MissionResult | null {
  if (state.status === "playing") return null;
  const playerWon = state.winner === playerSide;
  return {
    missionId: mission.id,
    playerSide,
    historicalOutcomeId: mission.historicalOutcome.id,
    historicalWinner: mission.historicalOutcome.winner,
    playerOutcomeId: playerWon ? "player-victory" : "player-defeat",
    playerWon,
    winner: state.winner,
    endReason: state.endReason ?? "La partida terminó.",
    comparison: playerWon
      ? {
          "es-AR": "En tu partida, el bando elegido alcanzó una victoria distinta del resultado histórico registrado.",
          "en-GB": "In your match, the selected side achieved a victory different from the recorded historical outcome.",
        }
      : {
          "es-AR": "La partida terminó sin alterar el resultado histórico de referencia.",
          "en-GB": "The match ended without changing the reference historical outcome.",
        },
  };
}
