import type { MatchState, MissionDefinition, Side, UnitState, Vec2 } from "./types";
import { findPath } from "./pathfinding";
import { getElevation } from "./terrain";

export type AiStance = "attack" | "defend" | "retreat";

/**
 * Calculates straight line Euclidean distance.
 */
function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Evaluates the primary tactical objective for the AI side.
 * Prioritizes unheld or contested objectives closest to the AI's frontline.
 */
export function findPriorityObjective(
  state: MatchState,
  mission: MissionDefinition,
  aiSide: Side,
): Vec2 {
  const opponent = aiSide === "argentina" ? "britain" : "argentina";

  // Prioritize objectives owned by opponent or contested
  const prioritized = mission.objectives
    .filter((obj) => obj.side === aiSide)
    .map((obj) => mission.map.features.find((f) => f.id === obj.featureId))
    .filter((f): f is MissionDefinition["map"]["features"][number] => Boolean(f))
    .sort((a, b) => {
      const aHeld = state.control[a.id] === aiSide ? 1 : 0;
      const bHeld = state.control[b.id] === aiSide ? 1 : 0;
      return aHeld - bHeld;
    });

  if (prioritized.length > 0) {
    return prioritized[0].position;
  }

  return { x: mission.map.width / 2, y: mission.map.height / 2 };
}

/**
 * Finds the highest elevation point near a position within search radius (for high-ground firing).
 */
export function findNearbyHighGround(
  mission: MissionDefinition,
  center: Vec2,
  searchRadius = 6.0,
): Vec2 {
  const terrain = mission.map.terrain;
  if (!terrain) return center;

  let bestPos = { ...center };
  let maxElev = getElevation(terrain, center);

  for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
    for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
      const testPos = {
        x: Math.max(0, Math.min(mission.map.width - 1, center.x + dx)),
        y: Math.max(0, Math.min(mission.map.height - 1, center.y + dy)),
      };
      const elev = getElevation(terrain, testPos);
      if (elev > maxElev) {
        maxElev = elev;
        bestPos = testPos;
      }
    }
  }

  return bestPos;
}

/**
 * Executes a single AI tick decision cycle for the specified side.
 */
export function executeAiCycle(
  state: MatchState,
  mission: MissionDefinition,
  aiSide: Side,
): void {
  const playerSide = aiSide === "argentina" ? "britain" : "argentina";
  const detectedEnemyIds = state.detectedEnemyUnitIds?.[aiSide] ?? [];
  const knownEnemies = state.units.filter(
    (u) => u.alive && u.side === playerSide && detectedEnemyIds.includes(u.id),
  );

  const aiUnits = state.units.filter((u) => u.alive && u.side === aiSide);
  if (aiUnits.length === 0) return;

  const targetObjective = findPriorityObjective(state, mission, aiSide);

  for (const unit of aiUnits) {
    // If unit is already executing a tactical retreat, let it proceed
    if (unit.order === "retreat" && unit.destination) {
      continue;
    }

    // 1. Tactical Retreat: Low health (< 25%) or broken morale (< 0.25) under fire
    if ((unit.health < 25 || unit.morale < 0.25) && unit.isSuppressed) {
      unit.order = "retreat";
      unit.targetUnitId = null;
      const retreatX = aiSide === "argentina" ? 15 : 85;
      const retreatPos = { x: retreatX, y: unit.position.y };

      if (mission.map.terrain) {
        const path = findPath(mission.map.terrain, unit.position, retreatPos);
        if (path.length > 1) {
          unit.path = path.slice(1);
          unit.destination = unit.path[0];
        } else {
          unit.destination = retreatPos;
          unit.path = [retreatPos];
        }
      } else {
        unit.destination = retreatPos;
        unit.path = [retreatPos];
      }
      continue;
    }

    // 2. Artillery / Support weapons: Bombard detected clusters or high value targets from safe range
    if (unit.kind === "artillery" || unit.kind === "support-weapon") {
      if (knownEnemies.length > 0) {
        // Find nearest known enemy within artillery range
        const targetsInRange = knownEnemies.filter(
          (e) => dist(unit.position, e.position) <= unit.attackRange,
        );

        if (targetsInRange.length > 0) {
          // Target lowest health or most dangerous unit
          targetsInRange.sort((a, b) => a.health - b.health);
          unit.targetUnitId = targetsInRange[0].id;
          unit.destination = null;
          unit.path = [];
          unit.order = "attack";
          continue;
        }
      }

      // If already at good position, entrench if support weapon
      if (unit.kind === "support-weapon" && !unit.entrenched && !unit.destination) {
        unit.order = "entrench";
        continue;
      }
    }

    // 3. Combat Engagement: Attack known enemies in range
    if (knownEnemies.length > 0) {
      const nearest = knownEnemies
        .slice()
        .sort((a, b) => dist(unit.position, a.position) - dist(unit.position, b.position))[0];

      const enemyDist = dist(unit.position, nearest.position);

      if (enemyDist <= unit.attackRange * 1.25) {
        unit.targetUnitId = nearest.id;
        unit.destination = null;
        unit.path = [];
        unit.order = "attack";
        continue;
      }
    }

    // 4. Defensive Garrison: If standing directly inside objective zone without immediate threat, entrench
    const insideFeature = mission.map.features.find(
      (f) => dist(unit.position, f.position) <= f.radius,
    );

    if (insideFeature && !unit.entrenched && knownEnemies.length === 0) {
      if (unit.kind === "infantry" || unit.kind === "support-weapon") {
        unit.order = "entrench";
        unit.destination = null;
        unit.path = [];
        continue;
      }
    }

    // 5. Tactical Advance: Move toward priority objective using high ground
    if (unit.order !== "move" || !unit.destination) {
      // Find high ground near objective for tactical staging
      const tacticalDest = findNearbyHighGround(mission, targetObjective, 4.0);

      unit.order = "move";
      unit.targetUnitId = null;

      if (mission.map.terrain) {
        const path = findPath(mission.map.terrain, unit.position, tacticalDest);
        if (path.length > 1) {
          unit.path = path.slice(1);
          unit.destination = unit.path[0];
        } else {
          unit.destination = tacticalDest;
          unit.path = [tacticalDest];
        }
      } else {
        unit.destination = tacticalDest;
        unit.path = [tacticalDest];
      }
    }
  }
}
