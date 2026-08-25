import {
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  FOG_VISIBLE,
  type FogOfWarGrid,
} from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

/**
 * Draws the Fog of War shroud over the Canvas based on player visibility.
 */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  fog: FogOfWarGrid,
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
  const endX = Math.min(fog.width, Math.ceil(botRightWorld.x) + 1);
  const startY = Math.max(0, Math.floor(topLeftWorld.y));
  const endY = Math.min(fog.height, Math.ceil(botRightWorld.y) + 1);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * fog.width + x;
      const vis = fog.visibility[idx] ?? FOG_UNEXPLORED;

      if (vis === FOG_VISIBLE) continue; // Fully clear in real-time view

      const screenPos = camera.worldToScreen({ x, y }, canvasWidth, canvasHeight);

      if (vis === FOG_UNEXPLORED) {
        // Full black pitch darkness
        ctx.fillStyle = "#0c1511";
        ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
      } else if (vis === FOG_EXPLORED) {
        // Semi-transparent shroud over previously scouted territory
        ctx.fillStyle = "rgba(12, 21, 17, 0.52)";
        ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }
}
