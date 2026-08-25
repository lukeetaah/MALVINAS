import type { UnitKind, UnitState, Vec2 } from "@malvinas/simulation";

export interface BoundingBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Calculates a bounding box from two opposite world corner points.
 */
export function createBoundingBox(p1: Vec2, p2: Vec2): BoundingBox {
  return {
    xMin: Math.min(p1.x, p2.x),
    xMax: Math.max(p1.x, p2.x),
    yMin: Math.min(p1.y, p2.y),
    yMax: Math.max(p1.y, p2.y),
  };
}

/**
 * Filters own units contained within the given world bounding box.
 */
export function getUnitsInBox(
  units: UnitState[],
  playerSide: string,
  box: BoundingBox,
): string[] {
  return units
    .filter(
      (u) =>
        u.side === playerSide &&
        u.alive &&
        u.position.x >= box.xMin &&
        u.position.x <= box.xMax &&
        u.position.y >= box.yMin &&
        u.position.y <= box.yMax,
    )
    .map((u) => u.id);
}

/**
 * Toggles a unit in the current selection: adds if not present, removes if already selected.
 */
export function toggleUnitSelection(
  currentSelectedIds: string[],
  unitId: string,
): string[] {
  if (currentSelectedIds.includes(unitId)) {
    return currentSelectedIds.filter((id) => id !== unitId);
  }
  return [...currentSelectedIds, unitId];
}

/**
 * Finds all visible friendly units matching the target unit's kind.
 */
export function getUnitsOfSameKind(
  units: UnitState[],
  playerSide: string,
  targetKind: UnitKind,
): string[] {
  return units
    .filter((u) => u.side === playerSide && u.alive && u.kind === targetKind)
    .map((u) => u.id);
}

/**
 * Cycles to the next unit within the currently selected list.
 */
export function getNextSelectedUnitId(
  selectedIds: string[],
  currentFocusedId: string | null,
): string | null {
  if (selectedIds.length === 0) return null;
  if (!currentFocusedId) return selectedIds[0];

  const currentIndex = selectedIds.indexOf(currentFocusedId);
  if (currentIndex === -1) return selectedIds[0];

  const nextIndex = (currentIndex + 1) % selectedIds.length;
  return selectedIds[nextIndex];
}
