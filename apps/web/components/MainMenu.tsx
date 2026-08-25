"use client";

import { useState } from "react";
import { HISTORICAL_MISSIONS, type Side } from "@malvinas/simulation";
import { useGameStore } from "@/store/gameStore";
import { TacticalAudioManager } from "@/audio/audioManager";
import { HistoricalArchiveModal } from "./HistoricalArchiveModal";

export function MainMenu() {
  const mission = useGameStore((s) => s.mission);
  const locale = useGameStore((s) => s.locale);
  const playerSide = useGameStore((s) => s.playerSide);
  const planId = useGameStore((s) => s.planId);
  const selectMission = useGameStore((s) => s.selectMission);
  const selectSide = useGameStore((s) => s.selectSide);
  const setPlanId = useGameStore((s) => s.setPlanId);
  const toggleLocale = useGameStore((s) => s.toggleLocale);
  const launchMission = useGameStore((s) => s.launchMission);

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const handleToggleMute = () => {
    const audio = TacticalAudioManager.getInstance();
    audio.init();
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleLaunchCombat = () => {
    TacticalAudioManager.getInstance().init();
    TacticalAudioManager.getInstance().playRadioChirp();
    launchMission();
  };

  const text = {
    "es-AR": {
      title: "1982: MALVINAS",
      subtitle: "CAMPAÑA DEL ATLÁNTICO SUR · SIMULACIÓN TÁCTICA Y DOCUMENTAL",
      prologueTitle: "PARTE HISTÓRICO GENERAL — ABRIL / JUNIO DE 1982",
      prologueBody:
        "El 2 de abril de 1982, las Fuerzas Armadas argentinas recuperan las Islas Malvinas y Georgias del Sur. El gobierno británico responde movilizando la Task Force 317 a lo largo de 12.000 kilómetros de océano. En un teatro hostil de turberas, temperaturas bajo cero y fuertes vientos australes, ambas fuerzas se enfrentaron en combates aeronavales y terrestres decisivos. Tomá el mando táctico de las operaciones con absoluto rigor historiográfico.",
      step1: "1. TEATRO DE OPERACIONES",
      step2: "2. BANDO DE MANDO",
      step3: "3. PLAN OPERATIVO INICIAL",
      launchPrompt: "DESPLEGAR FUERZAS EN COMBATE",
      archiveBtn: "ARCHIVO HISTÓRICO Y FUENTES",
      argForces: "Fuerzas Armadas Argentinas",
      argDesc: "Ejército Argentino, Fuerza Aérea y Armada / BIM 5",
      ukForces: "British Task Force 317",
      ukDesc: "Parachute Regiment, Royal Marines, Royal Navy y RAF",
      dateLabel: "FECHA",
      forcesLabel: "FUERZAS",
      weatherLabel: "CLIMA",
      readiness: "ESTADO OPERATIVO: LISTO PARA DESPLIEGUE",
      sourceCitation: "Simulación histórica basada en partes de guerra oficiales, cartografía del IGM y testimonios de combatientes.",
    },
    "en-GB": {
      title: "1982: FALKLANDS",
      subtitle: "SOUTH ATLANTIC CAMPAIGN · HISTORICAL TACTICAL SIMULATION",
      prologueTitle: "HISTORICAL CONTEXT BRIEFING — APRIL / JUNE 1982",
      prologueBody:
        "On 2 April 1982, Argentine forces established control over the Falkland Islands and South Georgia. Great Britain deployed Task Force 317 across 8,000 miles of ocean. In a severe environment of peat bogs, sub-zero conditions and Antarctic gales, both forces engaged in decisive air-naval and ground operations. Take tactical command with strict documentary rigor.",
      step1: "1. THEATRE OF OPERATIONS",
      step2: "2. COMMAND FACTION",
      step3: "3. INITIAL TACTICAL PLAN",
      launchPrompt: "DEPLOY FORCES INTO COMBAT",
      archiveBtn: "HISTORICAL ARCHIVE & SOURCES",
      argForces: "Argentine Armed Forces",
      argDesc: "Argentine Army, Air Force, Navy and 5th Marine Battalion",
      ukForces: "British Task Force 317",
      ukDesc: "Parachute Regiment, Royal Marines, Royal Navy and RAF",
      dateLabel: "DATE",
      forcesLabel: "FORCES",
      weatherLabel: "WEATHER",
      readiness: "OPERATIONAL READINESS: READY FOR DEPLOYMENT",
      sourceCitation: "Historical simulation based on official military dispatches, IGM cartography and veteran accounts.",
    },
  }[locale];

  const availablePlans = mission.briefing.plans.filter((p) => p.side === playerSide);
  const currentPlan = availablePlans.find((p) => p.id === planId) ?? availablePlans[0];

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

      {/* Main Selection Workflow */}
      <div className="main-menu-selection-section">
        {/* Step 1: Theatre of Operations */}
        <div>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>
            {text.step1}
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
                    <span>📍 {m.map.features.length} Sectores clave</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Faction / Side Selection */}
        <div style={{ marginTop: "28px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>
            {text.step2}
          </p>
          <div className="side-cards-grid">
            <div
              onClick={() => {
                selectSide("argentina");
                const firstArgPlan = mission.briefing.plans.find((p) => p.side === "argentina");
                if (firstArgPlan) setPlanId(firstArgPlan.id);
              }}
              className={`menu-side-card argentina ${playerSide === "argentina" ? "selected" : ""}`}
            >
              <div className="side-card-flag">🇦🇷</div>
              <div className="side-card-info">
                <h3>{text.argForces}</h3>
                <p>{text.argDesc}</p>
                <span className="side-motto">"Defensa en profundidad, apoyo de artillería y posiciones en cotas dominantes"</span>
              </div>
            </div>

            <div
              onClick={() => {
                selectSide("britain");
                const firstUkPlan = mission.briefing.plans.find((p) => p.side === "britain");
                if (firstUkPlan) setPlanId(firstUkPlan.id);
              }}
              className={`menu-side-card britain ${playerSide === "britain" ? "selected" : ""}`}
            >
              <div className="side-card-flag">🇬🇧</div>
              <div className="side-card-info">
                <h3>{text.ukForces}</h3>
                <p>{text.ukDesc}</p>
                <span className="side-motto">"Asalto anfibio, apoyo de fuego naval y maniobra nocturna de infantería"</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Tactical Plan Selection */}
        <div style={{ marginTop: "28px" }}>
          <p className="eyebrow" style={{ marginBottom: "12px" }}>
            {text.step3}
          </p>
          <div className="plan-options" style={{ marginTop: "0" }}>
            {availablePlans.map((plan) => {
              const isSelected = (currentPlan?.id ?? planId) === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => setPlanId(plan.id)}
                  className={`plan-choice ${isSelected ? "active" : ""}`}
                  style={{ cursor: "pointer" }}
                >
                  <span style={{ fontWeight: "bold" }}>{plan.name[locale]}</span>
                  <strong style={{ color: "var(--gold)" }}>{plan.effect[locale]}</strong>
                  <small style={{ color: "var(--mist)" }}>{plan.description[locale]}</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* Big Launch Action CTA */}
        <div className="menu-launch-container">
          <div className="launch-summary">
            <span>{text.readiness}</span>
            <strong>
              {mission.title[locale]} · {playerSide === "argentina" ? "🇦🇷 FUERZAS ARGENTINAS" : "🇬🇧 TASK FORCE"} · {currentPlan ? currentPlan.name[locale] : ""}
            </strong>
          </div>
          <button
            onClick={handleLaunchCombat}
            className="menu-launch-button"
          >
            {text.launchPrompt} <b>→</b>
          </button>
        </div>

        {/* Citation Footer */}
        <div style={{ marginTop: "24px", textAlign: "center", color: "var(--mist)", fontSize: "11px" }}>
          <p>{text.sourceCitation}</p>
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
