import type { Vec2 } from "./types";

/**
 * Types of terrain surface found in the Malvinas / Falklands theater.
 */
export type TerrainType =
  | "open-grass" // Pastizal abierto estándar
  | "peat-bog" // Turba húmeda/mallín (dificulta paso, nula cobertura de vehículos)
  | "rocky-ridge" // Crestas y afloramientos rocosos (elevado, buena cobertura)
  | "settlement" // Asentamiento / construcciones (alta cobertura, costo urbano)
  | "road" // Camino / pista de ripio o huella (alta velocidad)
  | "airstrip" // Pista de aterrizaje nivelada
  | "water" // Agua / costa intransitable para infantería común
  | "trench"; // Posición fortificada / trinchera cavada

export interface TerrainTypeProperties {
  label: { "es-AR": string; "en-GB": string };
  movementCost: number; // 1.0 = normal, >1.0 = lento, Infinity = intransitable
  coverModifier: number; // 0.0 (sin cobertura) a 1.0 (cobertura total)
  concealmentModifier: number; // Factor de ocultamiento táctico
  blocksLOS: boolean; // Si bloquea visión directa a nivel del suelo
}

export const TERRAIN_PROPERTIES: Record<TerrainType, TerrainTypeProperties> = {
  "open-grass": {
    label: { "es-AR": "Pastizal abierto", "en-GB": "Open grassland" },
    movementCost: 1.0,
    coverModifier: 0.05,
    concealmentModifier: 0.1,
    blocksLOS: false,
  },
  "peat-bog": {
    label: { "es-AR": "Turbal / Terreno blando", "en-GB": "Peat bog / Soft ground" },
    movementCost: 1.6,
    coverModifier: 0.1,
    concealmentModifier: 0.15,
    blocksLOS: false,
  },
  "rocky-ridge": {
    label: { "es-AR": "Cresta rocosa", "en-GB": "Rocky ridge" },
    movementCost: 1.4,
    coverModifier: 0.45,
    concealmentModifier: 0.4,
    blocksLOS: false,
  },
  settlement: {
    label: { "es-AR": "Asentamiento / Edificaciones", "en-GB": "Settlement / Buildings" },
    movementCost: 1.2,
    coverModifier: 0.55,
    concealmentModifier: 0.6,
    blocksLOS: true,
  },
  road: {
    label: { "es-AR": "Camino afirmado", "en-GB": "Dirt road / Track" },
    movementCost: 0.75, // Movimiento acelerado
    coverModifier: 0.0,
    concealmentModifier: 0.0,
    blocksLOS: false,
  },
  airstrip: {
    label: { "es-AR": "Pista de aterrizaje", "en-GB": "Airstrip" },
    movementCost: 0.8,
    coverModifier: 0.0,
    concealmentModifier: 0.0,
    blocksLOS: false,
  },
  water: {
    label: { "es-AR": "Agua / Costa", "en-GB": "Water / Shore" },
    movementCost: Infinity, // Intransitable
    coverModifier: 0.0,
    concealmentModifier: 0.0,
    blocksLOS: false,
  },
  trench: {
    label: { "es-AR": "Posición / Trinchera", "en-GB": "Fortified position / Trench" },
    movementCost: 1.1,
    coverModifier: 0.65,
    concealmentModifier: 0.5,
    blocksLOS: false,
  },
};

export interface TerrainCell {
  x: number;
  y: number;
  type: TerrainType;
  elevation: number; // 0 (nivel del mar) a 255 (altura táctica)
  customCover?: number;
}

export interface TerrainGrid {
  width: number;
  height: number;
  cellResolution: number; // Metros reales por celda (ej. 25m)
  cells: TerrainType[]; // Array plano de tamaño width * height
  elevations: Uint8Array | number[]; // Array plano de alturas (0-255)
}
