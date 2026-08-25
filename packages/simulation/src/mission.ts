import rawGooseGreen from "../../../data/missions/goose-green.json";
import { executeAiCycle } from "./ai";
import { calculateAttack, resolveAreaSplash } from "./combat";
import {
  createFogOfWarGrid,
  isUnitDetected,
  updateFogOfWar,
  type FogOfWarGrid,
} from "./fog";
import { calculateFormationSlots, calculateSeparationVector } from "./formation";
import {
  consumeAmmunition,
  consumeFuel,
  getAmmoFireRateMultiplier,
  getFuelSpeedMultiplier,
  processResupply,
  updateLogisticsState,
} from "./logistics";
import { findPath } from "./pathfinding";
import { processScheduledReinforcements } from "./mission-system";
import {
  DEFAULT_WEATHER,
  getBallisticWindDrift,
  getWeatherMovementMultiplier,
  stepWeather,
} from "./weather";
import { GOOSE_GREEN_TERRAIN_GRID, getCover, getMovementCost } from "./terrain";
import {
  applySuppression,
  assignControlGroup,
  createUnitState,
  decaySuppression,
  getControlGroupUnitIds,
  getEffectiveDamageMultiplier,
  getEffectiveSpeed,
  getUnitDefenseCoverBonus,
  updateEntrenchment,
} from "./unit";
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

