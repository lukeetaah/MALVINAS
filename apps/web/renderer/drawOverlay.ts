import type { MatchState, Vec2 } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

// ── Combat Effect Particles ─────────────────────────────────────────────────
interface DamageFloater {
  x: number;
  y: number;
  text: string;
  opacity: number;
  yOffset: number;
}

interface MuzzleFlash {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

interface TracerRound {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color: string;
}

// Module-level particle buffers (cleared each frame, populated by combat state)
const damageFloaters: DamageFloater[] = [];
const muzzleFlashes: MuzzleFlash[] = [];
const tracerRounds: TracerRound[] = [];
let lastTick = -1;

function spawnCombatEffects(state: MatchState): void {
  // Only spawn new effects on tick change
  if (state.tick === lastTick) {
    // Age existing particles
    for (let i = damageFloaters.length - 1; i >= 0; i--) {
      damageFloaters[i].opacity -= 0.018;
      damageFloaters[i].yOffset -= 0.6;
      if (damageFloaters[i].opacity <= 0) damageFloaters.splice(i, 1);
    }
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
      muzzleFlashes[i].opacity -= 0.08;
      if (muzzleFlashes[i].opacity <= 0) muzzleFlashes.splice(i, 1);
    }
    for (let i = tracerRounds.length - 1; i >= 0; i--) {
      tracerRounds[i].progress += 0.06;
      if (tracerRounds[i].progress >= 1) tracerRounds.splice(i, 1);
    }
    return;
  }
  lastTick = state.tick;

  // Detect units currently in combat (attacking and taking damage)
  for (const unit of state.units) {
    if (!unit.alive) continue;

    // Muzzle flash & tracer for attacking units
    if (unit.order === "attack" && unit.targetUnitId) {
      const target = state.units.find((u) => u.id === unit.targetUnitId);
      if (target && target.alive) {
        // Muzzle flash at shooter
        muzzleFlashes.push({
          x: unit.position.x,
          y: unit.position.y,
          radius: unit.kind === "artillery" ? 2.5 : 1.2,
          opacity: 1.0,
        });

        // Tracer round
        tracerRounds.push({
          fromX: unit.position.x,
          fromY: unit.position.y,
          toX: target.position.x,
          toY: target.position.y,
          progress: 0,
          color:
            unit.kind === "artillery"
              ? "rgba(255, 160, 60, 0.9)"
              : "rgba(255, 240, 180, 0.7)",
        });

        // Damage floater at target (approximate)
        if (Math.random() > 0.5) {
          const dmg = unit.kind === "artillery" ? Math.floor(8 + Math.random() * 12) : Math.floor(3 + Math.random() * 8);
          damageFloaters.push({
            x: target.position.x + (Math.random() - 0.5) * 2,
            y: target.position.y,
            text: `-${dmg}`,
            opacity: 1.0,
            yOffset: 0,
          });
        }

        // Suppression indicator
        if (target.isSuppressed && Math.random() > 0.7) {
          damageFloaters.push({
            x: target.position.x + (Math.random() - 0.5) * 3,
            y: target.position.y - 1,
            text: "SUPRESIÓN",
            opacity: 1.0,
            yOffset: 0,
          });
        }
      }
    }
  }
}

