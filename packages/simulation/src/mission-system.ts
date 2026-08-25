import rawGooseGreen from "../../../data/missions/goose-green.json";
import rawMountLongdon from "../../../data/missions/mount-longdon.json";
import rawSanCarlos from "../../../data/missions/san-carlos.json";
import rawLongdonTerrain from "../../../data/maps/mount-longdon-terrain.json";
import {
  GOOSE_GREEN_TERRAIN_GRID,
  buildTerrainGridFromDefinition,
  createTerrainGrid,
  getCellIndex,
} from "./terrain";
import { createUnitState } from "./unit";
import type { TerrainGrid } from "./terrain-types";
import type {
  MatchState,
  MissionDefinition,
  MissionScore,
  ScheduledReinforcement,
  SecondaryObjective,
  Side,
  UnitState,
} from "./types";

export const MOUNT_LONGDON_TERRAIN_GRID: TerrainGrid = buildTerrainGridFromDefinition(
  rawLongdonTerrain as any,
  "open-grass",
  20,
);

export const MOUNT_LONGDON_MISSION: MissionDefinition = {
  ...(rawMountLongdon as unknown as MissionDefinition),
  map: {
    ...(rawMountLongdon as unknown as MissionDefinition).map,
    terrain: MOUNT_LONGDON_TERRAIN_GRID,
  },
  secondaryObjectives: [
    {
      id: "longdon-preserve-infantry",
      side: "argentina",
      kind: "preserve-units-percent",
      description: {
        "es-AR": "Mantené con vida al menos el 50% de las secciones de infantería",
        "en-GB": "Preserve at least 50% of infantry sections",
      },
      targetPercent: 0.5,
      points: 250,
    },
    {
      id: "longdon-destroy-mortars",
      side: "argentina",
      kind: "destroy-unit-kind",
      description: {
        "es-AR": "Neutralizá la batería de morteros pesados británica",
        "en-GB": "Neutralise British heavy mortar battery",
      },
      targetUnitKind: "artillery",
      points: 300,
    },
    {
      id: "longdon-speed-assault",
      side: "britain",
      kind: "capture-within-seconds",
      description: {
        "es-AR": "Capturá la cumbre oeste en menos de 120 segundos",
        "en-GB": "Capture the western summit in under 120 seconds",
      },
      targetSeconds: 120,
      points: 300,
    },
  ],
  reinforcements: [
    {
      id: "ri7-castaneda-reinforcement",
      atSecond: 60,
      side: "argentina",
      unit: {
        id: "ri7-castaneda-sec",
        side: "argentina",
        kind: "infantry",
        label: "RI 7 · Refuerzo Ca C (Tte 1ro Castañeda)",
        position: { x: 30, y: 40 },
        health: 100,
        morale: 0.9,
        ammunition: 70,
        fuel: 1,
        speed: 4.4,
        attackRange: 8,
        damage: 11,
      },
      message: {
        "es-AR": "¡Refuerzos en el sector!: Arriba la 1ra Sección de la Ca C del RI 7.",
        "en-GB": "Reinforcements arrive: 1st Platoon Company C (RI 7) enters the field.",
      },
    },
  ],
};

export const SAN_CARLOS_MISSION: MissionDefinition = {
  ...(rawSanCarlos as unknown as MissionDefinition),
  secondaryObjectives: [
    {
      id: "san-carlos-cripple-frigate",
      side: "argentina",
      kind: "destroy-unit-kind",
      description: {
        "es-AR": "Hundí o neutralizá al menos un buque de guerra británico",
        "en-GB": "Sink or neutralise at least one British warship",
      },
      targetUnitKind: "ship",
      points: 400,
    },
  ],
};

/**
 * Global Registry of all historical missions available in the game.
 */
export const HISTORICAL_MISSIONS: MissionDefinition[] = [
  rawGooseGreen as unknown as MissionDefinition,
  MOUNT_LONGDON_MISSION,
  SAN_CARLOS_MISSION,
];

export function getAllMissions(): MissionDefinition[] {
  return HISTORICAL_MISSIONS;
}

export function getMissionById(id: string): MissionDefinition | undefined {
  return HISTORICAL_MISSIONS.find((m) => m.id === id);
}

/**
 * Checks and spawns scheduled reinforcements when the match reaches the designated time.
 */
