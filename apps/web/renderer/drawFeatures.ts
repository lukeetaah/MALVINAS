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
    "es-AR": "Aeródromo Darwin",
    "en-GB": "Darwin Airfield",
  },
  "goose-green-settlement": {
    "es-AR": "Pradera del Ganso",
    "en-GB": "Goose Green",
  },
  "boca-house": { "es-AR": "Boca House", "en-GB": "Boca House" },
  "school-position": {
    "es-AR": "Posición Escuela",
    "en-GB": "School Position",
  },
  "longdon-east-crest": {
    "es-AR": "Cresta Este",
    "en-GB": "East Crest",
  },
  "longdon-west-summit": {
    "es-AR": "Cumbre Oeste",
    "en-GB": "West Summit",
  },
  "san-carlos-water": {
    "es-AR": "Brazo San Carlos",
    "en-GB": "San Carlos Water",
  },
  "ajax-bay": {
    "es-AR": "Bahía Ajax",
    "en-GB": "Ajax Bay",
  },
};

/**
 * Draws tactical objective zones, buildings, runways, and clean sector labels.
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

    // 1. Objective zone circle (subtle dashed border)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, 0, Math.PI * 2);

    if (owner) {
      ctx.fillStyle = owner === "argentina" ? "rgba(197, 211, 110, 0.08)" : "rgba(223, 144, 117, 0.08)";
      ctx.strokeStyle = owner === "argentina" ? "rgba(197, 211, 110, 0.6)" : "rgba(223, 144, 117, 0.6)";
    } else {
      ctx.fillStyle = "rgba(230, 196, 124, 0.05)";
      ctx.strokeStyle = "rgba(230, 196, 124, 0.4)";
    }

    ctx.fill();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();

    // 2. Airfield runway representation
    if (feature.kind === "airfield") {
      ctx.save();
      const rwW = 12 * camera.zoom;
      const rwH = 2.4 * camera.zoom;
      ctx.fillStyle = "rgba(45, 55, 48, 0.7)";
      ctx.strokeStyle = "rgba(230, 196, 124, 0.4)";
      ctx.lineWidth = 1;
      ctx.fillRect(centerScreen.x - rwW / 2, centerScreen.y - rwH / 2, rwW, rwH);
      ctx.strokeRect(centerScreen.x - rwW / 2, centerScreen.y - rwH / 2, rwW, rwH);

      // Dashed centerline
      ctx.strokeStyle = "rgba(240, 230, 190, 0.6)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(centerScreen.x - rwW / 2 + 2, centerScreen.y);
      ctx.lineTo(centerScreen.x + rwW / 2 - 2, centerScreen.y);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Compact tactical label above objective
    if (camera.zoom >= 7) {
      const name = FEATURE_NAMES[feature.id]?.[locale] ?? feature.id;
      const statusText = owner
        ? owner === "argentina"
          ? "🇦🇷 ARG"
          : "🇬🇧 UK"
        : "🚩 OBJETIVO";

      ctx.save();
      const fontSize = 10;
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = "center";

      const labelY = centerScreen.y - radiusScreen - 4;

      // Small background chip
      const textWidth = ctx.measureText(name).width;
      ctx.fillStyle = "rgba(10, 16, 14, 0.75)";
      ctx.fillRect(centerScreen.x - textWidth / 2 - 4, labelY - fontSize, textWidth + 8, fontSize + 4);

      ctx.fillStyle = owner ? SIDE_COLORS[owner] : "#e6c47c";
      ctx.fillText(name, centerScreen.x, labelY - 2);
      ctx.restore();
    }
  }
}
