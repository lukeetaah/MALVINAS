import type { TerrainGrid } from "./terrain-types";
import { getCellIndex, getMovementCost, isInBounds, isPassable } from "./terrain";
import type { Vec2 } from "./types";

interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

// 8 directions (cardinals + diagonals)
const NEIGHBORS: Array<{ dx: number; dy: number; costMult: number }> = [
  { dx: 1, dy: 0, costMult: 1.0 },
  { dx: -1, dy: 0, costMult: 1.0 },
  { dx: 0, dy: 1, costMult: 1.0 },
  { dx: 0, dy: -1, costMult: 1.0 },
  { dx: 1, dy: 1, costMult: 1.414 },
  { dx: -1, dy: 1, costMult: 1.414 },
  { dx: 1, dy: -1, costMult: 1.414 },
  { dx: -1, dy: -1, costMult: 1.414 },
];

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Octile distance heuristic for 8-directional movement
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return dx + dy + (1.414 - 2) * Math.min(dx, dy);
}

/**
 * Checks if a direct line between two points passes only through passable terrain.
 */
export function isLinePassable(grid: TerrainGrid, from: Vec2, to: Vec2): boolean {
  const x0 = Math.floor(from.x);
  const y0 = Math.floor(from.y);
  const x1 = Math.floor(to.x);
  const y1 = Math.floor(to.y);

  if (x0 === x1 && y0 === y1) return isPassable(grid, from);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let currX = x0;
  let currY = y0;

  while (true) {
    if (!isInBounds(grid, currX, currY) || !isPassable(grid, { x: currX, y: currY })) {
      return false;
    }

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
  }
}

/**
 * Smoothes a raw grid path by removing intermediate waypoints if direct line is passable.
 */
export function smoothPath(grid: TerrainGrid, rawPath: Vec2[]): Vec2[] {
  if (rawPath.length <= 2) return rawPath;

  const smoothed: Vec2[] = [rawPath[0]];
  let currentIndex = 0;

  while (currentIndex < rawPath.length - 1) {
    let furthestIndex = currentIndex + 1;

    // Look ahead as far as possible
    for (let testIndex = rawPath.length - 1; testIndex > currentIndex + 1; testIndex--) {
      if (isLinePassable(grid, rawPath[currentIndex], rawPath[testIndex])) {
        furthestIndex = testIndex;
        break;
      }
    }

    smoothed.push(rawPath[furthestIndex]);
    currentIndex = furthestIndex;
  }

  return smoothed;
}

/**
 * Finds an optimal path between two world positions on a TerrainGrid using A*.
 */
export function findPath(
  grid: TerrainGrid,
  start: Vec2,
  goal: Vec2,
  maxIterations = 3000,
): Vec2[] {
  const startX = Math.max(0, Math.min(grid.width - 1, Math.round(start.x)));
  const startY = Math.max(0, Math.min(grid.height - 1, Math.round(start.y)));
  const goalX = Math.max(0, Math.min(grid.width - 1, Math.round(goal.x)));
  const goalY = Math.max(0, Math.min(grid.height - 1, Math.round(goal.y)));

  // If start is goal
  if (startX === goalX && startY === goalY) {
    return [{ x: goal.x, y: goal.y }];
  }

  // If goal is impassable, return empty path
  if (!isPassable(grid, { x: goalX, y: goalY })) {
    return [];
  }

  // If direct line is completely unobstructed and short, return direct path
  if (isLinePassable(grid, start, goal)) {
    return [{ x: start.x, y: start.y }, { x: goal.x, y: goal.y }];
  }

  const openSet: PathNode[] = [];
  const closedSet = new Uint8Array(grid.width * grid.height);
  const nodeMap = new Map<number, PathNode>();

  const startNode: PathNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY),
    f: heuristic(startX, startY, goalX, goalY),
    parent: null,
  };

  openSet.push(startNode);
  nodeMap.set(getCellIndex(grid, startX, startY), startNode);

  let iterations = 0;

  while (openSet.length > 0 && iterations++ < maxIterations) {
    // Find node with lowest f cost
    let bestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIndex].f) {
        bestIndex = i;
      }
    }

    const current = openSet.splice(bestIndex, 1)[0];
    const currentIdx = getCellIndex(grid, current.x, current.y);
    closedSet[currentIdx] = 1;

    // Reached goal
    if (current.x === goalX && current.y === goalY) {
      const rawPath: Vec2[] = [];
      let curr: PathNode | null = current;
      while (curr) {
        rawPath.unshift({ x: curr.x, y: curr.y });
        curr = curr.parent;
      }
      // Replace end with exact goal coordinate
      rawPath[rawPath.length - 1] = { x: goal.x, y: goal.y };
      return smoothPath(grid, rawPath);
    }

    // Expand neighbors
    for (const dir of NEIGHBORS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (!isInBounds(grid, nx, ny)) continue;

      const nIdx = getCellIndex(grid, nx, ny);
      if (closedSet[nIdx]) continue;

      const cost = getMovementCost(grid, { x: nx, y: ny });
      if (!Number.isFinite(cost)) continue; // Impassable (e.g. water)

      // Prevent cutting through corners of impassable diagonal cells
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (
          !isPassable(grid, { x: current.x + dir.dx, y: current.y }) ||
          !isPassable(grid, { x: current.x, y: current.y + dir.dy })
        ) {
          continue;
        }
      }

      const stepCost = dir.costMult * cost;
      const gScore = current.g + stepCost;

      let neighbor = nodeMap.get(nIdx);
      if (!neighbor) {
        const hScore = heuristic(nx, ny, goalX, goalY);
        neighbor = {
          x: nx,
          y: ny,
          g: gScore,
          h: hScore,
          f: gScore + hScore,
          parent: current,
        };
        nodeMap.set(nIdx, neighbor);
        openSet.push(neighbor);
      } else if (gScore < neighbor.g) {
        neighbor.g = gScore;
        neighbor.f = gScore + neighbor.h;
        neighbor.parent = current;
      }
    }
  }

  return [];
}
