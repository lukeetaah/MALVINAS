import type { Side, UnitKind, UnitOrder, WeatherType } from "./types";

export type Locale = "es-AR" | "en-GB";

export interface TacticalTranslationDictionary {
  // General & Factions
  "side.argentina": string;
  "side.britain": string;
  "faction.argentina.army": string;
  "faction.argentina.airforce": string;
  "faction.argentina.navy": string;
  "faction.britain.army": string;
  "faction.britain.marines": string;
  "faction.britain.airforce": string;
  "faction.britain.navy": string;

  // Unit Kinds
  "unit.kind.infantry": string;
  "unit.kind.support-weapon": string;
  "unit.kind.artillery": string;
  "unit.kind.recon": string;
  "unit.kind.armor": string;
  "unit.kind.armour": string;
  "unit.kind.aircraft": string;
  "unit.kind.naval": string;
  "unit.kind.ship": string;

  // Unit Orders
  "order.idle": string;
  "order.hold": string;
  "order.move": string;
  "order.attack": string;
  "order.support": string;
  "order.suppress": string;
  "order.entrench": string;
  "order.retreat": string;
  "order.resupply": string;

  // Combat & Tactical Statuses
  "status.entrenched": string;
  "status.pinned": string;
  "status.outOfAmmo": string;
  "status.lowAmmo": string;
  "status.outOfFuel": string;
  "status.retreating": string;
  "status.detected": string;
  "status.hidden": string;
  "status.alive": string;
  "status.kia": string;

  // Weather Conditions
  "weather.clear": string;
  "weather.overcast": string;
  "weather.dense-fog": string;
  "weather.rain": string;
  "weather.snow-blizzard": string;
  "weather.gale-winds": string;

  // Mission Evaluation & Outcomes
  "outcome.decisiveVictory": string;
  "outcome.marginalVictory": string;
  "outcome.stalemate": string;
  "outcome.defeat": string;
  "outcome.historicalRecord": string;

  // UI & HUD Controls
  "ui.briefing": string;
  "ui.chooseSide": string;
  "ui.choosePlan": string;
  "ui.situation": string;
  "ui.historicalFrame": string;
  "ui.launch": string;
  "ui.tacticalBoard": string;
  "ui.pause": string;
  "ui.resume": string;
  "ui.orders": string;
  "ui.objectives": string;
  "ui.forceStatus": string;
  "ui.combatLog": string;
  "ui.operationalTime": string;
  "ui.control": string;
  "ui.simulationResult": string;
  "ui.historicalArchive": string;
  "ui.replay": string;
  "ui.openingPlan": string;
  "ui.inProgress": string;
  "ui.completed": string;
  "ui.situationReport": string;
  "ui.sources": string;
  "ui.selectedUnit": string;
  "ui.noSelection": string;
  "ui.availableForce": string;
  "ui.returnToBriefing": string;
  "ui.playerObjective": string;
  "ui.tooltip": string;
  "ui.ammo": string;
  "ui.fuel": string;
  "ui.health": string;
}

export type TranslationKey = keyof TacticalTranslationDictionary;

