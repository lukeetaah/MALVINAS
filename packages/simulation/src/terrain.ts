import rawTerrainData from "../../../data/maps/goose-green-terrain.json";
import type { Vec2 } from "./types";
import {
  TERRAIN_PROPERTIES,
  type TerrainCell,
  type TerrainGrid,
  type TerrainType,
} from "./terrain-types";

export interface TerrainZone {
  name?: string;
  type: TerrainType;
  elevation: number;
  bounds?: { xMin: number; xMax: number; yMin: number; yMax: number };
  center?: { x: number; y: number };
  radius?: number;
  size?: { width: number; height: number };
  waypoints?: { x: number; y: number }[];
}

export interface MapTerrainDefinition {
  id: string;
  width: number;
  height: number;
  cellResolution?: number;
  zones: TerrainZone[];
}

/**
 * Returns index in the flat 1D array for coordinates (x, y).
 */
export function getCellIndex(grid: TerrainGrid, x: number, y: number): number {
  return Math.floor(y) * grid.width + Math.floor(x);
}

/**
 * Checks whether coordinates (x, y) fall within grid boundaries.
 */
export function isInBounds(grid: TerrainGrid, x: number, y: number): boolean {
  return x >= 0 && x < grid.width && y >= 0 && y < grid.height;
}

/**
 * Creates an empty TerrainGrid initialized to a default surface type and elevation.
 */
export function createTerrainGrid(
  width: number,
  height: number,
  defaultType: TerrainType = "open-grass",
  defaultElevation = 10,
  cellResolution = 25,
): TerrainGrid {
  const size = width * height;
  const cells: TerrainType[] = new Array(size).fill(defaultType);
  const elevations = new Uint8Array(size).fill(defaultElevation);

  return {
    width,
    height,
    cellResolution,
    cells,
    elevations,
  };
}

/**
 * Builds a TerrainGrid instance from a MapTerrainDefinition.
 */
export function buildTerrainGridFromDefinition(
  def: MapTerrainDefinition,
  defaultType: TerrainType = "open-grass",
  defaultElevation = 10,
): TerrainGrid {
  const grid = createTerrainGrid(
    def.width,
    def.height,
    defaultType,
    defaultElevation,
    def.cellResolution ?? 25,
  );

  for (const zone of def.zones) {
    // 1. Rectangle bounds
    if (zone.bounds) {
      const { xMin, xMax, yMin, yMax } = zone.bounds;
      for (let y = Math.max(0, yMin); y < Math.min(grid.height, yMax); y++) {
        for (let x = Math.max(0, xMin); x < Math.min(grid.width, xMax); x++) {
          const idx = getCellIndex(grid, x, y);
          grid.cells[idx] = zone.type;
          grid.elevations[idx] = zone.elevation;
        }
      }
    }

    // 2. Circular region
    if (zone.center && typeof zone.radius === "number") {
      const { x: cx, y: cy } = zone.center;
      const r = zone.radius;
      const x0 = Math.max(0, Math.floor(cx - r));
      const x1 = Math.min(grid.width - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r));
      const y1 = Math.min(grid.height - 1, Math.ceil(cy + r));

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (Math.hypot(x - cx, y - cy) <= r) {
            const idx = getCellIndex(grid, x, y);
            grid.cells[idx] = zone.type;
            grid.elevations[idx] = zone.elevation;
          }
        }
      }
    }

    // 3. Rectangular centered size
    if (zone.center && zone.size) {
      const { x: cx, y: cy } = zone.center;
      const hw = zone.size.width / 2;
      const hh = zone.size.height / 2;
      const x0 = Math.max(0, Math.floor(cx - hw));
      const x1 = Math.min(grid.width - 1, Math.ceil(cx + hw));
      const y0 = Math.max(0, Math.floor(cy - hh));
      const y1 = Math.min(grid.height - 1, Math.ceil(cy + hh));

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = getCellIndex(grid, x, y);
          grid.cells[idx] = zone.type;
          grid.elevations[idx] = zone.elevation;
        }
      }
    }

    // 4. Line waypoints (for roads/paths)
    if (zone.waypoints && zone.waypoints.length > 1) {
      for (let i = 0; i < zone.waypoints.length - 1; i++) {
        const p1 = zone.waypoints[i];
        const p2 = zone.waypoints[i + 1];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.ceil(dist * 2);
        for (let s = 0; s <= steps; s++) {
          const t = steps === 0 ? 0 : s / steps;
          const x = Math.round(p1.x + (p2.x - p1.x) * t);
          const y = Math.round(p1.y + (p2.y - p1.y) * t);
          if (isInBounds(grid, x, y)) {
            const idx = getCellIndex(grid, x, y);
            grid.cells[idx] = zone.type;
            grid.elevations[idx] = zone.elevation;
          }
        }
      }
    }
  }

  return grid;
}

