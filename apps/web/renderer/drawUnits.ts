import type { UnitKind, UnitState } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

const UNIT_SIDE_COLORS = {
  argentina: {
    fill: "#c5d36e",
    text: "#102018",
    border: "#0e1713",
  },
  britain: {
    fill: "#df9075",
    text: "#102018",
    border: "#0e1713",
  },
};

function drawNatoSymbol(
  ctx: CanvasRenderingContext2D,
  kind: UnitKind,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.strokeStyle = "#102018";
  ctx.lineWidth = 1.4;

  if (kind === "infantry") {
    // NATO standard Infantry symbol: 'X'
    ctx.beginPath();
    ctx.moveTo(x - w * 0.32, y - h * 0.32);
    ctx.lineTo(x + w * 0.32, y + h * 0.32);
    ctx.moveTo(x + w * 0.32, y - h * 0.32);
    ctx.lineTo(x - w * 0.32, y + h * 0.32);
    ctx.stroke();
  } else if (kind === "artillery") {
    // NATO standard Artillery: filled dot
    ctx.fillStyle = "#102018";
    ctx.beginPath();
    ctx.arc(x, y, Math.min(w, h) * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "support-weapon") {
    // Support weapon: vertical arrow
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.32);
    ctx.lineTo(x, y - h * 0.32);
    ctx.moveTo(x - w * 0.22, y - h * 0.1);
    ctx.lineTo(x, y - h * 0.32);
    ctx.lineTo(x + w * 0.22, y - h * 0.1);
    ctx.stroke();
  } else if (kind === "armour") {
    // Armour: oval
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "aircraft") {
    // Aircraft: wings
    ctx.beginPath();
    ctx.moveTo(x - w * 0.32, y);
    ctx.lineTo(x + w * 0.32, y);
    ctx.moveTo(x, y - h * 0.32);
    ctx.lineTo(x, y + h * 0.32);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws unit tokens, NATO symbols, health bars, suppression gauges, and tactical labels.
 */
export function drawUnits(
  ctx: CanvasRenderingContext2D,
  units: UnitState[],
  camera: TacticalCamera,
  canvasWidth: number,
  canvasHeight: number,
  playerSide?: string,
  detectedEnemyIds?: string[],
): void {
  for (const unit of units) {
    if (!unit.alive) continue;

    // Fog of War concealment: enemy units only visible if detected
    if (
      playerSide &&
      unit.side !== playerSide &&
      detectedEnemyIds &&
      !detectedEnemyIds.includes(unit.id)
    ) {
      continue;
    }

    const screenPos = camera.worldToScreen(
      unit.position,
      canvasWidth,
      canvasHeight,
    );

    const tokenW = Math.max(20, Math.min(32, 3.2 * camera.zoom));
    const tokenH = Math.max(14, Math.min(22, 2.2 * camera.zoom));
    const colors = UNIT_SIDE_COLORS[unit.side];

    // 1. Selection indicator bracket
    if (unit.selected) {
      ctx.save();
      ctx.strokeStyle = "#f4d787";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#f4d787";
      ctx.shadowBlur = 4;

      const pad = 3;
      const corner = 3;
      const x0 = screenPos.x - tokenW / 2 - pad;
      const y0 = screenPos.y - tokenH / 2 - pad;
      const x1 = screenPos.x + tokenW / 2 + pad;
      const y1 = screenPos.y + tokenH / 2 + pad;

      ctx.beginPath();
      // TL
      ctx.moveTo(x0, y0 + corner); ctx.lineTo(x0, y0); ctx.lineTo(x0 + corner, y0);
      // TR
      ctx.moveTo(x1 - corner, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + corner);
      // BR
      ctx.moveTo(x1, y1 - corner); ctx.lineTo(x1, y1); ctx.lineTo(x1 - corner, y1);
      // BL
      ctx.moveTo(x0 + corner, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - corner);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Unit token base rectangle
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.2;
    ctx.fillRect(
      screenPos.x - tokenW / 2,
      screenPos.y - tokenH / 2,
      tokenW,
      tokenH,
    );
    ctx.strokeRect(
      screenPos.x - tokenW / 2,
      screenPos.y - tokenH / 2,
      tokenW,
      tokenH,
    );

    // 3. NATO Military symbol inside token
    drawNatoSymbol(ctx, unit.kind, screenPos.x, screenPos.y, tokenW, tokenH);
    ctx.restore();

    // 4. Health bar (above unit)
    const barW = tokenW;
    const barH = 2.5;
    const barY = screenPos.y - tokenH / 2 - barH - 2;
    const healthPercent = Math.max(0, Math.min(1, unit.health / 100));

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(screenPos.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = healthPercent > 0.5 ? "#93cf78" : healthPercent > 0.25 ? "#e6c47c" : "#df4a32";
    ctx.fillRect(screenPos.x - barW / 2, barY, barW * healthPercent, barH);

    // Ammo bar (below health bar if ammo is low)
    if (unit.maxAmmunition && unit.maxAmmunition > 0) {
      const ammoPercent = Math.max(0, Math.min(1, unit.ammunition / unit.maxAmmunition));
      if (ammoPercent < 0.4) {
        const ammoY = barY + barH + 1;
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(screenPos.x - barW / 2, ammoY, barW, 1.5);
        ctx.fillStyle = "#df4a32";
        ctx.fillRect(screenPos.x - barW / 2, ammoY, barW * ammoPercent, 1.5);
      }
    }
    ctx.restore();

    // 5. Entrenchment / Group badge
    if (unit.entrenched || unit.controlGroup !== null) {
      ctx.save();
      ctx.font = "bold 8px sans-serif";
      ctx.fillStyle = "#fbf4df";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 2;

      let badge = "";
      if (unit.controlGroup !== null) badge += `[${unit.controlGroup}]`;
      if (unit.entrenched) badge += " 🛡️";

      ctx.fillText(badge, screenPos.x + tokenW / 2 + 2, screenPos.y + 3);
      ctx.restore();
    }

    // 6. Tactical Unit Label (only if selected or zoomed in)
    if (unit.selected || camera.zoom >= 10) {
      ctx.save();
      const fontSize = 9;
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = "center";

      const shortLabel = unit.label.split("·")[0].trim();
      const labelY = screenPos.y + tokenH / 2 + fontSize + 2;

      // Small dark background chip for label readability
      const labelW = ctx.measureText(shortLabel).width;
      ctx.fillStyle = "rgba(10, 16, 14, 0.7)";
      ctx.fillRect(screenPos.x - labelW / 2 - 2, labelY - fontSize + 1, labelW + 4, fontSize + 2);

      ctx.fillStyle = unit.side === "argentina" ? "#d5e28a" : "#eeb09b";
      ctx.fillText(shortLabel, screenPos.x, labelY);
      ctx.restore();
    }
  }
}