/**
 * Draws tactical order lines, combat effects (tracers, muzzle flashes, damage floaters),
 * range circles, and UI HUD overlays onto the Canvas.
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  camera: TacticalCamera,
  dragBox: { start: Vec2; current: Vec2 } | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  // Spawn/age combat effect particles
  spawnCombatEffects(state);

  // 1. Range circles for selected units
  for (const unit of state.units) {
    if (!unit.alive || !unit.selected) continue;

    const unitScreen = camera.worldToScreen(unit.position, canvasWidth, canvasHeight);

    // Firing range circle
    if (unit.attackRange) {
      const rangePixels = unit.attackRange * camera.zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(223, 74, 50, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(unitScreen.x, unitScreen.y, rangePixels, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Spotting range circle
    if (unit.sightRange) {
      const spotPixels = unit.sightRange * camera.zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(230, 196, 124, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(unitScreen.x, unitScreen.y, spotPixels, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Movement and attack vectors for selected units
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

      // Final destination waypoint marker (animated pulsing circle)
      const finalDest = unit.path && unit.path.length > 0 ? unit.path[unit.path.length - 1] : unit.destination;
      const finalScreen = camera.worldToScreen(finalDest, canvasWidth, canvasHeight);
      const pulse = 3 + Math.sin(Date.now() * 0.005) * 1.5;
      ctx.beginPath();
      ctx.arc(finalScreen.x, finalScreen.y, pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Chevron marker at destination
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(finalScreen.x - 5, finalScreen.y + 3);
      ctx.lineTo(finalScreen.x, finalScreen.y - 3);
      ctx.lineTo(finalScreen.x + 5, finalScreen.y + 3);
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

        // Animated crosshair at target
        const r = 6 + Math.sin(Date.now() * 0.006) * 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(targetScreen.x, targetScreen.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(targetScreen.x - r - 3, targetScreen.y);
        ctx.lineTo(targetScreen.x - r + 2, targetScreen.y);
        ctx.moveTo(targetScreen.x + r - 2, targetScreen.y);
        ctx.lineTo(targetScreen.x + r + 3, targetScreen.y);
        ctx.moveTo(targetScreen.x, targetScreen.y - r - 3);
        ctx.lineTo(targetScreen.x, targetScreen.y - r + 2);
        ctx.moveTo(targetScreen.x, targetScreen.y + r - 2);
        ctx.lineTo(targetScreen.x, targetScreen.y + r + 3);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 3. Muzzle flashes
  for (const flash of muzzleFlashes) {
    const sp = camera.worldToScreen({ x: flash.x, y: flash.y }, canvasWidth, canvasHeight);
    ctx.save();
    ctx.globalAlpha = flash.opacity;
    const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, flash.radius * camera.zoom);
    grad.addColorStop(0, "rgba(255, 240, 180, 0.9)");
    grad.addColorStop(0.4, "rgba(255, 180, 60, 0.5)");
    grad.addColorStop(1, "rgba(255, 100, 30, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, flash.radius * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Tracer rounds
  for (const tracer of tracerRounds) {
    const from = camera.worldToScreen({ x: tracer.fromX, y: tracer.fromY }, canvasWidth, canvasHeight);
    const to = camera.worldToScreen({ x: tracer.toX, y: tracer.toY }, canvasWidth, canvasHeight);
    const headX = from.x + (to.x - from.x) * tracer.progress;
    const headY = from.y + (to.y - from.y) * tracer.progress;
    const tailP = Math.max(0, tracer.progress - 0.15);
    const tailX = from.x + (to.x - from.x) * tailP;
    const tailY = from.y + (to.y - from.y) * tailP;

    ctx.save();
    ctx.globalAlpha = 1 - tracer.progress * 0.5;
    ctx.strokeStyle = tracer.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();
    // Bright head dot
    ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
    ctx.beginPath();
    ctx.arc(headX, headY, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Damage floaters
  for (const floater of damageFloaters) {
    const sp = camera.worldToScreen({ x: floater.x, y: floater.y }, canvasWidth, canvasHeight);
    ctx.save();
    ctx.globalAlpha = floater.opacity;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = floater.text.startsWith("-") ? "#ff6644" : "#ffaa33";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    ctx.fillText(floater.text, sp.x, sp.y + floater.yOffset);
    ctx.restore();
  }

  // 6. Drag selection box
  if (dragBox) {
    const x0 = Math.min(dragBox.start.x, dragBox.current.x);
    const y0 = Math.min(dragBox.start.y, dragBox.current.y);
    const w = Math.abs(dragBox.current.x - dragBox.start.x);
    const h = Math.abs(dragBox.current.y - dragBox.start.y);

    ctx.save();
    ctx.fillStyle = "rgba(230, 196, 124, 0.12)";
    ctx.strokeStyle = "#e6c47c";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.fillRect(x0, y0, w, h);
    ctx.strokeRect(x0, y0, w, h);
    ctx.restore();
  }

  // 7. Compass North Indicator (top right)
  ctx.save();
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "rgba(241, 232, 205, 0.7)";
  ctx.textAlign = "right";
  ctx.fillText("N ↑", canvasWidth - 14, 20);

  // 8. Map Scale (bottom left)
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
