import { describe, it, expect } from "vitest";
import {
  getAllMissions,
  getMissionById,
  MOUNT_LONGDON_MISSION,
  SAN_CARLOS_MISSION,
  processScheduledReinforcements,
  evaluateSecondaryObjectives,
  calculateMissionScore,
} from "../mission-system";
import { createMissionState, stepMission, GOOSE_GREEN_MISSION } from "../mission";
import { getElevation } from "../terrain";

describe("Mission & Campaign System", () => {
  it("registers and retrieves all historical mission scenarios", () => {
    const missions = getAllMissions();
    expect(missions.length).toBeGreaterThanOrEqual(3);

    const longdon = getMissionById("mount-longdon-1982");
    expect(longdon).toBeDefined();
    expect(longdon?.title["es-AR"]).toContain("Monte Longdon");

    const sanCarlos = getMissionById("san-carlos-1982");
    expect(sanCarlos).toBeDefined();
    expect(sanCarlos?.title["es-AR"]).toContain("San Carlos");
  });

  it("Mount Longdon terrain contains high elevation rocky ridge crests", () => {
    const terrain = MOUNT_LONGDON_MISSION.map.terrain!;
    expect(terrain).toBeDefined();
    // Peak at (38, 28) should be >= 170m
    const peakElev = getElevation(terrain, { x: 38, y: 28 });
    expect(peakElev).toBeGreaterThanOrEqual(170);
  });

  it("spawns scheduled reinforcements at designated simulation time", () => {
    const state = createMissionState(MOUNT_LONGDON_MISSION);
    const initialUnitCount = state.units.length;

    // Reinforcement scheduled at 60s (tick 600)
    state.tick = 599;
    processScheduledReinforcements(state, MOUNT_LONGDON_MISSION);
    expect(state.units.length).toBe(initialUnitCount);

    // Exact tick 600: reinforcement spawns
    state.tick = 600;
    processScheduledReinforcements(state, MOUNT_LONGDON_MISSION);
    expect(state.units.length).toBe(initialUnitCount + 1);

    const reinforcementUnit = state.units.find((u) => u.id === "ri7-castaneda-sec");
    expect(reinforcementUnit).toBeDefined();
    expect(reinforcementUnit?.label).toContain("Castañeda");

    // Event log received notification
    const reinEvent = state.eventLog.find((e) => e.type === "reinforcement");
    expect(reinEvent).toBeDefined();
  });

  it("evaluates secondary objectives correctly", () => {
    const state = createMissionState(MOUNT_LONGDON_MISSION);

    // Initial state: 100% infantry alive => preserve-infantry secondary objective is completed
    const completed = evaluateSecondaryObjectives(state, MOUNT_LONGDON_MISSION, "argentina");
    expect(completed).toContain("longdon-preserve-infantry");

    // British mortars are still alive => destroy-mortars not yet completed
    expect(completed).not.toContain("longdon-destroy-mortars");

    // Kill British mortars
    const mortars = state.units.find((u) => u.id === "3para-mortars")!;
    mortars.alive = false;
    mortars.health = 0;

    const completedAfterMortars = evaluateSecondaryObjectives(state, MOUNT_LONGDON_MISSION, "argentina");
    expect(completedAfterMortars).toContain("longdon-destroy-mortars");
  });

  it("calculates comprehensive tactical mission score and rating", () => {
    const state = createMissionState(MOUNT_LONGDON_MISSION);
    state.winner = "argentina";
    state.status = "victory";

    const score = calculateMissionScore(state, MOUNT_LONGDON_MISSION, "argentina");
    expect(score.primaryCompleted).toBe(true);
    expect(score.totalScore).toBeGreaterThan(1000);
    expect(score.rating).toMatch(/decisive-victory|marginal-victory/);
    expect(score.losses.argentina).toBe(0);
  });

  it("integrates scheduled reinforcements smoothly into stepMission loop", () => {
    const state = createMissionState(MOUNT_LONGDON_MISSION);
    const initialUnitCount = state.units.length;

    // Fast-forward to tick 599
    state.tick = 599;

    // Step 1 tick -> tick 600
    const next = stepMission(state, MOUNT_LONGDON_MISSION);
    expect(next.units.length).toBe(initialUnitCount + 1);
  });
});
