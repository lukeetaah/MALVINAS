import type { MatchState, Vec2 } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

interface DamageFloater {
  x: number;
  y: number;
  text: string;
  opacity: number;
  yOffset: number;
  color: string;
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

const damageFloaters: DamageFloater[] = [];
const muzzleFlashes: MuzzleFlash[] = [];
const tracerRounds: TracerRound[] = [];
let lastTick = -1;

function updateCombatEffects(state: MatchState): void {
  // Age existing particles smoothly
  for (let i = damageFloaters.length - 1; i >= 0; i--) {
    damageFloaters[i].opacity -= 0.03;
    damageFloaters[i].yOffset -= 0.5;
    if (damageFloaters[i].opacity <= 0) damageFloaters.splice(i, 1);
  }
  for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
    muzzleFlashes[i].opacity -= 0.25; // Brief flash (4 frames)
    if (muzzleFlashes[i].opacity <= 0) muzzleFlashes.splice(i, 1);
  }
  for (let i = tracerRounds.length - 1; i >= 0; i--) {
    tracerRounds[i].progress += 0.12; // Fast bullet travel
    if (tracerRounds[i].progress >= 1) tracerRounds.splice(i, 1);
  }

  // Spawn new effects only on tick update
  if (state.tick === lastTick) return;
  lastTick = state.tick;

  for (const unit of state.units) {
    if (!unit.alive) continue;

    if (unit.order === "attack" && unit.targetUnitId) {
      const target = state.units.find((u) => u.id === unit.targetUnitId);
      if (target && target.alive) {
        // Small crisp muzzle flash
        muzzleFlashes.push({
          x: unit.position.x,
          y: unit.position.y,
          radius: unit.kind === "artillery" ? 5 : 3,
          opacity: 1.0,
        });

        // Crisp tracer line
        tracerRounds.push({
          fromX: unit.position.x,
          fromY: unit.position.y,
          toX: target.position.x,
          toY: target.position.y,
          progress: 0,
          color:
            unit.kind === "artillery"
              ? "rgba(255, 180, 80, 0.95)"
              : "rgba(255, 240, 150, 0.9)",
        });

        // Limit damage floaters to avoid clutter
        if (damageFloaters.length < 8 && Math.random() > 0.4) {
          const dmg = unit.kind === "artillery" ? Math.floor(8 + Math.random() * 12) : Math.floor(3 + Math.random() * 6);
          damageFloaters.push({
            x: target.position.x,
            y: target.position.y,
            text: `-${dmg}`,
            opacity: 1.0,
            yOffset: 0,
            color: "#ff5544",
          });
        }
      }
    }
  }
}

/**
 * Draws tactical overlays: clean range circles, order vectors, bullet tracers, muzzle flashes, and damage numbers.
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  camera: TacticalCamera,
  dragBox: { start: Vec2; current: Vec2 } | null,
  canvasWidth: number,
  canvasHeight: number,
): void {
  updateCombatEffects(state);

  // 1. Subtle range circles for selected units only
  for (const unit of state.units) {
    if (!unit.alive || !unit.selected) continue;

    const unitScreen = camera.worldToScreen(unit.position, canvasWidth, canvasHeight);

    // Firing range circle (fine dashed red line)
    if (unit.attackRange) {
      const rangePixels = unit.attackRange * camera.zoom;
      ctx.save();
      ctx.strokeStyle = "rgba(223, 74, 50, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(unitScreen.x, unitScreen.y, rangePixels, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Order path lines & vectors for selected units
  for (const unit of state.units) {
    if (!unit.alive || !unit.selected) continue;

    const unitScreen = camera.worldToScreen(unit.position, canvasWidth, canvasHeight);

    // Movement path line
    if (unit.destination && (unit.order === "move" || unit.order === "retreat")) {
      ctx.save();
      ctx.strokeStyle = unit.order === "retreat" ? "rgba(223, 144, 117, 0.8)" : "rgba(230, 196, 124, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(unitScreen.x, unitScreen.y);

      const destScreen = camera.worldToScreen(unit.destination, canvasWidth, canvasHeight);
      ctx.lineTo(destScreen.x, destScreen.y);

      if (unit.path && unit.path.length > 1) {
        for (let i = 1; i < unit.path.length; i++) {
          const wpScreen = camera.worldToScreen(unit.path[i], canvasWidth, canvasHeight);
          ctx.lineTo(wpScreen.x, wpScreen.y);
        }
      }
      ctx.stroke();

      // Destination marker (small pulsing ring)
      const pulse = 3 + Math.sin(Date.now() * 0.006) * 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(destScreen.x, destScreen.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Attack target line
    if (unit.targetUnitId && unit.order === "attack") {
      const target = state.units.find((u) => u.id === unit.targetUnitId);
      if (target && target.alive) {
        const targetScreen = camera.worldToScreen(target.position, canvasWidth, canvasHeight);

        ctx.save();
        ctx.strokeStyle = "rgba(223, 74, 50, 0.75)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);

        ctx.beginPath();
        ctx.moveTo(unitScreen.x, unitScreen.y);
        ctx.lineTo(targetScreen.x, targetScreen.y);
        ctx.stroke();

        // Target crosshair
        const r = 7;
        ctx.setLineDash([]);
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

  // 3. Realistic Muzzle Flashes (tiny, bright pinpoint flashes, not giant balls!)
  for (const flash of muzzleFlashes) {
    const sp = camera.worldToScreen({ x: flash.x, y: flash.y }, canvasWidth, canvasHeight);
    ctx.save();
    ctx.globalAlpha = flash.opacity;
    ctx.fillStyle = "#fff8d0";
    ctx.shadowColor = "#ff9020";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, flash.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Tracer bullet streaks
  for (const tracer of tracerRounds) {
    const from = camera.worldToScreen({ x: tracer.fromX, y: tracer.fromY }, canvasWidth, canvasHeight);
    const to = camera.worldToScreen({ x: tracer.toX, y: tracer.toY }, canvasWidth, canvasHeight);
    const headX = from.x + (to.x - from.x) * tracer.progress;
    const headY = from.y + (to.y - from.y) * tracer.progress;
    const tailP = Math.max(0, tracer.progress - 0.2);
    const tailX = from.x + (to.x - from.x) * tailP;
    const tailY = from.y + (to.y - from.y) * tailP;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = tracer.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    // Bright bullet head
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(headX, headY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 5. Clean Floating Damage Text
  for (const floater of damageFloaters) {
    const sp = camera.worldToScreen({ x: floater.x, y: floater.y }, canvasWidth, canvasHeight);
    ctx.save();
    ctx.globalAlpha = floater.opacity;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = floater.color;
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 3;
    ctx.fillText(floater.text, sp.x, sp.y - 12 + floater.yOffset);
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

  // 7. Tactical Compass & Scale
  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(241, 232, 205, 0.6)";
  ctx.textAlign = "right";
  ctx.fillText("N ↑", canvasWidth - 14, 20);

  ctx.textAlign = "left";
  const scalePixels = 10 * camera.zoom;
  ctx.fillText("250 m", 14, canvasHeight - 16);
  ctx.strokeStyle = "rgba(241, 232, 205, 0.6)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, canvasHeight - 10);
  ctx.lineTo(14 + Math.min(80, scalePixels), canvasHeight - 10);
  ctx.stroke();
  ctx.restore();
}
