import type { WeatherState } from "@malvinas/simulation";
import type { TacticalCamera } from "./camera";

let weatherParticleOffset = 0;

/**
 * Draws real-time atmospheric weather effects (rain streaks, blizzard snow, fog veil, gale dust)
 * directly over the tactical canvas.
 */
export function drawWeather(
  ctx: CanvasRenderingContext2D,
  weather: WeatherState | undefined,
  camera: TacticalCamera,
  canvasWidth: number,
  canvasHeight: number,
): void {
  if (!weather || weather.type === "clear") return;

  weatherParticleOffset = (weatherParticleOffset + 1.5) % 1000;

  ctx.save();

  // 1. Ambient atmospheric light and temperature tint
  if (weather.type === "dense-fog") {
    ctx.fillStyle = "rgba(180, 195, 200, 0.22)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (weather.type === "snow-blizzard") {
    ctx.fillStyle = "rgba(220, 235, 245, 0.18)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (weather.type === "overcast" || weather.type === "rain") {
    ctx.fillStyle = "rgba(30, 45, 50, 0.08)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 2. Weather dynamic particles
  const windX = weather.windVector.x * 20;
  const windY = (weather.windVector.y + 1.2) * 16;

  if (weather.type === "rain") {
    ctx.strokeStyle = "rgba(160, 200, 225, 0.35)";
    ctx.lineWidth = 1.2;

    const numDrops = 80;
    const spacingX = canvasWidth / numDrops;

    for (let i = 0; i < numDrops; i++) {
      const x = (i * spacingX + weatherParticleOffset * windX * 0.2) % canvasWidth;
      const y = ((i * 37 + weatherParticleOffset * windY * 0.8) % canvasHeight);
      const len = 12 + (i % 8);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + windX * 0.4, y + len);
      ctx.stroke();
    }
  } else if (weather.type === "snow-blizzard") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";

    const numFlakes = 100;
    const spacingX = canvasWidth / numFlakes;

    for (let i = 0; i < numFlakes; i++) {
      const x = (i * spacingX + Math.sin(i + weatherParticleOffset * 0.05) * 20 + weatherParticleOffset * windX * 0.3) % canvasWidth;
      const y = (i * 29 + weatherParticleOffset * windY * 0.5) % canvasHeight;
      const r = 1.2 + (i % 3) * 0.6;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather.type === "dense-fog") {
    // Drifting fog banks
    ctx.fillStyle = "rgba(210, 225, 230, 0.12)";
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 260 + weatherParticleOffset * 4) % (canvasWidth + 400)) - 200;
      const cy = ((i * 180 + weatherParticleOffset * 2) % (canvasHeight + 300)) - 150;

      ctx.beginPath();
      ctx.arc(cx, cy, 180 + i * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
