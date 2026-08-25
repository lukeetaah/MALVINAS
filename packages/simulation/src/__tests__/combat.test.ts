import { describe, it, expect } from "vitest";
import {
  calculateElevationCombatModifier,
  calculateArmorMitigation,
  calculateHitProbability,
  calculateAttack,
  resolveAreaSplash,
} from "../combat";
import { createTerrainGrid, getCellIndex } from "../terrain";
import { createUnitState } from "../unit";
import type { MissionUnitConfig } from "../types";

describe("Combat Resolution System", () => {
  const baseConfig: MissionUnitConfig = {
    id: "inf-arg-1",
    side: "argentina",
    kind: "infantry",
    label: "RI 12 Sec 1",
    position: { x: 10, y: 10 },
    health: 100,
    morale: 1.0,
    ammunition: 50,
    fuel: 1,
    speed: 4,
    attackRange: 10,
    damage: 20,
  };

  const targetConfig: MissionUnitConfig = {
    id: "inf-uk-1",
    side: "britain",
    kind: "infantry",
    label: "2 PARA A Coy",
    position: { x: 15, y: 10 },
    health: 100,
    morale: 1.0,
    ammunition: 50,
    fuel: 1,
    speed: 4,
    attackRange: 10,
    damage: 20,
  };

  describe("Elevation Combat Modifiers (High Ground)", () => {
    it("rewards attacker on higher ground with range and damage multipliers", () => {
      const grid = createTerrainGrid(30, 30, "open-grass", 10);
      // Set attacker cell elevation to 50m and defender to 10m (+40m diff)
      grid.elevations[getCellIndex(grid, 10, 10)] = 50;
      grid.elevations[getCellIndex(grid, 15, 10)] = 10;

      const mod = calculateElevationCombatModifier(
        grid,
        { x: 10, y: 10 },
        { x: 15, y: 10 },
      );

      expect(mod.elevDiff).toBe(40);
      expect(mod.damageMult).toBeGreaterThan(1.15);
      expect(mod.rangeMult).toBeGreaterThan(1.1);
    });

    it("penalizes attacker shooting uphill", () => {
      const grid = createTerrainGrid(30, 30, "open-grass", 10);
      grid.elevations[getCellIndex(grid, 10, 10)] = 10;
      grid.elevations[getCellIndex(grid, 15, 10)] = 50;

      const mod = calculateElevationCombatModifier(
        grid,
        { x: 10, y: 10 },
        { x: 15, y: 10 },
      );

      expect(mod.elevDiff).toBe(-40);
      expect(mod.damageMult).toBeLessThan(0.85);
      expect(mod.rangeMult).toBeLessThan(0.9);
    });
  });

  describe("Armor vs Penetration", () => {
    it("mitigates damage when penetration is lower than target armor", () => {
      const lowPen = calculateArmorMitigation(0.2, 0.8);
      expect(lowPen.mitigated).toBe(true);
      expect(lowPen.damageFactor).toBeLessThan(0.5);

      const highPen = calculateArmorMitigation(0.9, 0.3);
      expect(highPen.mitigated).toBe(false);
      expect(highPen.damageFactor).toBe(1.0);
    });
  });

  describe("Hit Probability & Suppression", () => {
    it("drops accuracy when distance increases or attacker is suppressed", () => {
      const attacker = createUnitState(baseConfig);
      const accClose = calculateHitProbability(2, 10, attacker);
      const accFar = calculateHitProbability(9, 10, attacker);

      expect(accClose).toBeGreaterThan(accFar);

      attacker.suppressionLevel = 0.8;
      const accSuppressed = calculateHitProbability(2, 10, attacker);
      expect(accSuppressed).toBeLessThan(accClose);
    });

    it("deals direct damage on hit and applies suppression", () => {
      const attacker = createUnitState(baseConfig);
      const target = createUnitState(targetConfig);

      // Force hit by providing 0.0 random roll
      const result = calculateAttack(attacker, target, undefined, 0.0);
      expect(result.hit).toBe(true);
      expect(result.damage).toBeGreaterThan(0);
      expect(result.suppressionDealt).toBeGreaterThan(0);
    });
  });

  describe("Area of Effect (AoE) Splash", () => {
    it("applies splash damage and suppression to all enemies in blast radius", () => {
      const target1 = createUnitState({
        ...targetConfig,
        id: "uk-1",
        position: { x: 20, y: 20 },
      });
      const target2 = createUnitState({
        ...targetConfig,
        id: "uk-2",
        position: { x: 22, y: 20 },
      });
      const ally = createUnitState({
        ...baseConfig,
        id: "arg-1",
        position: { x: 21, y: 20 },
      });

      const affected = resolveAreaSplash(
        {
          center: { x: 20, y: 20 },
          radius: 5.0,
          primaryDamage: 30,
          suppressionPower: 0.6,
        },
        [target1, target2, ally],
        "argentina",
      );

      // Should affect both enemies in radius, but not the friendly unit
      expect(affected.map((a) => a.unit.id)).toEqual(["uk-1", "uk-2"]);
      expect(target1.health).toBeLessThan(100);
      expect(target1.suppressionLevel).toBeGreaterThan(0);
      expect(ally.health).toBe(100); // Unharmed friendly
    });
  });
});