export const DICTIONARIES: Record<Locale, TacticalTranslationDictionary> = {
  "es-AR": {
    "side.argentina": "Argentina",
    "side.britain": "Reino Unido",
    "faction.argentina.army": "Ejército Argentino",
    "faction.argentina.airforce": "Fuerza Aérea Argentina",
    "faction.argentina.navy": "Armada Argentina",
    "faction.britain.army": "Ejército Británico",
    "faction.britain.marines": "Royal Marines",
    "faction.britain.airforce": "Royal Air Force",
    "faction.britain.navy": "Royal Navy",

    "unit.kind.infantry": "Infantería",
    "unit.kind.support-weapon": "Armas de Apoyo / Ametralladoras",
    "unit.kind.artillery": "Artillería de Campaña / Morteros",
    "unit.kind.recon": "Exploración / Comandos",
    "unit.kind.armor": "Vehículos Blindados",
    "unit.kind.armour": "Vehículos Blindados",
    "unit.kind.aircraft": "Aviación Táctica",
    "unit.kind.naval": "Buques de Superficie",
    "unit.kind.ship": "Buques de Guerra / Fragatas",

    "order.idle": "En Espera",
    "order.hold": "Mantener [H]",
    "order.move": "Mover [M]",
    "order.attack": "Fuego Directo [A]",
    "order.support": "Apoyo de Fuego",
    "order.suppress": "Fuego de Supresión",
    "order.entrench": "Atrincherar [E]",
    "order.retreat": "Repliegue [R]",
    "order.resupply": "Solicitar Reabastecimiento",

    "status.entrenched": "ATRINCHERADO",
    "status.pinned": "BAJO FUEGO / AFERRADO",
    "status.outOfAmmo": "SIN MUNICIÓN",
    "status.lowAmmo": "MUNICIÓN CRÍTICA (<50%)",
    "status.outOfFuel": "SIN COMBUSTIBLE / INMOVILIZADO",
    "status.retreating": "REPLEGÁNDOSE",
    "status.detected": "DETECTADA",
    "status.hidden": "OCULTA",
    "status.alive": "OPERATIVA",
    "status.kia": "BAJA EN COMBATE",

    "weather.clear": "Despejado Austral",
    "weather.overcast": "Nublado Antártico",
    "weather.dense-fog": "Niebla Cerrada (Visibilidad Reducida)",
    "weather.rain": "Lluvia y Turbera Anegada",
    "weather.snow-blizzard": "Ventisca y Nieve (Vuelo Suspendido)",
    "weather.gale-winds": "Temporal de Viento Fuerte",

    "outcome.decisiveVictory": "Victoria Decisiva",
    "outcome.marginalVictory": "Victoria Marginal",
    "outcome.stalemate": "Empate Táctico",
    "outcome.defeat": "Derrota Táctica",
    "outcome.historicalRecord": "Resultado Histórico Documentado",

    "ui.briefing": "BRIEFING OPERACIONAL",
    "ui.chooseSide": "ELEGÍ TU PERSPECTIVA",
    "ui.choosePlan": "ELEGÍ EL ENFOQUE INICIAL",
    "ui.situation": "SITUACIÓN TÁCTICA",
    "ui.historicalFrame": "MARCO HISTÓRICO",
    "ui.launch": "INICIAR SIMULACIÓN",
    "ui.tacticalBoard": "TABLERO TÁCTICO",
    "ui.pause": "PAUSAR",
    "ui.resume": "REANUDAR",
    "ui.orders": "ÓRDENES TÁCTICAS",
    "ui.objectives": "OBJETIVOS",
    "ui.forceStatus": "ESTADO DE FUERZAS",
    "ui.combatLog": "REGISTRO DE COMBATE",
    "ui.operationalTime": "TIEMPO OPERATIVO",
    "ui.control": "CONTROL",
    "ui.simulationResult": "RESULTADO DE LA SIMULACIÓN",
    "ui.historicalArchive": "ARCHIVO HISTÓRICO",
    "ui.replay": "TOMAR OTRA DECISIÓN",
    "ui.openingPlan": "ENFOQUE ADOPTADO",
    "ui.inProgress": "EN CURSO",
    "ui.completed": "FINALIZADA",
    "ui.situationReport": "PARTE DE SITUACIÓN",
    "ui.sources": "Fuentes",
    "ui.selectedUnit": "UNIDAD SELECCIONADA",
    "ui.noSelection": "Seleccioná unidades o arrastrá un cuadro (Shift para sumar).",
    "ui.availableForce": "FUERZA DISPONIBLE",
    "ui.returnToBriefing": "Volver al briefing",
    "ui.playerObjective": "TU OBJETIVO",
    "ui.tooltip": "Click izquierdo: seleccionar/caja · Click derecho: mover o atacar · Rueda: zoom · Botón central: arrastrar mapa",
    "ui.ammo": "Munición",
    "ui.fuel": "Combustible",
    "ui.health": "Integridad",
  },
  "en-GB": {
    "side.argentina": "Argentina",
    "side.britain": "United Kingdom",
    "faction.argentina.army": "Argentine Army",
    "faction.argentina.airforce": "Argentine Air Force",
    "faction.argentina.navy": "Argentine Navy",
    "faction.britain.army": "British Army",
    "faction.britain.marines": "Royal Marines",
    "faction.britain.airforce": "Royal Air Force",
    "faction.britain.navy": "Royal Navy",

    "unit.kind.infantry": "Infantry",
    "unit.kind.support-weapon": "Support Weapons / Machine Guns",
    "unit.kind.artillery": "Field Artillery / Mortars",
    "unit.kind.recon": "Reconnaissance / Special Forces",
    "unit.kind.armor": "Armoured Vehicles",
    "unit.kind.armour": "Armoured Vehicles",
    "unit.kind.aircraft": "Tactical Aviation",
    "unit.kind.naval": "Surface Vessels",
    "unit.kind.ship": "Warships / Frigates",

    "order.idle": "Idle",
    "order.hold": "Hold [H]",
    "order.move": "Move [M]",
    "order.attack": "Direct Fire [A]",
    "order.support": "Fire Support",
    "order.suppress": "Suppressive Fire",
    "order.entrench": "Entrench [E]",
    "order.retreat": "Tactical Retreat [R]",
    "order.resupply": "Request Resupply",

    "status.entrenched": "ENTRENCHED",
    "status.pinned": "PINNED / UNDER FIRE",
    "status.outOfAmmo": "OUT OF AMMUNITION",
    "status.lowAmmo": "CRITICAL AMMUNITION (<50%)",
    "status.outOfFuel": "OUT OF FUEL / IMMOBILISED",
    "status.retreating": "RETREATING",
    "status.detected": "DETECTED",
    "status.hidden": "CONCEALED",
    "status.alive": "OPERATIONAL",
    "status.kia": "CASUALTY / KIA",

    "weather.clear": "Southern Clear",
    "weather.overcast": "Antarctic Overcast",
    "weather.dense-fog": "Dense Fog (Reduced Sight)",
    "weather.rain": "Rain & Saturated Peat",
    "weather.snow-blizzard": "Snow Blizzard (Flights Grounded)",
    "weather.gale-winds": "Gale-Force Storm",

    "outcome.decisiveVictory": "Decisive Victory",
    "outcome.marginalVictory": "Marginal Victory",
    "outcome.stalemate": "Tactical Stalemate",
    "outcome.defeat": "Tactical Defeat",
    "outcome.historicalRecord": "Recorded Historical Outcome",

    "ui.briefing": "OPERATIONAL BRIEFING",
    "ui.chooseSide": "CHOOSE PERSPECTIVE",
    "ui.choosePlan": "CHOOSE INITIAL DOCTRINE",
    "ui.situation": "TACTICAL SITUATION",
    "ui.historicalFrame": "HISTORICAL FRAME",
    "ui.launch": "START SIMULATION",
    "ui.tacticalBoard": "TACTICAL BOARD",
    "ui.pause": "PAUSE",
    "ui.resume": "RESUME",
    "ui.orders": "TACTICAL ORDERS",
    "ui.objectives": "OBJECTIVES",
    "ui.forceStatus": "FORCE STATUS",
    "ui.combatLog": "COMBAT LOG",
    "ui.operationalTime": "OPERATIONAL TIME",
    "ui.control": "CONTROL",
    "ui.simulationResult": "SIMULATION RESULT",
    "ui.historicalArchive": "HISTORICAL ARCHIVE",
    "ui.replay": "MAKE A NEW DECISION",
    "ui.openingPlan": "OPENING PLAN",
    "ui.inProgress": "IN PROGRESS",
    "ui.completed": "COMPLETE",
    "ui.situationReport": "SITUATION REPORT",
    "ui.sources": "Sources",
    "ui.selectedUnit": "SELECTED UNIT",
    "ui.noSelection": "Select units or drag box (Shift to add).",
    "ui.availableForce": "AVAILABLE FORCE",
    "ui.returnToBriefing": "Return to briefing",
    "ui.playerObjective": "YOUR OBJECTIVE",
    "ui.tooltip": "Left click: select/box · Right click: move or attack · Wheel: zoom · Middle button: pan map",
    "ui.ammo": "Ammo",
    "ui.fuel": "Fuel",
    "ui.health": "Integrity",
  },
};

