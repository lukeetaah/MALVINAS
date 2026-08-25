"use client";

import { useState } from "react";
import { HISTORICAL_MISSIONS } from "@malvinas/simulation";
import { useGameStore } from "@/store/gameStore";
import { TacticalAudioManager } from "@/audio/audioManager";
import { HistoricalArchiveModal } from "./HistoricalArchiveModal";

export function MainMenu() {
  const mission = useGameStore((s) => s.mission);
  const locale = useGameStore((s) => s.locale);
  const playerSide = useGameStore((s) => s.playerSide);
  const selectMission = useGameStore((s) => s.selectMission);
  const selectSide = useGameStore((s) => s.selectSide);
  const toggleLocale = useGameStore((s) => s.toggleLocale);
  const openBriefing = useGameStore((s) => s.openBriefing);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const audio = TacticalAudioManager.getInstance();
    audio.init();
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleStartMission = (missionId: string) => {
    TacticalAudioManager.getInstance().init();
    TacticalAudioManager.getInstance().playRadioChirp();
    openBriefing(missionId);
  };

  const text = {
    "es-AR": {
      title: "1982: MALVINAS",
      subtitle: "CAMPAÑA DEL ATLÁNTICO SUR · SIMULACIÓN TÁCTICA Y DOCUMENTAL",
      prologueTitle: "PARTE HISTÓRICO GENERAL — ABRIL / JUNIO DE 1982",
      prologueBody:
        "El 2 de abril de 1982, las Fuerzas Armadas argentinas recuperan las Islas Malvinas y Georgias del Sur. El gobierno británico responde movilizando la Task Force 317 a lo largo de 12.000 kilómetros de océano. En un teatro hostil de turberas, temperaturas bajo cero y fuertes vientos australes, ambas fuerzas se enfrentaron en combates aeronavales y terrestres decisivos. Tomá el mando táctico de las operaciones con absoluto rigor historiográfico.",
      selectTheatre: "SELECCIONÁ EL TEATRO DE OPERACIONES",
      selectSide: "SELECCIONÁ TU BANDO DE MANDO",
      launchPrompt: "INICIAR PLANIFICACIÓN DE COMBATE",
      archiveBtn: "ARCHIVO HISTÓRICO Y FUENTES PRIMARIAS",
      argForces: "Fuerzas Armadas Argentinas",
      argDesc: "Ejército Argentino, Fuerza Aérea y Armada / BIM 5",
      ukForces: "British Task Force 317",
      ukDesc: "Parachute Regiment, Royal Marines, Royal Navy y RAF",
      dateLabel: "FECHA",
      forcesLabel: "FUERZAS",
      weatherLabel: "CLIMA",
      readiness: "ESTADO OPERATIVO: LISTO",
    },
    "en-GB": {
      title: "1982: FALKLANDS",
      subtitle: "SOUTH ATLANTIC CAMPAIGN · HISTORICAL TACTICAL SIMULATION",
      prologueTitle: "HISTORICAL CONTEXT BRIEFING — APRIL / JUNE 1982",
      prologueBody:
        "On 2 April 1982, Argentine forces established control over the Falkland Islands and South Georgia. Great Britain deployed Task Force 317 across 8,000 miles of ocean. In a severe environment of peat bogs, sub-zero conditions and Antarctic gales, both forces engaged in decisive air-naval and ground operations. Take tactical command with strict documentary rigor.",
      selectTheatre: "SELECT THEATRE OF OPERATIONS",
      selectSide: "SELECT COMMAND FACTION",
      launchPrompt: "COMMENCE TACTICAL PLANNING",
      archiveBtn: "HISTORICAL ARCHIVE & PRIMARY SOURCES",
      argForces: "Argentine Armed Forces",
      argDesc: "Argentine Army, Air Force, Navy and 5th Marine Battalion",
      ukForces: "British Task Force 317",
      ukDesc: "Parachute Regiment, Royal Marines, Royal Navy and RAF",
      dateLabel: "DATE",
      forcesLabel: "FORCES",
      weatherLabel: "WEATHER",
      readiness: "OPERATIONAL READINESS: READY",
    },
  }[locale];

  return (
    <div className="main-menu-shell">
      {/* Top Header Bar */}
      <header className="main-menu-topbar">
        <div className="menu-brand">
          <span className="menu-insignia">🇦🇷 1982 🇬🇧</span>
          <span className="menu-classification">DOCUMENTO CLASIFICADO · ARCHIVO HISTÓRICO</span>
        </div>
        <div className="menu-controls">
          <button
            onClick={handleToggleMute}
            className="telemetry-btn"
            title={isMuted ? "Audio silenciado" : "Audio activo"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button onClick={() => setIsArchiveOpen(true)} className="telemetry-btn" style={{ color: "var(--gold)" }}>
            📜 {text.archiveBtn}
          </button>
          <button onClick={toggleLocale} className="telemetry-btn">
            {locale === "es-AR" ? "EN" : "ES"}
          </button>
        </div>
      </header>

      {/* Hero Title & Prologue */}
      <div className="main-menu-hero">
        <h1 className="menu-main-title">{text.title}</h1>
        <p className="menu-main-subtitle">{text.subtitle}</p>

        <div className="menu-prologue-card">
          <div className="prologue-header">
            <span className="eyebrow">{text.prologueTitle}</span>
            <span className="badge-1982">TEATRO DE OPERACIONES DEL ATLÁNTICO SUR</span>
          </div>
          <p className="prologue-text">{text.prologueBody}</p>
        </div>
      </div>

      {/* Main Selection Grid */}
      <div className="main-menu-selection-section">
        {/* Theatre of Operations (Missions) */}
        <div>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>
            1. {text.selectTheatre}
          </p>
          <div className="mission-cards-grid">
            {HISTORICAL_MISSIONS.map((m) => {
              const isSelected = mission.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => selectMission(m.id)}
                  className={`menu-mission-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="mission-card-top">
                    <span className="mission-card-date">{m.dateStart}</span>
                    <span className={`mission-card-badge ${isSelected ? "active" : ""}`}>
                      {isSelected ? "SELECCIONADO" : "DISPONIBLE"}
                    </span>
                  </div>
                  <h3 className="mission-card-title">{m.title[locale]}</h3>
                  <p className="mission-card-summary">{m.briefing.situation[locale]}</p>
                  <div className="mission-card-footer">
                    <span>🗺️ {m.map.width}x{m.map.height}m</span>
                    <span>📍 {m.map.features.length} Sectores</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Selection & Launch Command */}
        <div style={{ marginTop: "24px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>
            2. {text.selectSide}
          </p>
          <div className="side-cards-grid">
            <div
              onClick={() => selectSide("argentina")}
              className={`menu-side-card argentina ${playerSide === "argentina" ? "selected" : ""}`}
            >
              <div className="side-card-flag">🇦🇷</div>
              <div className="side-card-info">
                <h3>{text.argForces}</h3>
                <p>{text.argDesc}</p>
                <span className="side-motto">"Defensa en profundidad y cotas dominantes"</span>
              </div>
            </div>

            <div
              onClick={() => selectSide("britain")}
              className={`menu-side-card britain ${playerSide === "britain" ? "selected" : ""}`}
            >
              <div className="side-card-flag">🇬🇧</div>
              <div className="side-card-info">
                <h3>{text.ukForces}</h3>
                <p>{text.ukDesc}</p>
                <span className="side-motto">"Asalto anfibio, apoyo naval y maniobra nocturna"</span>
              </div>
            </div>
          </div>
        </div>

        {/* Big Launch Action CTA */}
        <div className="menu-launch-container">
          <div className="launch-summary">
            <span>{text.readiness}</span>
            <strong>{mission.title[locale]} · {playerSide === "argentina" ? "🇦🇷 ARG" : "🇬🇧 UK"}</strong>
          </div>
          <button
            onClick={() => handleStartMission(mission.id)}
            className="menu-launch-button"
          >
            {text.launchPrompt} <b>→</b>
          </button>
        </div>
      </div>

      {/* Historical Archive Modal */}
      <HistoricalArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        mission={mission}
        locale={locale}
      />
    </div>
  );
}