export const GOOSE_GREEN_MISSION: MissionDefinition = {
  ...(rawGooseGreen as unknown as MissionDefinition),
  map: {
    ...(rawGooseGreen as unknown as MissionDefinition).map,
    terrain: GOOSE_GREEN_TERRAIN_GRID,
  },
};

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
  const featCover = mission.map.features.reduce((cover, feature) => {
    return distance(feature.position, position) <= feature.radius
      ? Math.max(cover, feature.cover)
      : cover;
  }, 0);
  if (mission.map.terrain) {
    return Math.max(featCover, getCover(mission.map.terrain, position));
  }
  return featCover;
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
    const slots = calculateFormationSlots(command.targetPosition, selected.length);
    for (let i = 0; i < selected.length; i++) {
      const unit = selected[i];
      const slotPos = {
        x: clamp(slots[i].x, 0, mission.map.width),
        y: clamp(slots[i].y, 0, mission.map.height),
      };
      unit.targetUnitId = null;
      unit.order = "move";

      if (mission.map.terrain) {
        const fullPath = findPath(mission.map.terrain, unit.position, slotPos);
        if (fullPath.length > 1) {
          unit.path = fullPath.slice(1);
          unit.destination = unit.path[0];
        } else {
          unit.destination = slotPos;
          unit.path = [slotPos];
        }
      } else {
        unit.destination = slotPos;
        unit.path = [slotPos];
      }
    }
  }

  if (command.type === "ATTACK" && command.targetUnitIds?.[0]) {
    for (const unit of selected) {
      const target = state.units.find((candidate) => candidate.id === command.targetUnitIds?.[0]);
      if (!target || target.side === unit.side || !target.alive) continue;
      unit.targetUnitId = target.id;
      unit.destination = null;
      unit.path = [];
      unit.order = "attack";
    }
  }

  if (command.type === "USE_SUPPORT" && command.targetUnitIds?.[0]) {
    for (const unit of selected.filter((candidate) => candidate.kind === "artillery" || candidate.kind === "support-weapon")) {
      const target = state.units.find((candidate) => candidate.id === command.targetUnitIds?.[0]);
      if (!target || target.side === unit.side || !target.alive || unit.ammunition < 2) continue;
      unit.targetUnitId = target.id;
      unit.destination = null;
      unit.path = [];
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

  if (command.type === "HOLD") {
    for (const unit of selected) {
      unit.order = "hold";
      unit.destination = null;
      unit.path = [];
      unit.targetUnitId = null;
    }
  }

  if (command.type === "RETREAT") {
    const homeX = command.side === "argentina" ? 15 : 85;
    for (const unit of selected) {
      unit.order = "retreat";
      unit.targetUnitId = null;
      const targetPos = { x: homeX, y: unit.position.y };
      if (mission.map.terrain) {
        const fullPath = findPath(mission.map.terrain, unit.position, targetPos);
        if (fullPath.length > 1) {
          unit.path = fullPath.slice(1);
          unit.destination = unit.path[0];
        } else {
          unit.destination = targetPos;
          unit.path = [targetPos];
        }
      } else {
        unit.destination = targetPos;
        unit.path = [targetPos];
      }
    }
  }

  if (command.type === "ENTRENCH") {
    for (const unit of selected) {
      if (unit.kind === "infantry" || unit.kind === "support-weapon") {
        unit.order = "entrench";
        unit.destination = null;
        unit.path = [];
        unit.targetUnitId = null;
      }
    }
  }

  if (command.type === "ASSIGN_GROUP" && typeof command.groupNumber === "number") {
    assignControlGroup(state, command.side, command.groupNumber, [...ownUnitIds]);
  }

  if (command.type === "SELECT_GROUP" && typeof command.groupNumber === "number") {
    const groupUnitIds = getControlGroupUnitIds(state, command.side, command.groupNumber);
    state.selectedUnitIds = [...groupUnitIds];
    for (const unit of state.units) {
      unit.selected = groupUnitIds.includes(unit.id);
    }
  }
}

function runAi(state: MatchState, mission: MissionDefinition, side: Side): void {
  executeAiCycle(state, mission, side);
}

function moveUnits(state: MatchState, mission: MissionDefinition): void {
  const units = livingUnits(state);
  for (const unit of units) {
    if (!unit.destination || (unit.order !== "move" && unit.order !== "retreat")) continue;
    const remaining = distance(unit.position, unit.destination);

    if (remaining <= 0.4) {
      unit.position = { ...unit.destination };
      if (unit.path && unit.path.length > 0) {
        unit.path.shift();
        if (unit.path.length > 0) {
          unit.destination = unit.path[0];
        } else {
          unit.destination = null;
          unit.order = "idle";
          continue;
        }
      } else {
        unit.destination = null;
        unit.order = "idle";
        continue;
      }
    }

    const heading = direction(unit.position, unit.destination);
    const separation = calculateSeparationVector(unit, units, 2.4, 0.4);

    const blendedX = heading.x + separation.x;
    const blendedY = heading.y + separation.y;
    const blendLen = Math.hypot(blendedX, blendedY);
    const finalHeading = blendLen > 0 ? { x: blendedX / blendLen, y: blendedY / blendLen } : heading;

    const cost = mission.map.terrain ? getMovementCost(mission.map.terrain, unit.position) : 1;
    const weatherMult = getWeatherMovementMultiplier(state.weather);
    const baseSpeed = getEffectiveSpeed(unit);
    const fuelMult = getFuelSpeedMultiplier(unit);
    const effectiveSpeed = Number.isFinite(cost) && cost > 0 ? (baseSpeed * fuelMult) / (cost * weatherMult) : 0;
    const step = Math.min(remaining, effectiveSpeed * dt);

    if (step > 0) {
      unit.position = {
        x: clamp(unit.position.x + finalHeading.x * step, 0, mission.map.width),
        y: clamp(unit.position.y + finalHeading.y * step, 0, mission.map.height),
      };
      consumeFuel(unit, step);
    }
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

    // Ground aircraft if weather is non-operational (blizzard / dense fog)
    if (attacker.kind === "aircraft" && state.weather && !state.weather.aircraftOperational) {
      continue;
    }

    // 1. Artillery / Heavy support AoE splash
    if (attacker.kind === "artillery") {
      const dist = distance(attacker.position, target.position);
      if (dist > attacker.attackRange) continue;

      const driftedImpact = getBallisticWindDrift(target.position, dist, state.weather);
      const affected = resolveAreaSplash(
        {
          center: driftedImpact,
          radius: 6.0,
          primaryDamage: attacker.damage,
          suppressionPower: attacker.suppressionPower,
        },
        state.units,
        attacker.side,
        mission.map.terrain,
      );

      consumeAmmunition(attacker);
      const artFireRate = getAmmoFireRateMultiplier(attacker);
      attacker.cooldownUntilTick = state.tick + Math.round(18 / Math.max(0.3, artFireRate));

      if (affected.length > 0) {
        pushEvent(state, {
          tick: state.tick,
          type: "unit-damaged",
          message: `${attacker.label} descarga fuego de artillería sobre ${target.label} (área de impacto)`,
          unitId: target.id,
        });
      }
      continue;
    }

    // 2. Direct fire attack calculation
    const combat = calculateAttack(attacker, target, mission.map.terrain, Math.random(), state.weather);
    if (!combat.hit && combat.damage === 0 && combat.suppressionDealt === 0) {
      continue;
    }

    if (combat.hit) {
      target.health = Math.max(0, target.health - combat.damage);
      target.morale = Math.max(0, target.morale - 0.03);
    }
    applySuppression(target, combat.suppressionDealt);

    consumeAmmunition(attacker);
    const fireRate = getAmmoFireRateMultiplier(attacker);
    const baseCooldown = attacker.kind === "support-weapon" ? 12 : 9;
    attacker.cooldownUntilTick = state.tick + Math.round(baseCooldown / Math.max(0.3, fireRate));

    if (combat.hit) {
      const highGroundTag = combat.elevationAdvantage > 5 ? " [cota alta]" : "";
      const armorTag = combat.armorMitigated ? " [blindaje]" : "";
      pushEvent(state, {
        tick: state.tick,
        type: "unit-damaged",
        message: `${attacker.label} impacta a ${target.label} (-${combat.damage}${armorTag}${highGroundTag})`,
        unitId: target.id,
      });
    }

    if (target.health === 0) {
      target.alive = false;
      target.order = "idle";
      target.destination = null;
      target.path = [];
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

function updateVisionAndDetection(state: MatchState, mission: MissionDefinition): void {
  if (!mission.map.terrain) return;

  if (!state.fogOfWar) {
    state.fogOfWar = {
      argentina: createFogOfWarGrid(mission.map.width, mission.map.height),
      britain: createFogOfWarGrid(mission.map.width, mission.map.height),
    };
  }

  const argUnits = livingUnits(state, "argentina");
  const ukUnits = livingUnits(state, "britain");

  updateFogOfWar(state.fogOfWar.argentina, mission.map.terrain, argUnits, state.weather);
  updateFogOfWar(state.fogOfWar.britain, mission.map.terrain, ukUnits, state.weather);

  const detectedByArg = ukUnits
    .filter((enemy) => isUnitDetected(enemy, argUnits, mission.map.terrain!, state.fogOfWar!.argentina, state.weather))
    .map((u) => u.id);

  const detectedByUk = argUnits
    .filter((enemy) => isUnitDetected(enemy, ukUnits, mission.map.terrain!, state.fogOfWar!.britain, state.weather))
    .map((u) => u.id);

  state.detectedEnemyUnitIds = {
    argentina: detectedByArg,
    britain: detectedByUk,
  };
}

export function createMissionState(
  mission: MissionDefinition = GOOSE_GREEN_MISSION,
  matchId = "local-goose-green",
  planId?: string,
): MatchState {
  const units = mission.initialUnits.map<UnitState>((config) => createUnitState(config));
  const control = Object.fromEntries(mission.map.features.map((feature) => [feature.id, null])) as Record<string, Side | null>;
  const fogOfWar: Record<Side, FogOfWarGrid> = {
    argentina: createFogOfWarGrid(mission.map.width, mission.map.height),
    britain: createFogOfWarGrid(mission.map.width, mission.map.height),
  };

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
    controlGroups: {
      argentina: {},
      britain: {},
    },
    control,
    fogOfWar,
    detectedEnemyUnitIds: {
      argentina: [],
      britain: [],
    },
    weather: mission.initialWeather ?? { ...DEFAULT_WEATHER },
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
  updateVisionAndDetection(state, mission);
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
  stepWeather(state, mission);
  for (const unit of state.units) {
    decaySuppression(unit);
    updateEntrenchment(unit);
  }
  for (const command of commands.sort((a, b) => a.sequence - b.sequence)) applyCommand(state, mission, command);
  runAi(state, mission, aiSide);
  processScheduledReinforcements(state, mission);
  moveUnits(state, mission);
  resolveCombat(state, mission);
  processResupply(state, mission);
  updateLogisticsState(state);
  updateControl(state, mission);
  updateVisionAndDetection(state, mission);
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
