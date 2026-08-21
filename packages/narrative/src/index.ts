export type NarrativeAudience = "argentina" | "britain" | "correspondent";

export interface LocalizedText {
  "es-AR": string;
  "en-GB": string;
}

export interface HistoricalReference {
  sourceId: string;
  locator?: string;
  verified: boolean;
}

export interface DiaryEntry {
  id: string;
  date: string;
  missionId?: string;
  audience: NarrativeAudience;
  title: LocalizedText;
  body: LocalizedText;
  location?: LocalizedText;
  references: HistoricalReference[];
  unlock: {
    kind: "date" | "mission-start" | "mission-end" | "campaign-end";
    value: string;
  };
}

export interface CounterfactualComparison {
  historicalOutcomeId: string;
  playerOutcomeId: string;
  showHistoricalComparison: boolean;
}
