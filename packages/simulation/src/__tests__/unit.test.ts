import { describe, it, expect } from "vitest";
import {
  createUnitState,
  applySuppression,
  decaySuppression,
  updateEntrenchment,
  getEffectiveSpeed,
  getEffectiveDamageMultiplier,
  getUnitDefenseCoverBonus,
  assignControlGroup,
  getControlGroupUnitIds,
  isUnitOperational,
  DEFAULT_UNIT_TACTICAL_PROFILES,
} from "../unit";
import { createMissionState, stepMission } from "../mission";
import type { MissionUnitConfig, SimCommand } from "../types";

describe("Unit Entity System", () => {
  const baseConfig: MissionUnitConfig = {
    id: "infantry-test",
    side: "argentina",
    kind: "infantry",
    label: "RI 12 Test Unit",
    position: { x: 20, y: 20 },
    health: 100,
    morale: 0.85,
    ammunition: 60,
    fuel: 1,
    speed: 4.0,
    attackRange: 8,
    damage: 10,
  };

  it("initializes UnitState with tactical profiles", () => {
    const unit = createUnitState(baseConfig);
    expect(unit.id).toBe("infantry-test");
    expect(unit.sightRange).toBe(DEFAULT_UNIT_TACTICAL_PROFILES.infantry.sightRange);
    expect(unit.suppressionPower).toBe(DEFAULT_UNIT_TACTICAL_PROFILES.infantry.suppressionPower);
    expect(unit.suppressionLevel).toBe(0);
    expect(unit.isSuppressed).toBe(false);
    expect(unit.entrenched).toBe(false);
    expect(unit.controlGroup).toBeNull();
  });

  it("accumulates suppression and decays over time", () => {
    const unit = createUnitState(baseConfig);
    expect(unit.isSuppressed).toBe(false);

    // Apply moderate suppression
    applySuppression(unit, 0.5);
    expect(unit.suppressionLevel).toBeCloseTo(0.5);
    expect(unit.isSuppressed).toBe(true);

    // Decay
    decaySuppression(unit, 0.2);
    expect(unit.suppressionLevel).toBeCloseTo(0.3);
    expect(unit.isSuppressed).toBe(false); // Below 0.4 threshold

    // Heavy suppression hits morale
    const initialMorale = unit.morale;
    applySuppression(unit, 0.6); // Total >= 0.7
    expect(unit.morale).toBeLessThan(initialMorale);
  });

  it("handles entrenchment progression, cover bonus and order disruption", () => {
    const unit = createUnitState(baseConfig);
    unit.order = "entrench";

    expect(unit.entrenched).toBe(false);
    expect(getUnitDefenseCoverBonus(unit)).toBe(0);

    // Progress entrenchment
    updateEntrenchment(unit, 50); // 50%
    expect(unit.entrenched).toBe(false);
    expect(unit.entrenchProgress).toBeCloseTo(0.5);

    updateEntrenchment(unit, 50); // 100%
    expect(unit.entrenched).toBe(true);
    expect(getUnitDefenseCoverBonus(unit)).toBe(0.3); // +30% cover
    expect(getEffectiveSpeed(unit)).toBe(0); // Immobile while entrenched

    // Entrenched takes less suppression
    const preSupp = unit.suppressionLevel;
    applySuppression(unit, 0.5);
    expect(unit.suppressionLevel - preSupp).toBeCloseTo(0.3); // 40% reduction

    // Movement breaks entrenchment
    unit.order = "move";
    updateEntrenchment(unit, 1);
    expect(unit.entrenched).toBe(false);
    expect(unit.entrenchProgress).toBe(0);
    expect(getEffectiveSpeed(unit)).toBeGreaterThan(0);
  });

  it("calculates effective speed and damage penalty under suppression and low health", () => {
    const unit = createUnitState(baseConfig);
    expect(getEffectiveSpeed(unit)).toBe(4.0);
    expect(getEffectiveDamageMultiplier(unit)).toBeCloseTo(0.85); // Based on morale 0.85

    // Suppression lowers speed and accuracy
    applySuppression(unit, 0.8);
    expect(getEffectiveSpeed(unit)).toBeLessThan(4.0);
    expect(getEffectiveDamageMultiplier(unit)).toBeLessThan(0.85);

    // Low health lowers speed
    unit.health = 25;
    expect(getEffectiveSpeed(unit)).toBeLessThan(3.0);
  });

  it("assigns and retrieves control groups (Ctrl+1-9)", () => {
    const state = createMissionState();
    const argUnits = state.units.filter((u) => u.side === "argentina");
    const testIds = [argUnits[0].id, argUnits[1].id];

    assignControlGroup(state, "argentina", 1, testIds);

    const retrieved = getControlGroupUnitIds(state, "argentina", 1);
    expect(retrieved).toEqual(testIds);
    expect(argUnits[0].controlGroup).toBe(1);
    expect(argUnits[1].controlGroup).toBe(1);
  });

  it("executes tactical commands HOLD, RETREAT, ENTRENCH, and CONTROL_GROUPS", () => {
    const state = createMissionState();
    const argUnit = state.units.find((u) => u.side === "argentina")!;

    // 1. ENTRENCH
    const entrenchCmd: SimCommand = {
      protocolVersion: 1,
      matchId: state.matchId,
      playerId: "player",
      side: "argentina",
      tick: 1,
      sequence: 0,
      type: "ENTRENCH",
      unitIds: [argUnit.id],
    };
    const state1 = stepMission(state, undefined, [entrenchCmd]);
    const updated1 = state1.units.find((u) => u.id === argUnit.id)!;
    expect(updated1.order).toBe("entrench");

    // 2. HOLD
    const holdCmd: SimCommand = {
      protocolVersion: 1,
      matchId: state.matchId,
      playerId: "player",
      side: "argentina",
      tick: 2,
      sequence: 1,
      type: "HOLD",
      unitIds: [argUnit.id],
    };
    const state2 = stepMission(state1, undefined, [holdCmd]);
    const updated2 = state2.units.find((u) => u.id === argUnit.id)!;
    expect(updated2.order).toBe("hold");

    // 3. RETREAT
    const retreatCmd: SimCommand = {
      protocolVersion: 1,
      matchId: state.matchId,
      playerId: "player",
      side: "argentina",
      tick: 3,
      sequence: 2,
      type: "RETREAT",
      unitIds: [argUnit.id],
    };
    const state3 = stepMission(state2, undefined, [retreatCmd]);
    const updated3 = state3.units.find((u) => u.id === argUnit.id)!;
    expect(updated3.order).toBe("retreat");
    expect(updated3.destination).not.toBeNull();
  });
});
