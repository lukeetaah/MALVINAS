import {
  FOG_EXPLORED,
  FOG_UNEXPLORED,
  FOG_VISIBLE,
  type FogOfWarGrid,
} from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

/**
 * Draws the Fog of War shroud over the Canvas with smooth military radar shading.
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

  ctx.save();

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * fog.width + x;
      const vis = fog.visibility[idx] ?? FOG_UNEXPLORED;

      if (vis === FOG_VISIBLE) continue; // Real-time visible

      const screenPos = camera.worldToScreen({ x, y }, canvasWidth, canvasHeight);

      if (vis === FOG_UNEXPLORED) {
        // Deep tactical blackout
        ctx.fillStyle = "#070e0b";
        ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW) + 0.5, Math.ceil(cellH) + 0.5);
      } else if (vis === FOG_EXPLORED) {
        // Semi-transparent tactical shroud over scouted sector
        ctx.fillStyle = "rgba(7, 14, 11, 0.48)";
        ctx.fillRect(screenPos.x, screenPos.y, Math.ceil(cellW) + 0.5, Math.ceil(cellH) + 0.5);
      }
    }
  }

  ctx.restore();
}
