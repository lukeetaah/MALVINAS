import { describe, it, expect, vi } from "vitest";
import {
  createBoundingBox,
  getUnitsInBox,
  toggleUnitSelection,
  getUnitsOfSameKind,
  getNextSelectedUnitId,
} from "../input/selectionManager";
import { KeyboardInputHandler } from "../input/inputHandler";
import type { UnitState } from "@malvinas/simulation";

describe("Selection Manager", () => {
  const mockUnits: UnitState[] = [
    {
      id: "arg-inf-1",
      side: "argentina",
      kind: "infantry",
      label: "RI 12 Sec 1",
      position: { x: 10, y: 15 },
      health: 100,
      morale: 0.8,
      ammunition: 50,
      fuel: 1,
      selected: true,
      order: "idle",
      destination: null,
      targetUnitId: null,
      speed: 4,
      attackRange: 8,
      damage: 10,
      cooldownUntilTick: 0,
      alive: true,
      sightRange: 14,
      stealthRating: 0.35,
      armorRating: 0,
      penetrationRating: 0.15,
      suppressionPower: 0.1,
      suppressionLevel: 0,
      isSuppressed: false,
      entrenched: false,
      entrenchProgress: 0,
      controlGroup: null,
      path: [],
      maxAmmunition: 50,
      maxFuel: 1,
    },
    {
      id: "arg-inf-2",
      side: "argentina",
      kind: "infantry",
      label: "RI 12 Sec 2",
      position: { x: 12, y: 18 },
      health: 90,
      morale: 0.75,
      ammunition: 45,
      fuel: 1,
      selected: false,
      order: "idle",
      destination: null,
      targetUnitId: null,
      speed: 4,
      attackRange: 8,
      damage: 10,
      cooldownUntilTick: 0,
      alive: true,
      sightRange: 14,
      stealthRating: 0.35,
      armorRating: 0,
      penetrationRating: 0.15,
      suppressionPower: 0.1,
      suppressionLevel: 0,
      isSuppressed: false,
      entrenched: false,
      entrenchProgress: 0,
      controlGroup: null,
      path: [],
      maxAmmunition: 50,
      maxFuel: 1,
    },
    {
      id: "arg-art-1",
      side: "argentina",
      kind: "artillery",
      label: "GAA 4 Oto Melara",
      position: { x: 25, y: 30 },
      health: 100,
      morale: 0.9,
      ammunition: 20,
      fuel: 1,
      selected: false,
      order: "idle",
      destination: null,
      targetUnitId: null,
      speed: 1,
      attackRange: 24,
      damage: 35,
      cooldownUntilTick: 0,
      alive: true,
      sightRange: 20,
      stealthRating: 0.1,
      armorRating: 0.1,
      penetrationRating: 0.6,
      suppressionPower: 0.6,
      suppressionLevel: 0,
      isSuppressed: false,
      entrenched: false,
      entrenchProgress: 0,
      controlGroup: null,
      path: [],
      maxAmmunition: 50,
      maxFuel: 1,
    },
    {
      id: "uk-inf-1",
      side: "britain",
      kind: "infantry",
      label: "2 PARA A Coy",
      position: { x: 11, y: 16 },
      health: 100,
      morale: 0.9,
      ammunition: 60,
      fuel: 1,
      selected: false,
      order: "idle",
      destination: null,
      targetUnitId: null,
      speed: 4,
      attackRange: 8,
      damage: 12,
      cooldownUntilTick: 0,
      alive: true,
      sightRange: 14,
      stealthRating: 0.35,
      armorRating: 0,
      penetrationRating: 0.15,
      suppressionPower: 0.1,
      suppressionLevel: 0,
      isSuppressed: false,
      entrenched: false,
      entrenchProgress: 0,
      controlGroup: null,
      path: [],
      maxAmmunition: 50,
      maxFuel: 1,
    },
  ];

  it("calculates bounding box from two coordinates correctly", () => {
    const box = createBoundingBox({ x: 20, y: 30 }, { x: 5, y: 10 });
    expect(box.xMin).toBe(5);
    expect(box.xMax).toBe(20);
    expect(box.yMin).toBe(10);
    expect(box.yMax).toBe(30);
  });

  it("filters player units within bounding box", () => {
    const box = createBoundingBox({ x: 8, y: 12 }, { x: 15, y: 20 });
    const inBox = getUnitsInBox(mockUnits, "argentina", box);

    expect(inBox).toContain("arg-inf-1");
    expect(inBox).toContain("arg-inf-2");
    expect(inBox).not.toContain("arg-art-1"); // Outside box coordinates
    expect(inBox).not.toContain("uk-inf-1"); // Enemy unit excluded
  });

  it("toggles unit in selection list (Shift-click logic)", () => {
    const initial = ["arg-inf-1"];
    const added = toggleUnitSelection(initial, "arg-inf-2");
    expect(added).toEqual(["arg-inf-1", "arg-inf-2"]);

    const removed = toggleUnitSelection(added, "arg-inf-1");
    expect(removed).toEqual(["arg-inf-2"]);
  });

  it("selects all units of same kind (Double-click logic)", () => {
    const sameKind = getUnitsOfSameKind(mockUnits, "argentina", "infantry");
    expect(sameKind).toEqual(["arg-inf-1", "arg-inf-2"]);
    expect(sameKind).not.toContain("arg-art-1");
  });

  it("cycles to next unit in selection (Tab logic)", () => {
    const ids = ["arg-inf-1", "arg-inf-2", "arg-art-1"];
    expect(getNextSelectedUnitId(ids, null)).toBe("arg-inf-1");
    expect(getNextSelectedUnitId(ids, "arg-inf-1")).toBe("arg-inf-2");
    expect(getNextSelectedUnitId(ids, "arg-inf-2")).toBe("arg-art-1");
    expect(getNextSelectedUnitId(ids, "arg-art-1")).toBe("arg-inf-1");
  });
});