export const GOOSE_GREEN_TERRAIN_GRID = buildTerrainGridFromDefinition(
  rawTerrainData as unknown as MapTerrainDefinition,
);

/**
 * Retrieves the terrain type at the given world position.
 */
export function getTerrainType(grid: TerrainGrid, pos: Vec2): TerrainType {
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);
  if (!isInBounds(grid, x, y)) return "water";
  return grid.cells[getCellIndex(grid, x, y)] ?? "open-grass";
}

/**
 * Retrieves the elevation value (0-255) at the given world position.
 */
export function getElevation(grid: TerrainGrid, pos: Vec2): number {
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);
  if (!isInBounds(grid, x, y)) return 0;
  return grid.elevations[getCellIndex(grid, x, y)] ?? 0;
}

/**
 * Calculates movement cost factor at the specified position.
 * Returns Infinity if impassable.
 */
export function getMovementCost(grid: TerrainGrid, pos: Vec2): number {
  const type = getTerrainType(grid, pos);
  return TERRAIN_PROPERTIES[type].movementCost;
}

/**
 * Calculates defense cover modifier (0.0 to 1.0) at the specified position.
 */
export function getCover(grid: TerrainGrid, pos: Vec2): number {
  const type = getTerrainType(grid, pos);
  return TERRAIN_PROPERTIES[type].coverModifier;
}

/**
 * Checks if a unit can pass through the given coordinate.
 */
export function isPassable(grid: TerrainGrid, pos: Vec2): boolean {
  return Number.isFinite(getMovementCost(grid, pos));
}

/**
 * Calculates Line of Sight (LOS) between two points on the terrain grid.
 * Takes into account terrain height profile and LOS-blocking structures.
 */
export function hasLineOfSight(
  grid: TerrainGrid,
  from: Vec2,
  to: Vec2,
  observerHeight = 2.0,
  targetHeight = 1.0,
): boolean {
  const x0 = Math.floor(from.x);
  const y0 = Math.floor(from.y);
  const x1 = Math.floor(to.x);
  const y1 = Math.floor(to.y);

  if (x0 === x1 && y0 === y1) return true;

  const fromElevation = getElevation(grid, from) + observerHeight;
  const toElevation = getElevation(grid, to) + targetHeight;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  const totalDistance = Math.hypot(x1 - x0, y1 - y0);
  if (totalDistance === 0) return true;

  while (true) {
    if (currX === x1 && currY === y1) {
      return true;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }

    if (currX === x1 && currY === y1) {
      return true;
    }

    if (!isInBounds(grid, currX, currY)) {
      return false;
    }

    const currentDistance = Math.hypot(currX - x0, currY - y0);
    const progress = currentDistance / totalDistance;
    const lineAltitude = fromElevation + (toElevation - fromElevation) * progress;

    const cellPos = { x: currX, y: currY };
    const groundElevation = getElevation(grid, cellPos);
    const terrainType = getTerrainType(grid, cellPos);
    const properties = TERRAIN_PROPERTIES[terrainType];

    if (groundElevation >= lineAltitude) {
      return false;
    }

    if (properties.blocksLOS) {
      const obstacleHeight = groundElevation + 4.0;
      if (obstacleHeight >= lineAltitude) {
        return false;
      }
    }
  }
}
