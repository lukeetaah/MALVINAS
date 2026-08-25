import { describe, it, expect } from "vitest";
import {
  getFuelConsumptionRate,
  getAmmoConsumptionPerShot,
  getAmmoFireRateMultiplier,
  getFuelSpeedMultiplier,
  consumeFuel,
  consumeAmmunition,
  isInSupplyRange,
  processResupply,
  updateLogisticsState,
} from "../logistics";
import { createUnitState } from "../unit";
import { createMissionState, stepMission, GOOSE_GREEN_MISSION } from "../mission";
import type { MissionDefinition, SupplyPoint } from "../types";

describe("Resources & Logistics System", () => {
  const infantryConfig = {
    id: "inf-1",
    side: "argentina" as const,
    kind: "infantry" as const,
    label: "RI 12 Platoon",
    position: { x: 10, y: 10 },
    health: 100,
    morale: 1.0,
    ammunition: 50,
    fuel: 1,
    speed: 4,
    attackRange: 8,
    damage: 10,
  };

  const armourConfig = {
    id: "panhard-1",
    side: "argentina" as const,
    kind: "armour" as const,
    label: "Panhard AML-90",
    position: { x: 20, y: 20 },
    health: 100,
    morale: 1.0,
    ammunition: 30,
    fuel: 80,
    speed: 6,
    attackRange: 12,
    damage: 25,
  };

  it("infantry does not consume fuel; armour/vehicles do", () => {
    expect(getFuelConsumptionRate("infantry")).toBe(0);
    expect(getFuelConsumptionRate("armour")).toBeGreaterThan(0);
    expect(getFuelConsumptionRate("aircraft")).toBeGreaterThan(0);
  });

  it("consumeFuel decreases fuel for motorized units proportional to distance", () => {
    const armour = createUnitState(armourConfig);
    const initialFuel = armour.fuel;
    consumeFuel(armour, 10); // 10 world units of movement
    expect(armour.fuel).toBeLessThan(initialFuel);
    expect(armour.fuel).toBeGreaterThan(0);

    // Infantry should not lose fuel
    const inf = createUnitState(infantryConfig);
    const infFuel = inf.fuel;
    consumeFuel(inf, 10);
    expect(inf.fuel).toBe(infFuel);
  });

  it("getFuelSpeedMultiplier immobilizes motorized units at zero fuel", () => {
    const armour = createUnitState(armourConfig);
    expect(getFuelSpeedMultiplier(armour)).toBe(1.0);

    armour.fuel = 0;
    expect(getFuelSpeedMultiplier(armour)).toBe(0);

    // Infantry is never immobilized by fuel
    const inf = createUnitState(infantryConfig);
    inf.fuel = 0;
    expect(getFuelSpeedMultiplier(inf)).toBe(1.0);
  });

  it("consumeAmmunition subtracts correct amount per unit kind", () => {
    const inf = createUnitState(infantryConfig);
    const before = inf.ammunition;
    const consumed = consumeAmmunition(inf);
    expect(consumed).toBe(getAmmoConsumptionPerShot("infantry"));
    expect(inf.ammunition).toBe(before - consumed);
  });

  it("getAmmoFireRateMultiplier degrades below 50% ammo and stops at zero", () => {
    const inf = createUnitState(infantryConfig);

    // Full or above 50%: multiplier = 1.0
    expect(getAmmoFireRateMultiplier(inf)).toBe(1.0);

    // At 25% ammo: degraded
    inf.ammunition = Math.round(inf.maxAmmunition * 0.25);
    const degraded = getAmmoFireRateMultiplier(inf);
    expect(degraded).toBeLessThan(1.0);
    expect(degraded).toBeGreaterThan(0);

    // At 0 ammo: cannot fire
    inf.ammunition = 0;
    expect(getAmmoFireRateMultiplier(inf)).toBe(0);
  });

  it("processResupply restores ammunition and fuel for units inside supply point radius", () => {
    const supplyPoint: SupplyPoint = {
      id: "sp-darwin",
      side: "argentina",
      position: { x: 10, y: 10 },
      radius: 5,
      ammunitionRate: 3,
      fuelRate: 2,
      capacity: 500,
      currentStock: 500,
    };

    const missionWithSupply: MissionDefinition = {
      ...GOOSE_GREEN_MISSION,
      supplyPoints: [supplyPoint],
    };

    const state = createMissionState();
    // Place unit inside supply point with depleted ammo
    const unit = createUnitState({
      ...infantryConfig,
      ammunition: 10,
      maxAmmunition: 50,
    });
    state.units = [unit];

    processResupply(state, missionWithSupply);

    expect(unit.ammunition).toBeGreaterThan(10);
    expect(supplyPoint.currentStock).toBeLessThan(500);
  });

  it("processResupply does nothing for units outside supply radius", () => {
    const supplyPoint: SupplyPoint = {
      id: "sp-far",
      side: "argentina",
      position: { x: 90, y: 90 },
      radius: 3,
      ammunitionRate: 5,
      fuelRate: 5,
      capacity: 100,
      currentStock: 100,
    };

    const missionWithSupply: MissionDefinition = {
      ...GOOSE_GREEN_MISSION,
      supplyPoints: [supplyPoint],
    };

    const state = createMissionState();
    const unit = createUnitState({
      ...infantryConfig,
      ammunition: 10,
    });
    state.units = [unit];

    processResupply(state, missionWithSupply);

    // Unit is at (10,10), supply at (90,90) — too far
    expect(unit.ammunition).toBe(10);
  });

  it("updateLogisticsState aggregates supply pressure from unit-level resources", () => {
    const state = createMissionState();
    // Deplete some ammo from Argentine units
    for (const u of state.units.filter((u) => u.side === "argentina")) {
      u.ammunition = Math.round(u.maxAmmunition * 0.3);
    }

    updateLogisticsState(state);

    // Supply pressure should be high (close to 0.7)
    expect(state.logistics.argentina.supplyPressure).toBeGreaterThan(0.5);
  });

  it("logistics integration: ammunition depletes during combat in stepMission", () => {
    const state = createMissionState();
    const argUnit = state.units.find((u) => u.side === "argentina" && u.alive)!;
    const ukUnit = state.units.find((u) => u.side === "britain" && u.alive)!;

    // Force them into close combat
    argUnit.position = { x: 50, y: 50 };
    ukUnit.position = { x: 53, y: 50 };
    argUnit.targetUnitId = ukUnit.id;
    argUnit.order = "attack";
    argUnit.cooldownUntilTick = 0;

    const initialAmmo = argUnit.ammunition;

    let current = state;
    for (let t = 0; t < 20; t++) {
      current = stepMission(current);
    }

    const updatedArg = current.units.find((u) => u.id === argUnit.id)!;
    expect(updatedArg.ammunition).toBeLessThan(initialAmmo);
  });
});
