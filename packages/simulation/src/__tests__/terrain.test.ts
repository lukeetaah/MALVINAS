import { describe, it, expect } from "vitest";
import {
  createTerrainGrid,
  getCellIndex,
  isInBounds,
  getTerrainType,
  getElevation,
  getMovementCost,
  getCover,
  isPassable,
  hasLineOfSight,
  buildTerrainGridFromDefinition,
  GOOSE_GREEN_TERRAIN_GRID,
  type MapTerrainDefinition,
} from "../terrain";
import { TERRAIN_PROPERTIES } from "../terrain-types";

describe("Terrain System", () => {
  it("initializes a grid with default dimensions and values", () => {
    const grid = createTerrainGrid(20, 10, "open-grass", 15);
    expect(grid.width).toBe(20);
    expect(grid.height).toBe(10);
    expect(grid.cells.length).toBe(200);
    expect(grid.elevations.length).toBe(200);
    expect(getTerrainType(grid, { x: 5, y: 5 })).toBe("open-grass");
    expect(getElevation(grid, { x: 5, y: 5 })).toBe(15);
    expect(getCover(grid, { x: 5, y: 5 })).toBe(TERRAIN_PROPERTIES["open-grass"].coverModifier);
    expect(getMovementCost(grid, { x: 5, y: 5 })).toBe(TERRAIN_PROPERTIES["open-grass"].movementCost);
    expect(isPassable(grid, { x: 5, y: 5 })).toBe(true);
  });

  it("calculates flat index and bounds correctly", () => {
    const grid = createTerrainGrid(10, 10);
    expect(getCellIndex(grid, 0, 0)).toBe(0);
    expect(getCellIndex(grid, 3, 2)).toBe(23);
    expect(isInBounds(grid, 0, 0)).toBe(true);
    expect(isInBounds(grid, 9, 9)).toBe(true);
    expect(isInBounds(grid, -1, 5)).toBe(false);
    expect(isInBounds(grid, 10, 5)).toBe(false);
  });

  it("handles out of bounds queries gracefully", () => {
    const grid = createTerrainGrid(10, 10);
    expect(getTerrainType(grid, { x: -5, y: 0 })).toBe("water");
    expect(getElevation(grid, { x: 100, y: 100 })).toBe(0);
    expect(isPassable(grid, { x: -1, y: 0 })).toBe(false);
  });

  it("builds grid from terrain definition with various zone geometries", () => {
    const customDef: MapTerrainDefinition = {
      id: "test-map",
      width: 20,
      height: 20,
      zones: [
        {
          name: "Water Shore",
          type: "water",
          elevation: 0,
          bounds: { xMin: 0, xMax: 3, yMin: 0, yMax: 20 },
        },
        {
          name: "High Ridge",
          type: "rocky-ridge",
          elevation: 50,
          center: { x: 10, y: 10 },
          radius: 3,
        },
        {
          name: "Town Area",
          type: "settlement",
          elevation: 12,
          center: { x: 16, y: 16 },
          size: { width: 4, height: 4 },
        },
        {
          name: "Dirt Road",
          type: "road",
          elevation: 10,
          waypoints: [
            { x: 3, y: 5 },
            { x: 10, y: 5 },
          ],
        },
      ],
    };

    const grid = buildTerrainGridFromDefinition(customDef, "open-grass", 5);

    // Water zone
    expect(getTerrainType(grid, { x: 1, y: 10 })).toBe("water");
    expect(isPassable(grid, { x: 1, y: 10 })).toBe(false);

    // Rocky ridge
    expect(getTerrainType(grid, { x: 10, y: 10 })).toBe("rocky-ridge");
    expect(getElevation(grid, { x: 10, y: 10 })).toBe(50);
    expect(getCover(grid, { x: 10, y: 10 })).toBe(0.45);

    // Settlement
    expect(getTerrainType(grid, { x: 16, y: 16 })).toBe("settlement");
    expect(getElevation(grid, { x: 16, y: 16 })).toBe(12);

    // Road waypoint
    expect(getTerrainType(grid, { x: 6, y: 5 })).toBe("road");
    expect(getMovementCost(grid, { x: 6, y: 5 })).toBe(0.75); // Fast road movement
  });

  it("loads GOOSE_GREEN_TERRAIN_GRID with accurate geography", () => {
    expect(GOOSE_GREEN_TERRAIN_GRID.width).toBe(100);
    expect(GOOSE_GREEN_TERRAIN_GRID.height).toBe(60);

    // West coast is water
    expect(getTerrainType(GOOSE_GREEN_TERRAIN_GRID, { x: 2, y: 20 })).toBe("water");
    expect(isPassable(GOOSE_GREEN_TERRAIN_GRID, { x: 2, y: 20 })).toBe(false);

    // Darwin Hill ridge has high elevation
    expect(getTerrainType(GOOSE_GREEN_TERRAIN_GRID, { x: 36, y: 24 })).toBe("rocky-ridge");
    expect(getElevation(GOOSE_GREEN_TERRAIN_GRID, { x: 36, y: 24 })).toBe(48);

    // Goose Green settlement has settlement cover
    expect(getTerrainType(GOOSE_GREEN_TERRAIN_GRID, { x: 23, y: 42 })).toBe("settlement");
    expect(getCover(GOOSE_GREEN_TERRAIN_GRID, { x: 23, y: 42 })).toBe(0.55);

    // Darwin airstrip
    expect(getTerrainType(GOOSE_GREEN_TERRAIN_GRID, { x: 18, y: 18 })).toBe("airstrip");
  });

  describe("Line of Sight (LOS)", () => {
    it("allows LOS over flat open ground", () => {
      const grid = createTerrainGrid(20, 20, "open-grass", 10);
      expect(hasLineOfSight(grid, { x: 2, y: 2 }, { x: 18, y: 18 })).toBe(true);
    });

    it("blocks LOS when a high ridge sits between two valley points", () => {
      const grid = createTerrainGrid(20, 20, "open-grass", 5);
      // Place a high wall/ridge in the middle
      for (let y = 0; y < 20; y++) {
        const idx = getCellIndex(grid, 10, y);
        grid.cells[idx] = "rocky-ridge";
        grid.elevations[idx] = 40;
      }

      // Points on either side of the ridge at elevation 5 cannot see each other
      expect(hasLineOfSight(grid, { x: 2, y: 10 }, { x: 18, y: 10 })).toBe(false);

      // But an observer standing on top of the ridge can see both sides
      expect(hasLineOfSight(grid, { x: 10, y: 10 }, { x: 2, y: 10 })).toBe(true);
      expect(hasLineOfSight(grid, { x: 10, y: 10 }, { x: 18, y: 10 })).toBe(true);
    });

    it("blocks LOS through buildings unless observer is sufficiently high", () => {
      const grid = createTerrainGrid(20, 20, "open-grass", 10);
      const idx = getCellIndex(grid, 10, 10);
      grid.cells[idx] = "settlement";

      // Observer at same elevation cannot see through the building
      expect(hasLineOfSight(grid, { x: 5, y: 10 }, { x: 15, y: 10 })).toBe(false);

      // Elevated observer on a hill overlooking the building CAN see over it
      const elevatedObserverGrid = createTerrainGrid(20, 20, "open-grass", 10);
      const elevatedIdx = getCellIndex(elevatedObserverGrid, 2, 10);
      elevatedObserverGrid.elevations[elevatedIdx] = 50;
      elevatedObserverGrid.cells[getCellIndex(elevatedObserverGrid, 10, 10)] = "settlement";

      expect(
        hasLineOfSight(elevatedObserverGrid, { x: 2, y: 10 }, { x: 18, y: 10 }),
      ).toBe(true);
    });
  });
});
