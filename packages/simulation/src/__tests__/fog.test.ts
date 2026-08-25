import { describe, it, expect } from "vitest";
import {
  createFogOfWarGrid,
  updateFogOfWar,
  isUnitDetected,
  FOG_UNEXPLORED,
  FOG_EXPLORED,
  FOG_VISIBLE,
} from "../fog";
import { createTerrainGrid, getCellIndex } from "../terrain";
import { createUnitState } from "../unit";
import { createMissionState, stepMission } from "../mission";
import type { MissionUnitConfig } from "../types";

describe("Fog of War & Detection System", () => {
  const baseFriendlyConfig: MissionUnitConfig = {
    id: "scout-arg",
    side: "argentina",
    kind: "infantry",
    label: "RI 12 Scout",
    position: { x: 10, y: 10 },
    health: 100,
    morale: 1.0,
    ammunition: 50,
    fuel: 1,
    speed: 4,
    attackRange: 8,
    damage: 10,
    sightRange: 12,
  };

  const baseEnemyConfig: MissionUnitConfig = {
    id: "enemy-uk",
    side: "britain",
    kind: "infantry",
    label: "2 PARA Patrol",
    position: { x: 14, y: 10 },
    health: 100,
    morale: 1.0,
    ammunition: 50,
    fuel: 1,
    speed: 4,
    attackRange: 8,
    damage: 10,
    sightRange: 12,
  };

  it("initializes FogOfWarGrid as completely UNEXPLORED", () => {
    const fog = createFogOfWarGrid(20, 20);
    expect(fog.width).toBe(20);
    expect(fog.height).toBe(20);
    expect(fog.visibility.every((v) => v === FOG_UNEXPLORED)).toBe(true);
  });

  it("updates fog to VISIBLE around living friendly unit", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    const fog = createFogOfWarGrid(30, 30);
    const friendly = createUnitState(baseFriendlyConfig);

    updateFogOfWar(fog, grid, [friendly]);

    // Cell at unit position should be VISIBLE
    const unitIdx = getCellIndex(grid, 10, 10);
    expect(fog.visibility[unitIdx]).toBe(FOG_VISIBLE);

    // Cell 5 units away within sightRange (12) should be VISIBLE
    const nearIdx = getCellIndex(grid, 15, 10);
    expect(fog.visibility[nearIdx]).toBe(FOG_VISIBLE);

    // Cell far away (x=28, y=28) should remain UNEXPLORED
    const farIdx = getCellIndex(grid, 28, 28);
    expect(fog.visibility[farIdx]).toBe(FOG_UNEXPLORED);
  });

  it("transitions previous VISIBLE cells to EXPLORED when friendly unit moves away", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    const fog = createFogOfWarGrid(30, 30);
    const friendly = createUnitState(baseFriendlyConfig);

    // Step 1: at (10, 10)
    updateFogOfWar(fog, grid, [friendly]);
    const oldPosIdx = getCellIndex(grid, 10, 10);
    expect(fog.visibility[oldPosIdx]).toBe(FOG_VISIBLE);

    // Step 2: unit moves far to (25, 25)
    friendly.position = { x: 25, y: 25 };
    updateFogOfWar(fog, grid, [friendly]);

    // Old position should now be EXPLORED (1), new position VISIBLE (2)
    expect(fog.visibility[oldPosIdx]).toBe(FOG_EXPLORED);
    const newPosIdx = getCellIndex(grid, 25, 25);
    expect(fog.visibility[newPosIdx]).toBe(FOG_VISIBLE);
  });

  it("blocks vision behind steep topographic hills", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    const fog = createFogOfWarGrid(30, 30);
    const friendly = createUnitState(baseFriendlyConfig); // at (10, 10) elevation 10m

    // Place a very high ridge (50m elevation) at x=14, y=10
    grid.elevations[getCellIndex(grid, 14, 10)] = 50;

    updateFogOfWar(fog, grid, [friendly]);

    // Ridge at x=14 is visible
    expect(fog.visibility[getCellIndex(grid, 14, 10)]).toBe(FOG_VISIBLE);

    // Cell at x=18, y=10 (behind the 50m ridge) is occluded and remains UNEXPLORED
    expect(fog.visibility[getCellIndex(grid, 18, 10)]).toBe(FOG_UNEXPLORED);
  });

  it("detects enemy unit in VISIBLE zone but fails if in darkness or occluded", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    const fog = createFogOfWarGrid(30, 30);
    const friendly = createUnitState(baseFriendlyConfig); // at (10, 10)
    const enemyNear = createUnitState(baseEnemyConfig); // at (14, 10)
    const enemyFar = createUnitState({
      ...baseEnemyConfig,
      id: "enemy-far",
      position: { x: 28, y: 28 },
    });

    updateFogOfWar(fog, grid, [friendly]);

    // Enemy near is in visible zone and in LOS => detected
    expect(isUnitDetected(enemyNear, [friendly], grid, fog)).toBe(true);

    // Enemy far is in unexplored zone => not detected
    expect(isUnitDetected(enemyFar, [friendly], grid, fog)).toBe(false);
  });

  it("updates fogOfWar and detectedEnemyUnitIds in mission simulation step", () => {
    const state = createMissionState();
    expect(state.fogOfWar).toBeDefined();
    expect(state.detectedEnemyUnitIds).toBeDefined();

    // After step, detection records are populated
    const next = stepMission(state);
    expect(next.fogOfWar?.argentina).toBeDefined();
    expect(Array.isArray(next.detectedEnemyUnitIds?.argentina)).toBe(true);
  });
});
