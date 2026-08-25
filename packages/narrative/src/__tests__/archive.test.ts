import { describe, it, expect } from "vitest";
import {
  getAllSources,
  getSourceById,
  getDailyTimeline,
  getTimelineInRange,
  getDiariesForMission,
  getHistoricalContextForMission,
  formatSourceCitation,
} from "../archive";

describe("Historical Archive", () => {
  it("loads the full sources catalog", () => {
    const sources = getAllSources();
    expect(sources.length).toBeGreaterThanOrEqual(5);
    expect(sources[0]).toHaveProperty("id");
    expect(sources[0]).toHaveProperty("institution");
  });

  it("retrieves a specific source by id", () => {
    const source = getSourceById("ARG-FAA-TIMELINE");
    expect(source).toBeDefined();
    expect(source!.institution).toContain("Fuerza Aérea");
  });

  it("loads the daily timeline covering the full war period", () => {
    const timeline = getDailyTimeline();
    expect(timeline.length).toBeGreaterThanOrEqual(70);
    expect(timeline[0].date).toBe("1982-04-02");
    expect(timeline[timeline.length - 1].date).toBe("1982-06-14");
  });

  it("filters timeline by date range", () => {
    const mayTimeline = getTimelineInRange("1982-05-01", "1982-05-04");
    expect(mayTimeline.length).toBe(4);
    expect(mayTimeline[0].date).toBe("1982-05-01");
    expect(mayTimeline[3].date).toBe("1982-05-04");
  });

  it("resolves war diaries for mount-longdon-1982 mission", () => {
    const diaries = getDiariesForMission("mount-longdon-1982");
    expect(diaries.length).toBeGreaterThanOrEqual(2);
    const sides = new Set(diaries.map((d) => d.side));
    expect(sides.has("argentina")).toBe(true);
    expect(sides.has("britain")).toBe(true);
  });

  it("aggregates full historical context for a mission", () => {
    const ctx = getHistoricalContextForMission("mount-longdon-1982");
    expect(ctx.missionId).toBe("mount-longdon-1982");
    expect(ctx.sources.length).toBeGreaterThanOrEqual(1);
    expect(ctx.diaries.length).toBeGreaterThanOrEqual(2);
    expect(ctx.narrativeSummary["es-AR"]).toContain("Monte Longdon");
    expect(ctx.narrativeSummary["en-GB"]).toContain("Mount Longdon");
    expect(ctx.dateRange.start).toBeDefined();
  });

  it("formats academic source citations", () => {
    const source = getSourceById("ARG-FAA-TIMELINE")!;
    const citation = formatSourceCitation(source, "2 April");
    expect(citation).toContain("Fuerza Aérea Argentina");
    expect(citation).toContain("2 April");
  });
});
