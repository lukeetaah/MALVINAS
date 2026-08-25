import type { TerrainGrid } from "./terrain-types";
import { getCellIndex, getElevation, hasLineOfSight, isInBounds } from "./terrain";
import type { Side, UnitState, Vec2, WeatherState } from "./types";

export const FOG_UNEXPLORED = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

export interface FogOfWarGrid {
  width: number;
  height: number;
  visibility: Uint8Array; // 0 = unexplored, 1 = explored, 2 = visible
}

/**
 * Creates a new empty Fog of War grid initialized to UNEXPLORED.
 */
export function createFogOfWarGrid(width: number, height: number): FogOfWarGrid {
  return {
    width,
    height,
    visibility: new Uint8Array(width * height),
  };
}

/**
 * Updates the Fog of War grid for a given side based on all living friendly units.
 * Downgrades previously VISIBLE cells to EXPLORED, then casts 3D LOS for current units.
 */
export function updateFogOfWar(
  fog: FogOfWarGrid,
  terrain: TerrainGrid,
  friendlyUnits: UnitState[],
  weather?: WeatherState,
): void {
  // 1. Downgrade VISIBLE to EXPLORED
  for (let i = 0; i < fog.visibility.length; i++) {
    if (fog.visibility[i] === FOG_VISIBLE) {
      fog.visibility[i] = FOG_EXPLORED;
    }
  }

  const visibilityMult = weather?.visibilityMultiplier ?? 1.0;

  // 2. Cast sight circles and 3D LOS from each friendly unit
  for (const unit of friendlyUnits) {
    if (!unit.alive) continue;

    const unitX = Math.round(unit.position.x);
    const unitY = Math.round(unit.position.y);
    const unitElev = getElevation(terrain, unit.position);

    // Height advantage extends sight range (+1 unit of sight per 10m above sea level)
    const baseSight = unit.sightRange * visibilityMult;
    const effectiveSight = Math.max(
      3,
      Math.round(baseSight + Math.max(0, (unitElev - 10) / 10)),
    );

    const minX = Math.max(0, unitX - effectiveSight);
    const maxX = Math.min(fog.width - 1, unitX + effectiveSight);
    const minY = Math.max(0, unitY - effectiveSight);
    const maxY = Math.min(fog.height - 1, unitY + effectiveSight);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dist = Math.hypot(x - unit.position.x, y - unit.position.y);
        if (dist <= effectiveSight) {
          // Check 3D line of sight
          if (hasLineOfSight(terrain, unit.position, { x, y })) {
            const idx = getCellIndex(terrain, x, y);
            fog.visibility[idx] = FOG_VISIBLE;
          }
        }
      }
    }
  }
}

/**
 * Checks whether a specific enemy unit is currently detected by any friendly unit.
 * Requires:
 * 1. Enemy is inside a cell that is currently FOG_VISIBLE.
 * 2. Enemy is within effective detection range (reduced by stealth rating and weather).
 * 3. Friendly unit has unobstructed 3D line-of-sight.
 */
export function isUnitDetected(
  enemyUnit: UnitState,
  friendlyUnits: UnitState[],
  terrain: TerrainGrid,
  fog: FogOfWarGrid,
  weather?: WeatherState,
): boolean {
  if (!enemyUnit.alive) return false;

  const enemyCellIdx = getCellIndex(
    terrain,
    Math.round(enemyUnit.position.x),
    Math.round(enemyUnit.position.y),
  );

  // If the cell is not currently VISIBLE, enemy is not detected
  if (fog.visibility[enemyCellIdx] !== FOG_VISIBLE) {
    return false;
  }

  const visibilityMult = weather?.visibilityMultiplier ?? 1.0;

  // Check if at least one friendly unit has sufficient detection range
  for (const friendly of friendlyUnits) {
    if (!friendly.alive) continue;

    const dist = Math.hypot(
      friendly.position.x - enemyUnit.position.x,
      friendly.position.y - enemyUnit.position.y,
    );

    // Stealth and weather reduce effective detection distance
    const effectiveSight = friendly.sightRange * visibilityMult;
    const effectiveDetectionRange = effectiveSight * (1 - enemyUnit.stealthRating * 0.7);

    if (dist <= effectiveDetectionRange) {
      if (hasLineOfSight(terrain, friendly.position, enemyUnit.position)) {
        return true;
      }
    }
  }

  return false;
}
