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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-[#0c1511] border border-[#2b4133] rounded-lg shadow-2xl overflow-hidden font-mono text-sm text-[#dce7dc]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b4133] bg-[#111e18]">
          <div>
            <h2 className="text-base font-bold tracking-wider text-[#f4d787]">
              {labels.title}
            </h2>
            <p className="text-xs text-[#8da594] mt-0.5">{labels.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs border border-[#44624d] rounded text-[#c5d36e] hover:bg-[#1a2d24] transition-colors"
          >
            ✕ {labels.close}
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-[#2b4133] bg-[#0e1914] px-6 gap-2">
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
              className={`py-3 px-4 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
                activeTab === key
                  ? "border-[#f4d787] text-[#f4d787]"
                  : "border-transparent text-[#7e9985] hover:text-[#c5d36e]"
              }`}
            >
              {title}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* DIARIES TAB */}
          {activeTab === "diaries" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#14231b] border border-[#2b4133] rounded">
                <span className="text-xs font-bold text-[#c5d36e]">
                  {mission.title[locale]}
                </span>
                <p className="text-xs text-[#b8cbbd] mt-1 leading-relaxed">
                  {missionContext.narrativeSummary[locale]}
                </p>
              </div>

              {missionContext.diaries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-5 bg-[#101b15] border border-[#213529] rounded space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#f4d787]">
                      {entry.title[locale]}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 border border-[#3b5744] rounded text-[#8da594]">
                      {entry.date} · {entry.side?.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-[#dce7dc] leading-relaxed">
                    {entry.body[locale]}
                  </p>

                  {entry.location && (
                    <div className="text-[11px] text-[#7e9985]">
                      📍 {labels.location}: {entry.location[locale]}
                    </div>
                  )}

                  {entry.references.length > 0 && (
                    <div className="pt-2 border-t border-[#1a2d24] flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] text-[#6d8874]">
                        {labels.referenceCount}:
                      </span>
                      {entry.references.map((ref, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-[#16271e] text-[#a9c1af] px-2 py-0.5 rounded border border-[#2b4133]"
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
            <div className="space-y-3">
              <div className="text-xs text-[#8da594] mb-2">
                Fuentes historiográficas y fondos documentales indexados en el sistema:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allSources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 bg-[#101b15] border border-[#213529] rounded flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-[#f4d787]">
                          {src.id}
                        </span>
                        <span className="text-[9px] bg-[#1d3527] text-[#c5d36e] px-1.5 py-0.5 rounded">
                          {labels.verified}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#dce7dc]">
                        {src.title}
                      </div>
                      <div className="text-[11px] text-[#8da594] mt-0.5">
                        🏛 {src.institution}
                      </div>
                      {src.scope && (
                        <div className="text-[10px] text-[#6d8874] mt-2 italic">
                          "{src.scope}"
                        </div>
                      )}
                    </div>
                    {src.url && (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-[#c5d36e] hover:underline mt-3 inline-block"
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
            <div className="space-y-2">
              <div className="text-xs text-[#8da594] mb-3">
                Cronología maestra día por día (2 de abril — 14 de junio de 1982):
              </div>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-2">
                {timeline.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between p-2.5 bg-[#101b15] border border-[#1b2c22] rounded text-xs"
                  >
                    <span className="font-bold text-[#f4d787] w-24">
                      {item.date}
                    </span>
                    <span className="text-[#b8cbbd] flex-1 px-4">
                      {item.eventIds.length > 0
                        ? item.eventIds.join(" · ")
                        : "Operaciones de patrullaje / enlace logístico"}
                    </span>
                    <span className="text-[10px] text-[#6d8874] px-2 py-0.5 bg-[#0b140f] rounded border border-[#1b2c22]">
                      {item.coverage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRINCIPLES TAB */}
          {activeTab === "principles" && (
            <div className="space-y-4 text-xs text-[#b8cbbd] leading-relaxed p-2">
              <div className="p-4 bg-[#14231b] border border-[#2b4133] rounded space-y-2">
                <h3 className="font-bold text-[#f4d787] text-sm">
                  1. Inmutabilidad del Resultado Histórico
                </h3>
                <p>
                  El resultado histórico es inmutable y no se sobreescribe con las victorias o derrotas del jugador en la simulación táctica. Las partidas del jugador constituyen exploraciones alternativas que siempre se contrastan con el desenlace real de los hechos documentados.
                </p>
              </div>

              <div className="p-4 bg-[#14231b] border border-[#2b4133] rounded space-y-2">
                <h3 className="font-bold text-[#f4d787] text-sm">
                  2. Rigor y Atribución Cruzada
                </h3>
                <p>
                  Toda unidad militar, cota topográfica, alcance de tiro y suceso narrativo responde a partes oficiales y bibliografía académica verificada de ambos bandos (Ejército Argentino, Fuerza Aérea, Armada Argentina, Royal Navy, Parachute Regiment, Royal Marines).
                </p>
              </div>

              <div className="p-4 bg-[#14231b] border border-[#2b4133] rounded space-y-2">
                <h3 className="font-bold text-[#f4d787] text-sm">
                  3. Tratamiento Sobrio y Respeto a los Combatientes
                </h3>
                <p>
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