describe("KeyboardInputHandler", () => {
  it("triggers correct callbacks on keypress events", () => {
    const onHold = vi.fn();
    const onEntrench = vi.fn();
    const onRetreat = vi.fn();
    const onAttack = vi.fn();
    const onAssignGroup = vi.fn();
    const onSelectGroup = vi.fn();

    const handler = new KeyboardInputHandler({
      getSelectedUnitIds: () => ["arg-inf-1"],
      getPlayerSide: () => "argentina",
      onAssignGroup,
      onSelectGroup,
      onHoldOrder: onHold,
      onEntrenchOrder: onEntrench,
      onRetreatOrder: onRetreat,
      onSetAttackMode: onAttack,
      onClearSelection: vi.fn(),
      onCenterCameraOnSelection: vi.fn(),
      onCycleSelection: vi.fn(),
    });

    // Trigger 'E' key for entrench
    handler.handleKeyEvent({ key: "e" });
    expect(onEntrench).toHaveBeenCalledTimes(1);

    // Trigger 'H' for hold
    handler.handleKeyEvent({ key: "h" });
    expect(onHold).toHaveBeenCalledTimes(1);

    // Trigger 'R' for retreat
    handler.handleKeyEvent({ key: "r" });
    expect(onRetreat).toHaveBeenCalledTimes(1);

    // Trigger 'A' for attack mode
    handler.handleKeyEvent({ key: "a" });
    expect(onAttack).toHaveBeenCalledTimes(1);

    // Trigger Ctrl+1 for group assignment
    handler.handleKeyEvent({ key: "1", ctrlKey: true });
    expect(onAssignGroup).toHaveBeenCalledWith(1, ["arg-inf-1"]);

    // Trigger 1 for group selection
    handler.handleKeyEvent({ key: "1" });
    expect(onSelectGroup).toHaveBeenCalledWith(1);
  });
});
