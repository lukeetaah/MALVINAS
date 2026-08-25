import { describe, it, expect } from "vitest";
import { worldToMinimap, minimapToWorld } from "../components/hud/Minimap";
import { formatOperationalTime } from "@malvinas/simulation";

describe("HUD Components & Mathematical Calculations", () => {
  it("converts world coordinates to minimap coordinates accurately", () => {
    const mapW = 1000;
    const mapH = 1000;
    const miniW = 200;
    const miniH = 200;

    const origin = worldToMinimap(0, 0, mapW, mapH, miniW, miniH);
    expect(origin.x).toBe(0);
    expect(origin.y).toBe(0);

    const center = worldToMinimap(500, 500, mapW, mapH, miniW, miniH);
    expect(center.x).toBe(100);
    expect(center.y).toBe(100);

    const edge = worldToMinimap(1000, 1000, mapW, mapH, miniW, miniH);
    expect(edge.x).toBe(200);
    expect(edge.y).toBe(200);
  });

  it("clamps out-of-bounds world coordinates on the minimap", () => {
    const mapW = 1000;
    const mapH = 1000;
    const miniW = 200;
    const miniH = 200;

    const negative = worldToMinimap(-100, -50, mapW, mapH, miniW, miniH);
    expect(negative.x).toBe(0);
    expect(negative.y).toBe(0);

    const overflow = worldToMinimap(1500, 2000, mapW, mapH, miniW, miniH);
    expect(overflow.x).toBe(200);
    expect(overflow.y).toBe(200);
  });

  it("inverts minimap clicks to world coordinates with precision", () => {
    const mapW = 1200;
    const mapH = 800;
    const miniW = 240;
    const miniH = 160;

    const clickCenter = minimapToWorld(120, 80, mapW, mapH, miniW, miniH);
    expect(clickCenter.worldX).toBe(600);
    expect(clickCenter.worldY).toBe(400);

    const clickEdge = minimapToWorld(240, 160, mapW, mapH, miniW, miniH);
    expect(clickEdge.worldX).toBe(1200);
    expect(clickEdge.worldY).toBe(800);
  });

  it("formats operational mission seconds into clean standard time", () => {
    expect(formatOperationalTime(0)).toBe("00:00");
    expect(formatOperationalTime(45)).toBe("00:45");
    expect(formatOperationalTime(125)).toBe("02:05");
    expect(formatOperationalTime(3600)).toBe("60:00");
  });
});
