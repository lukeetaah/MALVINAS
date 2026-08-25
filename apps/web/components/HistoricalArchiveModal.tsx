"use client";

import { useState } from "react";
import {
  getAllSources,
  getDailyTimeline,
  getDiariesForMission,
  getHistoricalContextForMission,
  type DiaryEntry,
  type HistoricalSource,
} from "@malvinas/narrative";
import type { MissionDefinition, Side } from "@malvinas/simulation";

interface HistoricalArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: MissionDefinition;
  locale: "es-AR" | "en-GB";
}

type TabType = "diaries" | "sources" | "timeline" | "principles";

export function HistoricalArchiveModal({
  isOpen,
  onClose,
  mission,
  locale,
}: HistoricalArchiveModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("diaries");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  if (!isOpen) return null;

  const missionContext = getHistoricalContextForMission(mission.id);
  const allSources = getAllSources();
  const timeline = getDailyTimeline();

  const labels = {
    "es-AR": {
      title: "ARCHIVO DOCUMENTAL HISTÓRICO 1982",
      subtitle: "Fuentes primarias oficiales, diarios de campaña y línea de tiempo verificada",
      tabDiaries: "Diarios de Campaña",
      tabSources: "Fuentes Primarias",
      tabTimeline: "Línea de Tiempo",
      tabPrinciples: "Criterios Historiográficos",
      close: "Cerrar Archivo",
      referenceCount: "fuentes citadas",
      verified: "VERIFICADO",
      location: "Ubicación",
      voiceSoldier: "Combatiente de Infantería",
      voiceAircrew: "Tripulación Aérea",
      voiceLog: "Parte Operacional Oficial",
      voiceCorr: "Corresponsal de Guerra",
    },
    "en-GB": {
      title: "1982 HISTORICAL DOCUMENTARY ARCHIVE",
      subtitle: "Official primary sources, war diaries and verified timeline",
      tabDiaries: "War Diaries",
      tabSources: "Primary Sources",
      tabTimeline: "Timeline",
      tabPrinciples: "Historiographical Principles",
      close: "Close Archive",
      referenceCount: "cited sources",
      verified: "VERIFIED",
      location: "Location",
      voiceSoldier: "Infantry Soldier",
      voiceAircrew: "Aircrew",
      voiceLog: "Official Operational Log",
      voiceCorr: "War Correspondent",
    },
  }[locale];

  return (
    <div className="historical-modal-overlay">
      <div className="historical-modal-box">
        {/* Header */}
        <div className="historical-modal-header">
          <div>
            <h2 className="telemetry-title" style={{ fontSize: "18px" }}>
              {labels.title}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--mist)" }}>{labels.subtitle}</p>
          </div>
          <button onClick={onClose} className="telemetry-btn">
            ✕ {labels.close}
          </button>
        </div>

        {/* Tab selector */}
        <div className="historical-modal-tabs">
          {(
            [
              ["diaries", labels.tabDiaries],
              ["sources", labels.tabSources],
              ["timeline", labels.tabTimeline],
              ["principles", labels.tabPrinciples],
            ] as const
          ).map(([key, title]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`historical-modal-tab ${activeTab === key ? "active" : ""}`}
            >
              {title}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="historical-modal-content">
          {/* DIARIES TAB */}
          {activeTab === "diaries" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="historical-entry-card" style={{ borderColor: "var(--arg)" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--arg)" }}>
                  {mission.title[locale]}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#b8cbbd", lineHeight: 1.5 }}>
                  {missionContext.narrativeSummary[locale]}
                </p>
              </div>

              {missionContext.diaries.map((entry) => (
                <div key={entry.id} className="historical-entry-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--gold)" }}>
                      {entry.title[locale]}
                    </span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", border: "1px solid var(--line)", borderRadius: "2px", color: "var(--mist)" }}>
                      {entry.date} · {entry.side?.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--paper)", lineHeight: 1.55 }}>
                    {entry.body[locale]}
                  </p>

                  {entry.location && (
                    <div className="text-[11px] text-[#7e9985]">
                      📍 {labels.location}: {entry.location[locale]}
                    </div>
                  )}

                  {entry.references.length > 0 && (
                    <div style={{ paddingTop: "8px", borderTop: "1px solid var(--line)", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "var(--mist)" }}>
                        {labels.referenceCount}:
                      </span>
                      {entry.references.map((ref, idx) => (
                        <span
                          key={idx}
                          style={{ fontSize: "10px", background: "#ffffff0a", color: "#a9c1af", padding: "2px 6px", borderRadius: "2px", border: "1px solid var(--line)" }}
                        >
                          📄 {ref.sourceId} ({ref.locator})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SOURCES TAB */}
          {activeTab === "sources" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--mist)", marginBottom: "4px" }}>
                Fuentes historiográficas y fondos documentales indexados en el sistema:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "12px" }}>
                {allSources.map((src) => (
                  <div
                    key={src.id}
                    className="historical-entry-card"
                    style={{ justifyContent: "space-between" }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--gold)" }}>
                          {src.id}
                        </span>
                        <span style={{ fontSize: "9px", background: "#c5d36e22", color: "var(--arg)", padding: "2px 6px", borderRadius: "2px" }}>
                          {labels.verified}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--paper)" }}>
                        {src.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--mist)", marginTop: "2px" }}>
                        🏛 {src.institution}
                      </div>
                      {src.scope && (
                        <div style={{ fontSize: "11px", color: "#8da594", marginTop: "6px", fontStyle: "italic" }}>
                          "{src.scope}"
                        </div>
                      )}
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: "11px", color: "var(--arg)", textDecoration: "none", marginTop: "10px", display: "inline-block" }}
                      >
                        ↗ Acceder al repositorio oficial
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === "timeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "var(--mist)", marginBottom: "6px" }}>
                Cronología maestra día por día (2 de abril — 14 de junio de 1982):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "480px", overflowY: "auto", paddingRight: "6px" }}>
                {timeline.map((item) => (
                  <div
                    key={item.date}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#101b15", border: "1px solid var(--line)", borderRadius: "3px", fontSize: "11px" }}
                  >
                    <span style={{ fontWeight: "bold", color: "var(--gold)", width: "90px", flexShrink: 0 }}>
                      {item.date}
                    </span>
                    <span style={{ color: "#b8cbbd", flex: 1, padding: "0 12px" }}>
                      {item.eventIds.length > 0
                        ? item.eventIds.join(" · ")
                        : "Operaciones de patrullaje / enlace logístico"}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--mist)", padding: "2px 6px", background: "#0b140f", border: "1px solid var(--line)", borderRadius: "2px", flexShrink: 0 }}>
                      {item.coverage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRINCIPLES TAB */}
          {activeTab === "principles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px", color: "#b8cbbd", lineHeight: 1.55 }}>
              <div className="historical-entry-card">
                <h3 style={{ margin: "0 0 6px", fontWeight: "bold", color: "var(--gold)", fontSize: "14px" }}>
                  1. Inmutabilidad del Resultado Histórico
                </h3>
                <p style={{ margin: 0 }}>
                  El resultado histórico es inmutable y no se sobreescribe con las victorias o derrotas del jugador en la simulación táctica. Las partidas del jugador constituyen exploraciones alternativas que siempre se contrastan con el desenlace real de los hechos documentados.
                </p>
              </div>

              <div className="historical-entry-card">
                <h3 style={{ margin: "0 0 6px", fontWeight: "bold", color: "var(--gold)", fontSize: "14px" }}>
                  2. Rigor y Atribución Cruzada
                </h3>
                <p style={{ margin: 0 }}>
                  Toda unidad militar, cota topográfica, alcance de tiro y suceso narrativo responde a partes oficiales y bibliografía académica verificada de ambos bandos (Ejército Argentino, Fuerza Aérea, Armada Argentina, Royal Navy, Parachute Regiment, Royal Marines).
                </p>
              </div>

              <div className="historical-entry-card">
                <h3 style={{ margin: "0 0 6px", fontWeight: "bold", color: "var(--gold)", fontSize: "14px" }}>
                  3. Tratamiento Sobrio y Respeto a los Combatientes
                </h3>
                <p style={{ margin: 0 }}>
                  El juego rechaza la banalización o lenguaje deshumanizante. Se prioriza la comprensión táctica, el sacrificio de los combatientes en condiciones extremas y el testimonio histórico directo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
