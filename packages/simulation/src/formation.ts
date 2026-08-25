import type { UnitState, Vec2 } from "./types";

/**
 * Calculates orderly spatial offsets for a group of units around a destination center.
 * Arranges units in compact tactical lines.
 */
export function calculateFormationSlots(
  targetCenter: Vec2,
  count: number,
  spacing = 3.2,
  columns = 3,
): Vec2[] {
  if (count <= 1) return [{ x: targetCenter.x, y: targetCenter.y }];

  const slots: Vec2[] = [];
  const actualCols = Math.min(columns, count);
  const rows = Math.ceil(count / actualCols);

  const startOffsetX = -((actualCols - 1) * spacing) / 2;
  const startOffsetY = -((rows - 1) * spacing) / 2;

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / actualCols);
    const col = i % actualCols;

    slots.push({
      x: targetCenter.x + startOffsetX + col * spacing,
      y: targetCenter.y + startOffsetY + row * spacing,
    });
  }

  return slots;
}

/**
 * Computes a soft separation / repulsion vector from nearby units to prevent unnatural overlaps.
 */
export function calculateSeparationVector(
  unit: UnitState,
  allUnits: UnitState[],
  separationRadius = 2.6,
  maxForce = 1.2,
): Vec2 {
  let steerX = 0;
  let steerY = 0;
  let neighborCount = 0;

  for (const other of allUnits) {
    if (other.id === unit.id || !other.alive) continue;

    const dx = unit.position.x - other.position.x;
    const dy = unit.position.y - other.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0 && dist < separationRadius) {
      // Repulsion force inversely proportional to distance
      const force = (separationRadius - dist) / separationRadius;
      steerX += (dx / dist) * force;
      steerY += (dy / dist) * force;
      neighborCount++;
    }
  }

  if (neighborCount === 0) return { x: 0, y: 0 };

  const length = Math.hypot(steerX, steerY);
  if (length > maxForce) {
    return {
      x: (steerX / length) * maxForce,
      y: (steerY / length) * maxForce,
    };
  }

  return { x: steerX, y: steerY };
}
