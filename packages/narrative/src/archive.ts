import rawSources from "../../../data/history/sources.json";
import rawMaster from "../../../data/history/master.json";
import rawDiaries from "../../../data/history/diaries.json";
import type { DiaryEntry, LocalizedText } from "./index";

export interface HistoricalSource {
  id: string;
  title: string;
  institution: string;
  kind: string;
  url?: string;
  scope?: string;
}

export interface TimelineDayIndex {
  date: string;
  eventIds: string[];
  coverage: string;
}

export interface HistoricalMissionContext {
  missionId: string;
  sources: HistoricalSource[];
  diaries: DiaryEntry[];
  narrativeSummary: LocalizedText;
  dateRange: { start: string; end: string };
}

const SOURCES: HistoricalSource[] = (rawSources as any).sources ?? [];
const TIMELINE: TimelineDayIndex[] = (rawMaster as any).dailyIndex ?? [];
const DIARIES: DiaryEntry[] = (rawDiaries as any).entries ?? [];

/**
 * Returns all verified primary and secondary historical sources in the catalog.
 */
export function getAllSources(): HistoricalSource[] {
  return SOURCES;
}

/**
 * Retrieves a historical source by its unique bibliographic identifier.
 */
export function getSourceById(id: string): HistoricalSource | undefined {
  return SOURCES.find((s) => s.id === id);
}

/**
 * Returns daily chronological timeline index.
 */
export function getDailyTimeline(): TimelineDayIndex[] {
  return TIMELINE;
}

/**
 * Returns timeline entries between startDate and endDate inclusive.
 */
export function getTimelineInRange(
  startDate: string,
  endDate: string,
): TimelineDayIndex[] {
  return TIMELINE.filter(
    (entry) => entry.date >= startDate && entry.date <= endDate,
  );
}

/**
 * Returns all war diary entries associated with a specific tactical mission.
 */
export function getDiariesForMission(missionId: string): DiaryEntry[] {
  return DIARIES.filter(
    (d) => d.missionId === missionId || d.unlock?.missionId === missionId,
  );
}

/**
 * Formats a clean academic citation for a given historical source and locator.
 */
export function formatSourceCitation(
  source: HistoricalSource,
  locator?: string,
): string {
  const locStr = locator ? ` — ${locator}` : "";
  return `${source.institution} (${source.title})${locStr}`;
}

/**
 * Aggregates complete documentary historical context for a specific battle scenario.
 */
export function getHistoricalContextForMission(
  missionId: string,
): HistoricalMissionContext {
  const diaries = getDiariesForMission(missionId);

  // Extract all referenced source IDs
  const sourceIdSet = new Set<string>();
  for (const diary of diaries) {
    for (const ref of diary.references ?? []) {
      sourceIdSet.add(ref.sourceId);
    }
  }

  const sources = Array.from(sourceIdSet)
    .map((id) => getSourceById(id))
    .filter((s): s is HistoricalSource => Boolean(s));

  // Fallback defaults if no sources attached
  if (sources.length === 0 && SOURCES.length > 0) {
    sources.push(SOURCES[0]);
  }

  const summaries: Record<string, LocalizedText> = {
    "goose-green-1982": {
      "es-AR": "Batalla de Pradera del Ganso y Darwin (27–29 de mayo de 1982): enfrentamiento de infantería y apoyo de fuego en el istmo de Darwin entre la Fuerza de Tareas Mercedes (RI 12, RI 25, GADA 601, GAA 4) y el 2do Batallón del Regimiento de Paracaidistas británico (2 PARA).",
      "en-GB": "Battle of Goose Green and Darwin (27–29 May 1982): infantry and fire-support engagement across Darwin isthmus between Argentine Task Force Mercedes and the British 2nd Battalion, Parachute Regiment (2 PARA).",
    },
    "mount-longdon-1982": {
      "es-AR": "Combate de Monte Longdon (11–12 de junio de 1982): asalto nocturno de infantería británico (3 PARA) sobre las posiciones defensivas fortificadas del Regimiento de Infantería 7 en la cresta rocosa.",
      "en-GB": "Battle of Mount Longdon (11–12 June 1982): British night assault (3 PARA) against fortified defensive positions of the Argentine 7th Infantry Regiment along the rocky ridge.",
    },
    "san-carlos-1982": {
      "es-AR": "Desembarco en San Carlos y Bomb Alley (21–25 de mayo de 1982): asalto anfibio de la 3 Brigada de Comandos británica en el Brazo San Carlos y sucesivas oleadas de ataque naval rasante de la Fuerza Aérea y Aviación Naval argentina.",
      "en-GB": "San Carlos Landings and Bomb Alley (21–25 May 1982): amphibious assault by British 3 Commando Brigade in San Carlos Water and low-level anti-shipping strikes by Argentine Air Force and Naval aviation.",
    },
  };

  const narrativeSummary = summaries[missionId] ?? {
    "es-AR": "Archivo documental y registro histórico de las operaciones militares de 1982.",
    "en-GB": "Documentary archive and historical record of the 1982 military operations.",
  };

  return {
    missionId,
    sources,
    diaries,
    narrativeSummary,
    dateRange: {
      start: diaries[0]?.date ?? "1982-04-02",
      end: diaries[diaries.length - 1]?.date ?? "1982-06-14",
    },
  };
}
