import type { MatchState, MissionDefinition, Side, SupplyPoint, UnitState, Vec2 } from "./types";

/**
 * Fuel consumption rate per world-unit of movement for motorized unit kinds.
 * Infantry moves on foot and does not consume fuel.
 */
const FUEL_CONSUMPTION_PER_UNIT: Record<string, number> = {
  armour: 0.12,
  aircraft: 0.20,
  ship: 0.08,
  "support-weapon": 0.04,
  artillery: 0.06,
  infantry: 0, // foot movement — no fuel
};

/**
 * Ammunition consumption per shot for each unit kind.
 */
const AMMO_CONSUMPTION_PER_SHOT: Record<string, number> = {
  infantry: 1,
  "support-weapon": 1,
  artillery: 2,
  armour: 2,
  aircraft: 1,
  ship: 2,
};

/**
 * Returns the fuel consumption rate per world-unit for a given unit kind.
 */
export function getFuelConsumptionRate(kind: string): number {
  return FUEL_CONSUMPTION_PER_UNIT[kind] ?? 0;
}

/**
 * Returns the ammunition cost per shot for a given unit kind.
 */
export function getAmmoConsumptionPerShot(kind: string): number {
  return AMMO_CONSUMPTION_PER_SHOT[kind] ?? 1;
}

/**
 * Calculates the fire rate multiplier based on remaining ammunition percentage.
 * As ammunition drops below 50%, rate of fire decreases (conservation mode).
 * At 0 ammunition, the unit cannot fire at all.
 */
export function getAmmoFireRateMultiplier(unit: UnitState): number {
  if (unit.ammunition <= 0) return 0;
  if (unit.maxAmmunition <= 0) return 1;
  const ratio = unit.ammunition / unit.maxAmmunition;
  if (ratio >= 0.5) return 1.0;
  // Linear degradation from 1.0 at 50% to 0.3 at 0%
  return 0.3 + ratio * 1.4;
}

/**
 * Calculates the effective speed multiplier based on remaining fuel.
 * Motorized units with no fuel are immobilized. Infantry is unaffected.
 */
export function getFuelSpeedMultiplier(unit: UnitState): number {
  const rate = FUEL_CONSUMPTION_PER_UNIT[unit.kind] ?? 0;
  if (rate === 0) return 1.0; // Infantry — no fuel dependency
  if (unit.fuel <= 0) return 0; // Immobilized
  if (unit.maxFuel <= 0) return 1.0;
  const ratio = unit.fuel / unit.maxFuel;
  if (ratio >= 0.3) return 1.0;
  // Below 30% fuel: gradual slowdown from 1.0 to 0.4
  return 0.4 + (ratio / 0.3) * 0.6;
}

/**
 * Consumes fuel for a unit that has moved a given distance this tick.
 */
export function consumeFuel(unit: UnitState, distanceMoved: number): void {
  const rate = FUEL_CONSUMPTION_PER_UNIT[unit.kind] ?? 0;
  if (rate === 0) return;
  unit.fuel = Math.max(0, unit.fuel - distanceMoved * rate);
}

/**
 * Consumes ammunition for a unit that has fired.
 */
export function consumeAmmunition(unit: UnitState): number {
  const cost = AMMO_CONSUMPTION_PER_SHOT[unit.kind] ?? 1;
  const consumed = Math.min(unit.ammunition, cost);
  unit.ammunition = Math.max(0, unit.ammunition - cost);
  return consumed;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Determines whether a unit is within a supply point's radius.
 */
export function isInSupplyRange(unit: UnitState, sp: SupplyPoint): boolean {
  return unit.side === sp.side && dist(unit.position, sp.position) <= sp.radius;
}

/**
 * Resupplies units near supply points. Each tick, units within range
 * receive ammunition and fuel up to their max, limited by the supply point's
 * remaining stock and per-tick rates.
 */
export function processResupply(
  state: MatchState,
  mission: MissionDefinition,
): void {
  const supplyPoints = mission.supplyPoints;
  if (!supplyPoints || supplyPoints.length === 0) return;

  // Work on a mutable copy of supply point stocks for this tick
  const stocks = new Map<string, number>();
  for (const sp of supplyPoints) {
    stocks.set(sp.id, sp.currentStock);
  }

  const livingUnits = state.units.filter((u) => u.alive);

  for (const sp of supplyPoints) {
    const stock = stocks.get(sp.id)!;
    if (stock <= 0) continue;

    const unitsInRange = livingUnits.filter((u) => isInSupplyRange(u, sp));
    let consumed = 0;

    for (const unit of unitsInRange) {
      if (consumed >= stock) break;

      // Resupply ammunition
      const ammoNeeded = unit.maxAmmunition - unit.ammunition;
      if (ammoNeeded > 0) {
        const ammoGiven = Math.min(sp.ammunitionRate, ammoNeeded, stock - consumed);
        unit.ammunition += ammoGiven;
        consumed += ammoGiven;
      }

      // Resupply fuel
      const fuelNeeded = unit.maxFuel - unit.fuel;
      if (fuelNeeded > 0 && consumed < stock) {
        const fuelGiven = Math.min(sp.fuelRate, fuelNeeded, stock - consumed);
        unit.fuel += fuelGiven;
        consumed += fuelGiven;
      }
    }

    // Update remaining stock
    stocks.set(sp.id, stock - consumed);
    sp.currentStock = stock - consumed;
  }
}

/**
 * Updates the side-level logistics state aggregating unit-level resource status.
 */
export function updateLogisticsState(state: MatchState): void {
  for (const side of ["argentina", "britain"] as Side[]) {
    const sideUnits = state.units.filter((u) => u.alive && u.side === side);
    if (sideUnits.length === 0) continue;

    const totalAmmo = sideUnits.reduce((sum, u) => sum + u.ammunition, 0);
    const totalMaxAmmo = sideUnits.reduce((sum, u) => sum + u.maxAmmunition, 0);

    state.logistics[side].ammunition = totalAmmo;

    // Supply pressure: 0 = fully stocked, 1 = completely depleted
    state.logistics[side].supplyPressure = totalMaxAmmo > 0
      ? 1.0 - totalAmmo / totalMaxAmmo
      : 0;
  }
}