/**
 * Resolves a translated string by key with optional interpolation.
 */
export function t(
  key: TranslationKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES["es-AR"];
  let text = dictionary[key] ?? key;

  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${paramKey}}`, "g"), String(value));
    }
  }

  return text;
}

/**
 * Returns localized name for unit kind.
 */
export function translateUnitKind(kind: UnitKind, locale: Locale): string {
  const key = `unit.kind.${kind}` as TranslationKey;
  return t(key, locale);
}

/**
 * Returns localized name for unit order.
 */
export function translateUnitOrder(order: UnitOrder, locale: Locale): string {
  const key = `order.${order}` as TranslationKey;
  return t(key, locale);
}

/**
 * Returns localized name for weather condition.
 */
export function translateWeather(weather: WeatherType, locale: Locale): string {
  const key = `weather.${weather}` as TranslationKey;
  return t(key, locale);
}

/**
 * Formats operational battle elapsed time (e.g. "02:45").
 */
export function formatOperationalTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats tactical supply report (ammunition & fuel).
 */
export function formatSupplyStatus(
  ammo: number,
  fuel: number,
  locale: Locale,
): string {
  const ammoLabel = t("ui.ammo", locale);
  const fuelLabel = t("ui.fuel", locale);
  return `${ammoLabel}: ${ammo}% | ${fuelLabel}: ${fuel}%`;
}
