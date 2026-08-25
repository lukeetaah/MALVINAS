import type { TerrainGrid, TerrainType } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

const TERRAIN_BASE_COLORS: Record<TerrainType, string> = {
  "open-grass": "#253b31",
  "peat-bog": "#1e2e26",
  "rocky-ridge": "#3d4e41",
  settlement: "#2e3f36",
  road: "#4b574a",
  airstrip: "#3a4a40",
  water: "#153849",
  trench: "#35382b",
};

/**
 * Draws the terrain grid with surface types, elevation relief, and military grid markings.
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  grid: TerrainGrid,
  camera: TacticalCamera,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const cellW = camera.zoom;
  const cellH = camera.zoom;

  // Calculate visible world bounding box in screen view
  const topLeftWorld = camera.screenToWorld({ x: 0, y: 0 }, canvasWidth, canvasHeight);
  const botRightWorld = camera.screenToWorld(
    { x: canvasWidth, y: canvasHeight },
    canvasWidth,
    canvasHeight,
  );

  const startX = Math.max(0, Math.floor(topLeftWorld.x));
  const endX = Math.min(grid.width, Math.ceil(botRightWorld.x) + 1);
  const startY = Math.max(0, Math.floor(topLeftWorld.y));
  const endY = Math.min(grid.height, Math.ceil(botRightWorld.y) + 1);

  // 1. Draw base terrain cells with elevation tint
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * grid.width + x;
      const type = grid.cells[idx] ?? "open-grass";
      const elev = grid.elevations[idx] ?? 10;

      const screenPos = camera.worldToScreen({ x, y }, canvasWidth, canvasHeight);

      // Base color
      ctx.fillStyle = TERRAIN_BASE_COLORS[type];
      ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));

      // Elevation hill-shading overlay (higher terrain appears slightly lighter)
      if (type !== "water") {
        const elevFactor = Math.min(1.0, elev / 60);
        if (elevFactor > 0.1) {
          ctx.fillStyle = `rgba(215, 235, 200, ${elevFactor * 0.18})`;
          ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
        }
      }
    }
  }

  // 2. Draw tactical coordinate grid lines
  ctx.save();
  ctx.strokeStyle = "rgba(213, 219, 194, 0.08)";
  ctx.lineWidth = 1;

  const gridStep = camera.zoom > 16 ? 5 : 10;
  const gridStartX = Math.floor(startX / gridStep) * gridStep;
  const gridStartY = Math.floor(startY / gridStep) * gridStep;

  for (let x = gridStartX; x <= endX; x += gridStep) {
    const p1 = camera.worldToScreen({ x, y: 0 }, canvasWidth, canvasHeight);
    const p2 = camera.worldToScreen(
      { x, y: grid.height },
      canvasWidth,
      canvasHeight,
    );
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let y = gridStartY; y <= endY; y += gridStep) {
    const p1 = camera.worldToScreen({ x: 0, y }, canvasWidth, canvasHeight);
    const p2 = camera.worldToScreen(
      { x: grid.width, y },
      canvasWidth,
      canvasHeight,
    );
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Map border
  ctx.save();
  const origin = camera.worldToScreen({ x: 0, y: 0 }, canvasWidth, canvasHeight);
  const boundary = {
    w: grid.width * camera.zoom,
    h: grid.height * camera.zoom,
  };
  ctx.strokeStyle = "rgba(230, 196, 124, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(origin.x, origin.y, boundary.w, boundary.h);
  ctx.restore();
}
