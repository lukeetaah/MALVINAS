import type {
  LocalizedMissionText,
  MatchState,
  Side,
  TerrainFeature,
} from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

type Locale = "es-AR" | "en-GB";

const SIDE_COLORS: Record<Side, string> = {
  argentina: "#c5d36e",
  britain: "#df9075",
};

const FEATURE_NAMES: Record<string, LocalizedMissionText> = {
  "darwin-airfield": {
    "es-AR": "Aeródromo de Darwin",
    "en-GB": "Darwin airfield",
  },
  "goose-green-settlement": {
    "es-AR": "Pradera del Ganso",
    "en-GB": "Goose Green settlement",
  },
  "boca-house": { "es-AR": "Boca House", "en-GB": "Boca House" },
  "school-position": {
    "es-AR": "Posición Escuela",
    "en-GB": "School position",
  },
};

/**
 * Draws tactical objective zones, buildings, runways, and location labels.
 */
export function drawFeatures(
  ctx: CanvasRenderingContext2D,
  features: TerrainFeature[],
  state: MatchState,
  camera: TacticalCamera,
  locale: Locale,
  canvasWidth: number,
  canvasHeight: number,
): void {
  for (const feature of features) {
    const owner = state.control[feature.id] ?? null;
    const centerScreen = camera.worldToScreen(
      feature.position,
      canvasWidth,
      canvasHeight,
    );
    const radiusScreen = feature.radius * camera.zoom;

    // 1. Objective zone circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, 0, Math.PI * 2);

    if (owner) {
      ctx.fillStyle = owner === "argentina" ? "rgba(197, 211, 110, 0.16)" : "rgba(223, 144, 117, 0.16)";
      ctx.strokeStyle = SIDE_COLORS[owner];
    } else {
      ctx.fillStyle = "rgba(230, 196, 124, 0.12)";
      ctx.strokeStyle = "#e6c47c";
    }

    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    // 2. Feature-specific icons
    if (feature.kind === "airfield") {
      ctx.save();
      const rwW = 13 * camera.zoom;
      const rwH = 2.8 * camera.zoom;
      ctx.fillStyle = "rgba(200, 194, 158, 0.4)";
      ctx.strokeStyle = "rgba(230, 221, 185, 0.6)";
      ctx.lineWidth = 1;
      ctx.fillRect(
        centerScreen.x - rwW / 2,
        centerScreen.y - rwH / 2,
        rwW,
        rwH,
      );
      ctx.strokeRect(
        centerScreen.x - rwW / 2,
        centerScreen.y - rwH / 2,
        rwW,
        rwH,
      );

      // Centerline
      ctx.strokeStyle = "rgba(242, 231, 190, 0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(centerScreen.x - rwW / 2 + 2, centerScreen.y);
      ctx.lineTo(centerScreen.x + rwW / 2 - 2, centerScreen.y);
      ctx.stroke();
      ctx.restore();
    } else if (feature.kind === "settlement") {
      ctx.save();
      ctx.fillStyle = "rgba(215, 201, 154, 0.6)";
      ctx.strokeStyle = "rgba(242, 231, 190, 0.7)";
      ctx.lineWidth = 1;

      // Small cluster of military/civilian buildings
      const bScale = camera.zoom * 0.8;
      ctx.fillRect(centerScreen.x - 2 * bScale, centerScreen.y - bScale, 2 * bScale, 2 * bScale);
      ctx.strokeRect(centerScreen.x - 2 * bScale, centerScreen.y - bScale, 2 * bScale, 2 * bScale);

      ctx.fillRect(centerScreen.x + 0.5 * bScale, centerScreen.y - 2 * bScale, 2.5 * bScale, 3 * bScale);
      ctx.strokeRect(centerScreen.x + 0.5 * bScale, centerScreen.y - 2 * bScale, 2.5 * bScale, 3 * bScale);
      ctx.restore();
    }

    // 3. Name and control status label
    if (camera.zoom >= 8) {
      const name =
        FEATURE_NAMES[feature.id]?.[locale] ?? feature.id;
      const statusText = owner
        ? owner === "argentina"
          ? "ARG"
          : "UK"
        : locale === "es-AR"
          ? "DISPUTADO"
          : "CONTESTED";

      ctx.save();
      const fontSize = Math.max(10, Math.min(14, camera.zoom * 1.1));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = "middle" as CanvasTextAlign;
      ctx.textAlign = "center";

      // Label background banner
      const textY = centerScreen.y - radiusScreen - 6;
      ctx.fillStyle = "#fbf4df";
      ctx.shadowColor = "#0c1511";
      ctx.shadowBlur = 4;
      ctx.fillText(name, centerScreen.x, textY);

      // Owner tag
      ctx.font = `700 ${fontSize * 0.8}px sans-serif`;
      ctx.fillStyle = owner ? SIDE_COLORS[owner] : "#e6c47c";
      ctx.fillText(statusText, centerScreen.x, centerScreen.y + radiusScreen + fontSize + 2);
      ctx.restore();
    }
  }
}
