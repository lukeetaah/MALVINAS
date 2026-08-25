import { describe, it, expect } from "vitest";
import { TacticalCamera } from "../renderer/camera";

describe("TacticalCamera", () => {
  it("initializes with center of world and fit-to-view zoom", () => {
    const camera = new TacticalCamera(100, 60, 800, 480);
    expect(camera.x).toBe(50);
    expect(camera.y).toBe(30);
    expect(camera.zoom).toBe(8); // 800/100 = 8, 480/60 = 8
  });

  it("converts world coordinates to screen pixel coordinates", () => {
    const camera = new TacticalCamera(100, 60, 800, 480);
    // Center of world (50, 30) should be center of screen (400, 240)
    const centerScreen = camera.worldToScreen({ x: 50, y: 30 }, 800, 480);
    expect(centerScreen.x).toBe(400);
    expect(centerScreen.y).toBe(240);

    // World origin (0, 0)
    const originScreen = camera.worldToScreen({ x: 0, y: 0 }, 800, 480);
    expect(originScreen.x).toBe(400 - 50 * 8); // 0
    expect(originScreen.y).toBe(240 - 30 * 8); // 0
  });

  it("converts screen pixel coordinates back to world coordinates", () => {
    const camera = new TacticalCamera(100, 60, 800, 480);
    const worldPoint = camera.screenToWorld({ x: 400, y: 240 }, 800, 480);
    expect(worldPoint.x).toBe(50);
    expect(worldPoint.y).toBe(30);

    const worldOrigin = camera.screenToWorld({ x: 0, y: 0 }, 800, 480);
    expect(worldOrigin.x).toBe(0);
    expect(worldOrigin.y).toBe(0);
  });

  it("pans camera using screen delta", () => {
    const camera = new TacticalCamera(100, 60, 800, 480);
    camera.panByScreenDelta(80, 0); // pan right by 80px (10 world units at zoom 8)
    expect(camera.x).toBe(40);
  });

  it("zooms at specific anchor point while preserving world position under anchor", () => {
    const camera = new TacticalCamera(100, 60, 800, 480);
    const anchor = { x: 200, y: 120 };
    const worldBefore = camera.screenToWorld(anchor, 800, 480);

    camera.zoomAtScreenPoint(1.5, anchor, 800, 480);

    const worldAfter = camera.screenToWorld(anchor, 800, 480);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });
});
