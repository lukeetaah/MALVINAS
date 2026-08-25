import type { MatchState, Vec2 } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

/**
 * Draws tactical order lines (movement vectors, attack lines) and UI HUD overlays onto the Canvas.
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  camera: TacticalCamera,
  dragBox: { start: Vec2; current: Vec2 } | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // 1. Movement and attack vectors for selected units
  for (const unit of state.units) {
    if (!unit.alive) continue;

    const unitScreen = camera.worldToScreen(
      unit.position,
      canvasWidth,
      canvasHeight,
    );

    // Movement path line (full waypoints polyline)
    if (unit.selected && unit.destination && (unit.order === "move" || unit.order === "retreat")) {
      ctx.save();
      ctx.strokeStyle = unit.order === "retreat" ? "rgba(223, 144, 117, 0.8)" : "rgba(230, 196, 124, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(unitScreen.x, unitScreen.y);

      const destScreen = camera.worldToScreen(
        unit.destination,
        canvasWidth,
        canvasHeight,
      );
      ctx.lineTo(destScreen.x, destScreen.y);

      if (unit.path && unit.path.length > 1) {
        for (let i = 1; i < unit.path.length; i++) {
          const wpScreen = camera.worldToScreen(
            unit.path[i],
            canvasWidth,
            canvasHeight,
          );
          ctx.lineTo(wpScreen.x, wpScreen.y);
        }
      }
      ctx.stroke();

      // Final destination waypoint marker
      const finalDest = unit.path && unit.path.length > 0 ? unit.path[unit.path.length - 1] : unit.destination;
      const finalScreen = camera.worldToScreen(finalDest, canvasWidth, canvasHeight);
      ctx.beginPath();
      ctx.arc(finalScreen.x, finalScreen.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Attack target line
    if (unit.selected && unit.targetUnitId && unit.order === "attack") {
      const target = state.units.find((u) => u.id === unit.targetUnitId);
      if (target && target.alive) {
        const targetScreen = camera.worldToScreen(
          target.position,
          canvasWidth,
          canvasHeight,
        );

        ctx.save();
        ctx.strokeStyle = "rgba(223, 74, 50, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);

        ctx.beginPath();
        ctx.moveTo(unitScreen.x, unitScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();

        // Crosshair at target
        const r = 6;
        ctx.beginPath();
        ctx.arc(targetScreen.x, targetScreen.y, r, 0, Math.PI * 2);
        ctx.moveTo(targetScreen.x - r - 2, targetScreen.y);
        ctx.lineTo(targetScreen.x + r + 2, targetScreen.y);
        ctx.moveTo(targetScreen.x, targetScreen.y - r - 2);
        ctx.lineTo(targetScreen.x, targetScreen.y + r + 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 2. Drag selection box
  if (dragBox) {
    const x0 = Math.min(dragBox.start.x, dragBox.current.x);
    const y0 = Math.min(dragBox.start.y, dragBox.current.y);
    const w = Math.abs(dragBox.current.x - dragBox.start.x);
    const h = Math.abs(dragBox.current.y - dragBox.start.y);

    ctx.save();
    ctx.fillStyle = "rgba(230, 196, 124, 0.15)";
    ctx.strokeStyle = "#e6c47c";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    ctx.restore();
  }

  // 3. Compass North Indicator (top right)
  ctx.save();
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "rgba(241, 232, 205, 0.7)";
  ctx.textAlign = "right";
  ctx.fillText("N ↑", canvasWidth - 14, 20);

  // 4. Map Scale (bottom left)
  ctx.textAlign = "left";
  const scalePixels = 10 * camera.zoom; // 10 world units (approx 250m)
  ctx.fillText("250 m", 14, canvasHeight - 20);
  ctx.strokeStyle = "rgba(241, 232, 205, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, canvasHeight - 14);
  ctx.lineTo(14 + Math.min(100, scalePixels), canvasHeight - 14);
  ctx.stroke();
  ctx.restore();
}
