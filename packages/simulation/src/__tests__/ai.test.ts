import { describe, it, expect } from "vitest";
import {
  findPriorityObjective,
  findNearbyHighGround,
  executeAiCycle,
} from "../ai";
import { createTerrainGrid, getCellIndex } from "../terrain";
import { createUnitState } from "../unit";
import { createMissionState, stepMission, GOOSE_GREEN_MISSION } from "../mission";
import type { MatchState, MissionDefinition, UnitState } from "../types";

describe("AI Tactical Decision Engine", () => {
  it("selects unheld or contested priority objectives for the AI side", () => {
    const state = createMissionState();
    const objective = findPriorityObjective(state, GOOSE_GREEN_MISSION, "britain");

    expect(objective).toBeDefined();
    expect(typeof objective.x).toBe("number");
    expect(typeof objective.y).toBe("number");
  });

  it("finds nearby high ground elevation for tactical firing", () => {
    const terrain = createTerrainGrid(30, 30, "open-grass", 10);
    // Create a hill at (12, 12) with elevation 45m
    terrain.elevations[getCellIndex(terrain, 12, 12)] = 45;

    const mission: MissionDefinition = {
      ...GOOSE_GREEN_MISSION,
      map: {
        ...GOOSE_GREEN_MISSION.map,
        terrain,
      },
    };

    const bestPos = findNearbyHighGround(mission, { x: 10, y: 10 }, 4.0);
    expect(bestPos.x).toBe(12);
    expect(bestPos.y).toBe(12);
  });

  it("orders defensive garrison units inside objective features to entrench", () => {
    const state = createMissionState();
    const airbaseFeature = GOOSE_GREEN_MISSION.map.features.find(
      (f) => f.id === "darwin-airfield",
    )!;

    // Place an Argentine infantry unit directly inside the airbase feature with no enemies detected
    const argInf = createUnitState({
      id: "ai-garrison",
      side: "argentina",
      kind: "infantry",
      label: "RI 12 Garrison",
      position: { ...airbaseFeature.position },
      health: 100,
      morale: 1.0,
      ammunition: 50,
      fuel: 1,
      speed: 4,
      attackRange: 8,
      damage: 10,
    });

    state.units = [argInf];
    state.detectedEnemyUnitIds = { argentina: [], britain: [] };

    executeAiCycle(state, GOOSE_GREEN_MISSION, "argentina");

    expect(argInf.order).toBe("entrench");
  });

  it("orders artillery units to bombard detected enemy targets in range", () => {
    const state = createMissionState();
    const artUnit = createUnitState({
      id: "ai-artillery",
      side: "argentina",
      kind: "artillery",
      label: "GAA 4 Battery",
      position: { x: 20, y: 20 },
      health: 100,
      morale: 1.0,
      ammunition: 30,
      fuel: 1,
      speed: 1,
      attackRange: 25,
      damage: 35,
    });

    const enemyUnit = createUnitState({
      id: "uk-target",
      side: "britain",
      kind: "infantry",
      label: "2 PARA Patrol",
      position: { x: 30, y: 20 }, // 10 units away (within 25 attackRange)
      health: 100,
      morale: 1.0,
      ammunition: 50,
      fuel: 1,
      speed: 4,
      attackRange: 8,
      damage: 10,
    });

    state.units = [artUnit, enemyUnit];
    state.detectedEnemyUnitIds = {
      argentina: ["uk-target"],
      britain: [],
    };

    executeAiCycle(state, GOOSE_GREEN_MISSION, "argentina");

    expect(artUnit.order).toBe("attack");
    expect(artUnit.targetUnitId).toBe("uk-target");
  });

  it("triggers tactical retreat when unit is critically damaged and suppressed", () => {
    const state = createMissionState();
    const brokenUnit = createUnitState({
      id: "ai-broken",
      side: "britain",
      kind: "infantry",
      label: "2 PARA Survivor",
      position: { x: 50, y: 30 },
      health: 15, // < 25%
      morale: 0.2, // < 0.25
      ammunition: 10,
      fuel: 1,
      speed: 4,
      attackRange: 8,
      damage: 10,
    });
    brokenUnit.isSuppressed = true;
    brokenUnit.suppressionLevel = 0.9;

    state.units = [brokenUnit];
    state.detectedEnemyUnitIds = { argentina: [], britain: [] };

    executeAiCycle(state, GOOSE_GREEN_MISSION, "britain");

    expect(brokenUnit.order).toBe("retreat");
    expect(brokenUnit.destination).not.toBeNull();
  });

  it("advances AI units in mission step towards priority objectives", () => {
    const state = createMissionState();
    const ukUnit = state.units.find((u) => u.side === "britain" && u.alive)!;
    const initialPos = { ...ukUnit.position };

    // Step mission with AI controlling britain
    let current = state;
    for (let t = 0; t < 15; t++) {
      current = stepMission(current, GOOSE_GREEN_MISSION, [], "britain");
    }

    const updatedUkUnit = current.units.find((u) => u.id === ukUnit.id)!;
    // Unit should have received move orders and advanced
    expect(updatedUkUnit.order === "move" || updatedUkUnit.order === "attack").toBe(true);
    expect(updatedUkUnit.position.x !== initialPos.x || updatedUkUnit.position.y !== initialPos.y).toBe(true);
  });
});
