import { describe, it, expect } from "vitest";
import {
  findPath,
  smoothPath,
  isLinePassable,
} from "../pathfinding";
import {
  calculateFormationSlots,
  calculateSeparationVector,
} from "../formation";
import { createTerrainGrid, getCellIndex } from "../terrain";
import { createMissionState, stepMission } from "../mission";
import type { SimCommand, UnitState } from "../types";

describe("Movement & Pathfinding System", () => {
  it("finds a direct path on open unobstructed grassland", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    const path = findPath(grid, { x: 5, y: 5 }, { x: 25, y: 25 });

    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual({ x: 5, y: 5 });
    expect(path[path.length - 1]).toEqual({ x: 25, y: 25 });
  });

  it("navigates around an impassable water barrier", () => {
    const grid = createTerrainGrid(30, 30, "open-grass", 10);
    // Create a vertical wall of water from y=0 to y=20 at x=15
    for (let y = 0; y <= 20; y++) {
      const idx = getCellIndex(grid, 15, y);
      grid.cells[idx] = "water";
    }

    const path = findPath(grid, { x: 5, y: 10 }, { x: 25, y: 10 });
    expect(path.length).toBeGreaterThanOrEqual(2);

    // Ensure none of the generated path points step on water
    for (const pt of path) {
      const cellX = Math.floor(pt.x);
      const cellY = Math.floor(pt.y);
      if (cellX === 15) {
        expect(cellY).toBeGreaterThan(20); // Must have routed around the wall (y > 20)
      }
    }
  });

  it("returns empty path when goal is completely unreachable / surrounded by water", () => {
    const grid = createTerrainGrid(20, 20, "open-grass", 10);
    // Enclose goal in water
    for (let x = 10; x <= 14; x++) {
      for (let y = 10; y <= 14; y++) {
        if (x === 10 || x === 14 || y === 10 || y === 14) {
          grid.cells[getCellIndex(grid, x, y)] = "water";
        }
      }
    }

    const path = findPath(grid, { x: 2, y: 2 }, { x: 12, y: 12 });
    expect(path).toEqual([]);
  });

  it("smoothes redundant zig-zags along clear lines of sight", () => {
    const grid = createTerrainGrid(20, 20, "open-grass", 10);
    const rawPath = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ];

    const smoothed = smoothPath(grid, rawPath);
    expect(smoothed.length).toBe(2);
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[1]).toEqual({ x: 5, y: 5 });
  });

  describe("Formation Distribution", () => {
    it("generates separate spatial slots for multi-unit groups", () => {
      const target = { x: 50, y: 30 };
      const slots = calculateFormationSlots(target, 4, 4.0);

      expect(slots.length).toBe(4);
      // All slots should be near target
      for (const slot of slots) {
        expect(Math.hypot(slot.x - target.x, slot.y - target.y)).toBeLessThan(10);
      }

      // Slots must not overlap each other
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const d = Math.hypot(slots[i].x - slots[j].x, slots[i].y - slots[j].y);
          expect(d).toBeGreaterThanOrEqual(3.0);
        }
      }
    });
  });

  describe("Local Unit Separation", () => {
    it("generates repulsion force when two units are too close", () => {
      const u1: UnitState = {
        id: "u1",
        side: "argentina",
        kind: "infantry",
        label: "Unit 1",
        position: { x: 10, y: 10 },
        health: 100,
        morale: 1,
        ammunition: 50,
        fuel: 1,
        selected: false,
        order: "idle",
        destination: null,
        targetUnitId: null,
        speed: 4,
        attackRange: 8,
        damage: 10,
        cooldownUntilTick: 0,
        alive: true,
        sightRange: 14,
        stealthRating: 0.35,
        armorRating: 0,
        penetrationRating: 0.15,
        suppressionPower: 0.1,
        suppressionLevel: 0,
        isSuppressed: false,
        entrenched: false,
        entrenchProgress: 0,
        controlGroup: null,
        path: [],
        maxAmmunition: 50,
        maxFuel: 1,
      };

      const u2: UnitState = {
        ...u1,
        id: "u2",
        position: { x: 11, y: 10 }, // 1 unit away (within 2.6 radius)
      };

      const separation = calculateSeparationVector(u1, [u1, u2], 2.6);
      expect(separation.x).toBeLessThan(0); // u1 should be pushed left away from u2
      expect(Math.hypot(separation.x, separation.y)).toBeGreaterThan(0);
    });
  });

  describe("Simulation Step Integration", () => {
    it("moves units along waypoints and reaches final destination", () => {
      const state = createMissionState();
      const argUnit = state.units.find((u) => u.side === "argentina")!;
      const initialPos = { ...argUnit.position };

      const moveCmd: SimCommand = {
        protocolVersion: 1,
        matchId: state.matchId,
        playerId: "player",
        side: "argentina",
        tick: 1,
        sequence: 0,
        type: "MOVE",
        unitIds: [argUnit.id],
        targetPosition: { x: initialPos.x + 8, y: initialPos.y + 4 },
      };

      let current = stepMission(state, undefined, [moveCmd]);
      const movingUnit = current.units.find((u) => u.id === argUnit.id)!;
      expect(movingUnit.order).toBe("move");
      expect(movingUnit.destination).not.toBeNull();

      // Step 20 ticks (2 seconds)
      for (let t = 0; t < 20; t++) {
        current = stepMission(current);
      }

      const progressedUnit = current.units.find((u) => u.id === argUnit.id)!;
      expect(progressedUnit.position.x).toBeGreaterThan(initialPos.x);
    });
  });
});
