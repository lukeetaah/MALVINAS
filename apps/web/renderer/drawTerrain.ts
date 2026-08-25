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

// Secondary texture color for organic dithering
const TERRAIN_SECONDARY: Record<TerrainType, string> = {
  "open-grass": "#2d4738",
  "peat-bog": "#151f1a",
  "rocky-ridge": "#4a5b4e",
  settlement: "#3a4d42",
  road: "#575f55",
  airstrip: "#475247",
  water: "#0f2c3a",
  trench: "#2e3125",
};

// Simple seeded hash for deterministic noise
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

/**
 * Draws the terrain grid with organic procedural textures, elevation relief,
 * topographic contour lines and military grid markings.
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

  // 1. Draw base terrain cells with organic variation and elevation tint
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * grid.width + x;
      const type = grid.cells[idx] ?? "open-grass";
      const elev = grid.elevations[idx] ?? 10;

      const screenPos = camera.worldToScreen({ x, y }, canvasWidth, canvasHeight);
      const noise = hash(x, y);

      // Organic dithering: blend base and secondary colors via noise
      ctx.fillStyle = noise > 0.55 ? TERRAIN_SECONDARY[type] : TERRAIN_BASE_COLORS[type];
      ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));

      // Elevation hill-shading overlay (NW light source)
      if (type !== "water") {
        const elevFactor = Math.min(1.0, elev / 60);
        // Northwest illumination: compare with neighbors
        const elevN = (y > 0 ? grid.elevations[(y - 1) * grid.width + x] : elev) ?? elev;
        const elevW = (x > 0 ? grid.elevations[y * grid.width + (x - 1)] : elev) ?? elev;
        const slopeFactor = ((elev - elevN) + (elev - elevW)) / 40;

        if (elevFactor > 0.1) {
          ctx.fillStyle = `rgba(215, 235, 200, ${elevFactor * 0.15})`;
          ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
        }
        // Shadow on SE slopes
        if (slopeFactor < -0.15) {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.25, Math.abs(slopeFactor) * 0.3)})`;
          ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
        }
      }

      // Water surface shimmer
      if (type === "water") {
        const shimmer = Math.sin(x * 1.7 + y * 2.3) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(100, 180, 220, ${shimmer * 0.06})`;
        ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
      }

      // Grass tufts on open-grass at decent zoom
      if (type === "open-grass" && cellW >= 10 && noise > 0.78) {
        const cx = screenPos.x + cellW * 0.5;
        const cy = screenPos.y + cellH * 0.5;
        ctx.save();
        ctx.strokeStyle = "rgba(130, 170, 100, 0.3)";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx - 1, cy + 2);
        ctx.lineTo(cx, cy - 2);
        ctx.moveTo(cx + 1, cy + 2);
        ctx.lineTo(cx + 2, cy - 1);
        ctx.stroke();
        ctx.restore();
      }

      // Rocky speckles on rocky-ridge
      if (type === "rocky-ridge" && cellW >= 8 && noise > 0.6) {
        ctx.fillStyle = `rgba(180, 190, 170, ${noise * 0.15})`;
        ctx.fillRect(
          screenPos.x + cellW * noise * 0.4,
          screenPos.y + cellH * (1 - noise) * 0.4,
          Math.max(1, cellW * 0.2),
          Math.max(1, cellH * 0.15),
        );
      }

      // Peat-bog moisture patches
      if (type === "peat-bog" && noise > 0.65) {
        ctx.fillStyle = "rgba(30, 60, 50, 0.2)";
        ctx.beginPath();
        ctx.arc(
          screenPos.x + cellW * 0.5,
          screenPos.y + cellH * 0.5,
          cellW * 0.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Trench hatching
      if (type === "trench" && cellW >= 6) {
        ctx.save();
        ctx.strokeStyle = "rgba(90, 80, 50, 0.25)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x + cellW, screenPos.y + cellH);
        ctx.moveTo(screenPos.x + cellW, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + cellH);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 2. Topographic contour lines (every 10m elevation)
  if (cellW >= 5) {
    ctx.save();
    ctx.strokeStyle = "rgba(230, 196, 124, 0.18)";
    ctx.lineWidth = 0.8;

    const contourInterval = 10;
    for (let y = startY; y < endY - 1; y++) {
      for (let x = startX; x < endX - 1; x++) {
        const idx = y * grid.width + x;
        const e00 = grid.elevations[idx] ?? 10;
        const e10 = grid.elevations[idx + 1] ?? 10;
        const e01 = grid.elevations[idx + grid.width] ?? 10;

        // Find contour crossings between adjacent cells
        const minE = Math.min(e00, e10, e01);
        const maxE = Math.max(e00, e10, e01);
        const startLevel = Math.ceil(minE / contourInterval) * contourInterval;

        for (let level = startLevel; level <= maxE; level += contourInterval) {
          // Check horizontal edge (x, x+1)
          if ((e00 < level && e10 >= level) || (e00 >= level && e10 < level)) {
            const t = (level - e00) / (e10 - e00);
            const px = x + t;
            const sp = camera.worldToScreen({ x: px, y }, canvasWidth, canvasHeight);

            // Check vertical edge (y, y+1)
            if ((e00 < level && e01 >= level) || (e00 >= level && e01 < level)) {
              const t2 = (level - e00) / (e01 - e00);
              const py = y + t2;
              const sp2 = camera.worldToScreen({ x, y: py }, canvasWidth, canvasHeight);

              // Major contour lines (every 20m) are thicker
              if (level % 20 === 0) {
                ctx.lineWidth = 1.2;
                ctx.strokeStyle = "rgba(230, 196, 124, 0.28)";
              } else {
                ctx.lineWidth = 0.6;
                ctx.strokeStyle = "rgba(230, 196, 124, 0.14)";
              }

              ctx.beginPath();
              ctx.moveTo(sp.x, sp.y);
              ctx.lineTo(sp2.x, sp2.y);
              ctx.stroke();
            }
          }
        }
      }
    }
    ctx.restore();
  }

  // 3. Draw tactical coordinate grid lines
  ctx.save();
  ctx.strokeStyle = "rgba(213, 219, 194, 0.06)";
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

  // Grid coordinate labels at zoomed-in levels
  if (cellW >= 12) {
    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(213, 219, 194, 0.25)";
    ctx.textAlign = "left";
    for (let x = gridStartX; x <= endX; x += gridStep) {
      const p = camera.worldToScreen({ x, y: startY }, canvasWidth, canvasHeight);
      ctx.fillText(String(x), p.x + 2, p.y + 10);
    }
    ctx.textAlign = "right";
    for (let y = gridStartY; y <= endY; y += gridStep) {
      const p = camera.worldToScreen({ x: startX, y }, canvasWidth, canvasHeight);
      ctx.fillText(String(y), p.x - 2, p.y + 4);
    }
  }
  ctx.restore();

  // 4. Map border
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
