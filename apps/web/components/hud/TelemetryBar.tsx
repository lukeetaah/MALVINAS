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
    <header className="flex items-center justify-between px-4 py-2 bg-[#0c1511] border-b border-[#213529] font-mono text-xs text-[#dce7dc]">
      {/* Left: Mission title and return */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onReturnToBriefing}
          className="px-2.5 py-1 bg-[#14231b] border border-[#2b4133] rounded text-[#f4d787] hover:bg-[#1b2f23] transition-colors"
        >
          ← {locale === "es-AR" ? "Briefing" : "Briefing"}
        </button>
        <div>
          <span className="font-bold text-[#f4d787] text-sm tracking-wide">
            {mission.title[locale]}
          </span>
          <span className="ml-2 text-[10px] text-[#8da594]">
            {playerSide === "argentina" ? "🇦🇷 FUERZAS ARGENTINAS" : "🇬🇧 TASK FORCE"}
          </span>
        </div>
      </div>

      {/* Center: Live Telemetry Widgets (Time, Sector Control, Weather, Logistics) */}
      <div className="flex items-center space-x-5 text-[11px]">
        {/* Match Timer */}
        <div className="flex items-center space-x-1.5 bg-[#101b15] px-3 py-1 rounded border border-[#1b2f23]">
          <span className="text-[#8da594]">⏱ {t("ui.operationalTime")}:</span>
          <span className="font-bold text-[#f4d787]">{timeFormatted}</span>
        </div>

        {/* Sector Control Counter */}
        <div className="flex items-center space-x-1.5 bg-[#101b15] px-3 py-1 rounded border border-[#1b2f23]">
          <span className="text-[#8da594]">🚩 {t("ui.control")}:</span>
          <span className="font-bold text-[#48bb78]">
            {playerControlled} <em className="text-[#6d8874] not-italic">/ {totalFeatures}</em>
          </span>
        </div>

        {/* Weather Indicator */}
        <div className="flex items-center space-x-1.5 bg-[#101b15] px-3 py-1 rounded border border-[#1b2f23]">
          <span>{weatherIcon}</span>
          <span className="font-semibold text-[#b8cbbd]">
            {translateWeather(weather.type as any, locale)}
          </span>
          <span className="text-[10px] text-[#8da594]">
            ({weather.temperature}°C · Vis {Math.round(weather.visibilityMultiplier * 100)}%)
          </span>
        </div>

        {/* Aggregate Logistics */}
        {state.logistics && (
          <div className="flex items-center space-x-1.5 bg-[#101b15] px-3 py-1 rounded border border-[#1b2f23]">
            <span className="text-[#8da594]">📦 {locale === "es-AR" ? "Presión Logística" : "Supply Pressure"}:</span>
            <span className="font-bold text-[#ecc94b]">
              {Math.round(state.logistics[playerSide]?.supplyPressure ?? 0)}%
            </span>
          </div>
        )}
      </div>

      {/* Right: Archive modal trigger, language toggle, audio toggle, and Pause/Resume */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleToggleMute}
          title={isMuted ? "Audio silenciado" : "Audio activo"}
          className="px-2 py-1 bg-[#14231b] border border-[#2b4133] rounded text-[#f4d787] hover:bg-[#1b2f23] text-[11px]"
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        <button
          onClick={onOpenArchive}
          className="px-2.5 py-1 bg-[#14231b] border border-[#3b5744] rounded text-[#f4d787] hover:bg-[#1b2f23] transition-colors text-[11px] font-semibold"
        >
          📜 {t("ui.historicalArchive")}
        </button>

        <button
          onClick={onToggleLocale}
          className="px-2 py-1 bg-[#14231b] border border-[#2b4133] rounded text-[#c5d36e] hover:bg-[#1b2f23] text-[11px] font-bold"
        >
          {locale === "es-AR" ? "EN" : "ES"}
        </button>

        <button
          onClick={onToggleRunning}
          disabled={state.status !== "playing"}
          className={`px-3 py-1 rounded border text-[11px] font-bold transition-colors ${
            running
              ? "bg-[#273a2e] border-[#48bb78] text-[#48bb78] hover:bg-[#1e2f24]"
              : "bg-[#4a2424] border-[#e53e3e] text-[#feb2b2] hover:bg-[#3b1c1c]"
          }`}
        >
          {running ? `⏸ ${t("ui.pause")}` : `▶ ${t("ui.resume")}`}
        </button>
      </div>
    </header>
  );
}
