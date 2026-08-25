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
  ctx.lineWidth = 1.5;

  if (kind === "infantry") {
    // NATO standard Infantry symbol: 'X'
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y - h * 0.35);
    ctx.lineTo(x + w * 0.35, y + h * 0.35);
    ctx.moveTo(x + w * 0.35, y - h * 0.35);
    ctx.lineTo(x - w * 0.35, y + h * 0.35);
    ctx.stroke();
  } else if (kind === "artillery") {
    // NATO standard Artillery: filled dot
    ctx.fillStyle = "#102018";
    ctx.beginPath();
    ctx.arc(x, y, Math.min(w, h) * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "support-weapon") {
    // Support weapon: arrow pointing up from bottom
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.35);
    ctx.lineTo(x, y - h * 0.35);
    ctx.moveTo(x - w * 0.25, y - h * 0.1);
    ctx.lineTo(x, y - h * 0.35);
    ctx.lineTo(x + w * 0.25, y - h * 0.1);
    ctx.stroke();
  } else if (kind === "armour") {
    // Armour: oval
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.35, h * 0.25, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "aircraft") {
    // Aircraft: wings
    ctx.beginPath();
    ctx.moveTo(x - w * 0.35, y);
    ctx.lineTo(x + w * 0.35, y);
    ctx.moveTo(x, y - h * 0.35);
    ctx.lineTo(x, y + h * 0.35);
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

    const tokenW = Math.max(22, 3.8 * camera.zoom);
    const tokenH = Math.max(16, 2.8 * camera.zoom);
    const colors = UNIT_SIDE_COLORS[unit.side];

    // 1. Selection indicator bracket
    if (unit.selected) {
      ctx.save();
      ctx.strokeStyle = "#f4d787";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#f4d787";
      ctx.shadowBlur = 6;

      const pad = 4;
      const corner = 4;
      const x0 = screenPos.x - tokenW / 2 - pad;
      const y0 = screenPos.y - tokenH / 2 - pad;
      const x1 = screenPos.x + tokenW / 2 + pad;
      const y1 = screenPos.y + tokenH / 2 + pad;

      // Draw 4 corner brackets
      ctx.beginPath();
      // Top-Left
      ctx.moveTo(x0, y0 + corner);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + corner, y0);
      // Top-Right
      ctx.moveTo(x1 - corner, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1, y0 + corner);
      // Bottom-Right
      ctx.moveTo(x1, y1 - corner);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 - corner, y1);
      // Bottom-Left
      ctx.moveTo(x0 + corner, y1);
      ctx.lineTo(x0, y1);
      ctx.lineTo(x0, y1 - corner);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Unit token base box
    ctx.save();
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
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
    const barH = 3;
    const barY = screenPos.y - tokenH / 2 - barH - 3;
    const healthPercent = Math.max(0, Math.min(1, unit.health / 100));

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(screenPos.x - barW / 2, barY, barW, barH);
    ctx.fillStyle = healthPercent > 0.5 ? "#93cf78" : healthPercent > 0.25 ? "#e6c47c" : "#df9075";
    ctx.fillRect(screenPos.x - barW / 2, barY, barW * healthPercent, barH);
    ctx.restore();

    // 5. Suppression indicator (orange bar under health if suppressed)
    if (unit.suppressionLevel > 0.05) {
      const suppY = barY - 3;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(screenPos.x - barW / 2, suppY, barW, 2);
      ctx.fillStyle = unit.isSuppressed ? "#df4a32" : "#f49d37";
      ctx.fillRect(
        screenPos.x - barW / 2,
        suppY,
        barW * unit.suppressionLevel,
        2,
      );
      ctx.restore();
    }

    // 6. Entrenchment badge [T] / Control Group badge [1-9]
    if (unit.entrenched || unit.controlGroup !== null) {
      ctx.save();
      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#fbf4df";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 3;

      let badge = "";
      if (unit.controlGroup !== null) badge += `[${unit.controlGroup}]`;
      if (unit.entrenched) badge += " 🛡️";

      ctx.fillText(badge, screenPos.x + tokenW / 2 + 3, screenPos.y + 3);
      ctx.restore();
    }

    // 7. Tactical Label (below unit)
    if (camera.zoom >= 9) {
      ctx.save();
      const fontSize = Math.max(9, Math.min(11, camera.zoom * 0.9));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#f7f2df";
      ctx.shadowColor = "#0e1713";
      ctx.shadowBlur = 4;

      const shortLabel = unit.label.split("·")[0].trim();
      ctx.fillText(
        shortLabel,
        screenPos.x,
        screenPos.y + tokenH / 2 + fontSize + 2,
      );
      ctx.restore();
    }
  }
}