export function processScheduledReinforcements(
  state: MatchState,
  mission: MissionDefinition,
): void {
  if (!mission.reinforcements || mission.reinforcements.length === 0) return;

  const currentSecond = Math.floor(state.tick / mission.tickRate);

  for (const rein of mission.reinforcements) {
    // Only spawn once at exact tick
    if (state.tick === rein.atSecond * mission.tickRate) {
      const alreadyExists = state.units.some((u) => u.id === rein.unit.id);
      if (!alreadyExists) {
        const newUnit = createUnitState(rein.unit);
        state.units.push(newUnit);

        state.eventLog.push({
          tick: state.tick,
          type: "reinforcement",
          message: rein.message["es-AR"],
          unitId: newUnit.id,
        });
      }
    }
  }
}

/**
 * Evaluates which secondary objectives have been achieved.
 */
export function evaluateSecondaryObjectives(
  state: MatchState,
  mission: MissionDefinition,
  side: Side,
): string[] {
  if (!mission.secondaryObjectives) return [];

  const completed: string[] = [];
  const currentSeconds = Math.floor(state.tick / mission.tickRate);

  for (const sec of mission.secondaryObjectives) {
    if (sec.side !== side) continue;

    if (sec.kind === "destroy-unit-kind" && sec.targetUnitKind) {
      const enemySide = side === "argentina" ? "britain" : "argentina";
      const matchingLiving = state.units.filter(
        (u) => u.alive && u.side === enemySide && u.kind === sec.targetUnitKind,
      );
      if (matchingLiving.length === 0) {
        completed.push(sec.id);
      }
    } else if (sec.kind === "preserve-units-percent" && sec.targetPercent) {
      const initialKindCount = mission.initialUnits.filter((u) => u.side === side && u.kind === "infantry").length;
      const currentLiving = state.units.filter((u) => u.alive && u.side === side && u.kind === "infantry").length;
      if (initialKindCount > 0 && currentLiving / initialKindCount >= sec.targetPercent) {
        completed.push(sec.id);
      }
    } else if (sec.kind === "capture-within-seconds" && sec.targetSeconds) {
      const primaryHeld = mission.objectives
        .filter((o) => o.side === side && o.kind === "capture")
        .every((o) => state.control[o.featureId] === side);
      if (primaryHeld && currentSeconds <= sec.targetSeconds) {
        completed.push(sec.id);
      }
    }
  }

  return completed;
}

/**
 * Calculates comprehensive mission score, casualty ratio, and tactical rating.
 */
export function calculateMissionScore(
  state: MatchState,
  mission: MissionDefinition,
  playerSide: Side,
): MissionScore {
  const opponent = playerSide === "argentina" ? "britain" : "argentina";

  const initialPlayerUnits = mission.initialUnits.filter((u) => u.side === playerSide).length;
  const initialOpponentUnits = mission.initialUnits.filter((u) => u.side === opponent).length;

  const livingPlayerUnits = state.units.filter((u) => u.alive && u.side === playerSide).length;
  const livingOpponentUnits = state.units.filter((u) => u.alive && u.side === opponent).length;

  const playerLosses = Math.max(0, initialPlayerUnits - livingPlayerUnits);
  const opponentLosses = Math.max(0, initialOpponentUnits - livingOpponentUnits);

  const primaryCompleted = state.winner === playerSide;
  const secondaryCompleted = evaluateSecondaryObjectives(state, mission, playerSide);

  let totalScore = primaryCompleted ? 1000 : 200;
  totalScore += opponentLosses * 150;
  totalScore -= playerLosses * 100;

  let maxScore = 1000 + initialOpponentUnits * 150;

  if (mission.secondaryObjectives) {
    for (const sec of mission.secondaryObjectives.filter((s) => s.side === playerSide)) {
      maxScore += sec.points;
      if (secondaryCompleted.includes(sec.id)) {
        totalScore += sec.points;
      }
    }
  }

  totalScore = Math.max(0, totalScore);

  let rating: MissionScore["rating"] = "defeat";
  if (primaryCompleted) {
    const ratio = totalScore / maxScore;
    if (ratio >= 0.85) {
      rating = "decisive-victory";
    } else {
      rating = "marginal-victory";
    }
  } else if (livingPlayerUnits > 0 && opponentLosses >= playerLosses) {
    rating = "tactical-stalemate";
  }

  return {
    primaryCompleted,
    secondaryCompletedIds: secondaryCompleted,
    totalScore,
    maxScore,
    rating,
    losses: {
      [playerSide]: playerLosses,
      [opponent]: opponentLosses,
    } as Record<Side, number>,
  };
}
