export type NarrativeAudience = "argentina" | "britain" | "correspondent";
export type DiarySide = "argentina" | "britain" | "neutral";
export type DiaryVoice = "operational-log" | "soldier" | "aircrew" | "correspondent";

export interface LocalizedText {
  "es-AR": string;
  "en-GB": string;
}

export interface HistoricalReference {
  sourceId: string;
  locator?: string;
  verified: boolean;
}

export type DiaryUnlockKind =
  | "date"
  | "mission-start"
  | "mission-end"
  | "campaign-end";

export interface DiaryUnlock {
  kind: DiaryUnlockKind;
  value: string;
  missionId?: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  missionId?: string;
  side?: DiarySide;
  audience: NarrativeAudience;
  voice: DiaryVoice;
  documentary: boolean;
  title: LocalizedText;
  body: LocalizedText;
  location?: LocalizedText;
  references: HistoricalReference[];
  unlock: DiaryUnlock;
}

export interface DiaryCatalog {
  schemaVersion: number;
  datasetId: string;
  entries: DiaryEntry[];
}

export interface DiaryTrigger {
  kind: DiaryUnlockKind;
  date?: string;
  missionId?: string;
}

export interface CounterfactualComparison {
  historicalOutcomeId: string;
  playerOutcomeId: string;
  showHistoricalComparison: boolean;
}

export * from "./catalog";
