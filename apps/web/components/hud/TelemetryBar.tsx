"use client";

import { useState } from "react";
import type { MatchState, MissionDefinition, Side, Locale } from "@malvinas/simulation";
import {
  TICK_RATE,
  t as translateKey,
  translateWeather,
  formatOperationalTime,
} from "@malvinas/simulation";
import { TacticalAudioManager } from "@/audio/audioManager";

interface TelemetryBarProps {
  state: MatchState;
  mission: MissionDefinition;
  playerSide: Side;
  locale: Locale;
  running: boolean;
  onToggleRunning: () => void;
  onToggleLocale: () => void;
  onOpenArchive: () => void;
  onReturnToBriefing: () => void;
}

export function TelemetryBar({
  state,
  mission,
  playerSide,
  locale,
  running,
  onToggleRunning,
  onToggleLocale,
  onOpenArchive,
  onReturnToBriefing,
}: TelemetryBarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const t = (key: any) => translateKey(key, locale);

  const handleToggleMute = () => {
    const audio = TacticalAudioManager.getInstance();
    audio.init();
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const seconds = Math.floor(state.tick / TICK_RATE);
  const timeFormatted = formatOperationalTime(seconds);

  const playerControlled = mission.map.features.filter(
    (f) => state.control[f.id] === playerSide,
  ).length;
  const totalFeatures = mission.map.features.length;

  const weather = state.weather ?? {
    type: "clear",
    visibilityMultiplier: 1.0,
    movementCostMultiplier: 1.0,
    windVector: { x: 0, y: 0 },
    temperature: 2,
    aircraftOperational: true,
  };

  const weatherIcons: Record<string, string> = {
    clear: "☀️",
    overcast: "☁️",
    "dense-fog": "🌫️",
    rain: "🌧️",
    "snow-blizzard": "❄️",
    "gale-winds": "💨",
  };

  const weatherIcon = weatherIcons[weather.type] ?? "☁️";

  return (
    <header className="telemetry-bar">
      {/* Left: Mission title and return */}
      <div className="telemetry-left">
        <button onClick={onReturnToBriefing} className="telemetry-btn">
          ← {locale === "es-AR" ? "Menú Principal" : "Main Menu"}
        </button>
        <div>
          <h2 className="telemetry-title">{mission.title[locale]}</h2>
          <span className={`telemetry-side-tag ${playerSide === "argentina" ? "arg" : "uk"}`}>
            {playerSide === "argentina" ? "🇦🇷 FUERZAS ARGENTINAS" : "🇬🇧 TASK FORCE"}
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Widgets (Time, Sector Control, Weather, Logistics) */}
      <div className="telemetry-center">
        {/* Match Timer */}
        <div className="telemetry-pill">
          <span>⏱ {t("ui.operationalTime")}:</span>
          <strong>{timeFormatted}</strong>
        </div>

        {/* Sector Control Counter */}
        <div className="telemetry-pill">
          <span>🚩 {t("ui.control")}:</span>
          <strong>
            {playerControlled} <em>/ {totalFeatures}</em>
          </strong>
        </div>

        {/* Weather Indicator */}
        <div className="telemetry-pill">
          <span>{weatherIcon}</span>
          <span style={{ fontWeight: 600, color: "#b8cbbd" }}>
            {translateWeather(weather.type as any, locale)}
          </span>
          <span style={{ fontSize: "10px", color: "var(--mist)" }}>
            ({weather.temperature}°C · Vis {Math.round(weather.visibilityMultiplier * 100)}%)
          </span>
        </div>

        {/* Aggregate Logistics */}
        {state.logistics && (
          <div className="telemetry-pill">
            <span>📦 {locale === "es-AR" ? "Presión Logística" : "Supply Pressure"}:</span>
            <strong style={{ color: "#ecc94b" }}>
              {Math.round(state.logistics[playerSide]?.supplyPressure ?? 0)}%
            </strong>
          </div>
        )}
      </div>

      {/* Right: Archive modal trigger, language toggle, audio toggle, and Pause/Resume */}
      <div className="telemetry-right">
        <button
          onClick={handleToggleMute}
          title={isMuted ? "Audio silenciado" : "Audio activo"}
          className="telemetry-btn"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <button onClick={onOpenArchive} className="telemetry-btn">
          📜 {t("ui.historicalArchive")}
        </button>

        <button onClick={onToggleLocale} className="telemetry-btn">
          {locale === "es-AR" ? "EN" : "ES"}
        </button>

        <button
          onClick={onToggleRunning}
          disabled={state.status !== "playing"}
          className={`telemetry-btn ${running ? "running" : "paused"}`}
        >
          {running ? `⏸ ${t("ui.pause")}` : `▶ ${t("ui.resume")}`}
        </button>
      </div>
    </header>
  );
}
