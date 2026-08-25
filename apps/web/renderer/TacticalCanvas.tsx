"use client";

import React, { useEffect, useRef, useState, type MouseEvent, type WheelEvent } from "react";
import {
  type MatchState,
  type MissionDefinition,
  type Side,
  type TerrainGrid,
  type UnitState,
  type Vec2,
} from "@malvinas/simulation";
import { useGameStore } from "@/store/gameStore";
import { TacticalCamera } from "./camera";
import { drawTerrain } from "./drawTerrain";
import { drawFeatures } from "./drawFeatures";
import { drawFog } from "./drawFog";
import { drawUnits } from "./drawUnits";
import { drawWeather } from "./drawWeather";
import { drawOverlay } from "./drawOverlay";
import { KeyboardInputHandler } from "@/input/inputHandler";
import {
  createBoundingBox,
  getNextSelectedUnitId,
  getUnitsInBox,
  getUnitsOfSameKind,
  toggleUnitSelection,
} from "@/input/selectionManager";

interface TacticalCanvasProps {
  mapWidth: number;
  mapHeight: number;
  terrain?: TerrainGrid;
  cameraPanTarget?: { x: number; y: number } | null;
}

export function TacticalCanvas({
  mapWidth,
  mapHeight,
  terrain,
  cameraPanTarget,
}: TacticalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<TacticalCamera>(
    new TacticalCamera(mapWidth, mapHeight, 800, 500),
  );

  useEffect(() => {
    if (cameraPanTarget) {
      cameraRef.current.x = cameraPanTarget.x;
      cameraRef.current.y = cameraPanTarget.y;
    }
  }, [cameraPanTarget]);

  // Interaction tracking state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const dragStartPos = useRef<Vec2>({ x: 0, y: 0 });
  const [dragBox, setDragBox] = useState<{ start: Vec2; current: Vec2 } | null>(
    null,
  );

  const state = useGameStore((s) => s.state);
  const mission = useGameStore((s) => s.mission);
  const locale = useGameStore((s) => s.locale);
  const mode = useGameStore((s) => s.mode);
  const playerSide = useGameStore((s) => s.playerSide);
  const enqueueCommand = useGameStore((s) => s.enqueueCommand);
  const selectUnits = useGameStore((s) => s.selectUnits);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const assignControlGroup = useGameStore((s) => s.assignControlGroup);
  const selectControlGroup = useGameStore((s) => s.selectControlGroup);
  const issueHoldOrder = useGameStore((s) => s.issueHoldOrder);
  const issueEntrenchOrder = useGameStore((s) => s.issueEntrenchOrder);
  const issueRetreatOrder = useGameStore((s) => s.issueRetreatOrder);
  const setMode = useGameStore((s) => s.setMode);

  // Keyboard input handler setup
  useEffect(() => {
    const handler = new KeyboardInputHandler({
      getSelectedUnitIds: () => useGameStore.getState().state.selectedUnitIds,
      getPlayerSide: () => useGameStore.getState().playerSide,
      onAssignGroup: (groupNum, unitIds) => assignControlGroup(groupNum, unitIds),
      onSelectGroup: (groupNum) => selectControlGroup(groupNum),
      onHoldOrder: () => issueHoldOrder(),
      onEntrenchOrder: () => issueEntrenchOrder(),
      onRetreatOrder: () => issueRetreatOrder(),
      onSetAttackMode: () => setMode("fire"),
      onClearSelection: () => clearSelection(),
      onCenterCameraOnSelection: () => {
        const selected = useGameStore
          .getState()
          .state.units.filter((u) => u.selected && u.alive);
        if (selected.length > 0) {
          const avgX =
            selected.reduce((sum, u) => sum + u.position.x, 0) / selected.length;
          const avgY =
            selected.reduce((sum, u) => sum + u.position.y, 0) / selected.length;
          cameraRef.current.x = avgX;
          cameraRef.current.y = avgY;
        }
      },
      onCycleSelection: () => {
        const currentIds = useGameStore.getState().state.selectedUnitIds;
        if (currentIds.length > 1) {
          const nextId = getNextSelectedUnitId(currentIds, currentIds[0]);
          if (nextId) {
            selectUnits([nextId]);
          }
        }
      },
    });

    handler.attach();
    return () => handler.detach();
  }, [
    assignControlGroup,
    clearSelection,
    issueEntrenchOrder,
    issueHoldOrder,
    issueRetreatOrder,
    selectControlGroup,
    selectUnits,
    setMode,
  ]);

  // Render loop using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayW = canvas.clientWidth;
      const displayH = canvas.clientHeight;

      if (canvas.width !== displayW * dpr || canvas.height !== displayH * dpr) {
        canvas.width = displayW * dpr;
        canvas.height = displayH * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayW, displayH);

      const camera = cameraRef.current;
      const currentGrid = terrain ?? mission.map.terrain;

      // Layer 1: Terrain
      if (currentGrid) {
        drawTerrain(ctx, currentGrid, camera, displayW, displayH);
      }

      // Layer 2: Features / Objectives
      drawFeatures(
        ctx,
        mission.map.features,
        state,
        camera,
        locale,
        displayW,
        displayH,
      );

      // Layer 3: Fog of War Shroud
      const playerFog = state.fogOfWar?.[playerSide];
      if (playerFog) {
        drawFog(ctx, playerFog, camera, displayW, displayH);
      }

      // Layer 4: Units (filtered by detection)
      const detectedEnemies = state.detectedEnemyUnitIds?.[playerSide];
      drawUnits(
        ctx,
        state.units,
        camera,
        displayW,
        displayH,
        playerSide,
        detectedEnemies,
      );

      // Layer 5: Tactical Overlays & Waypoints
      drawOverlay(ctx, state, camera, dragBox, displayW, displayH);

      // Layer 6: Atmospheric Weather
      drawWeather(ctx, state.weather, camera, displayW, displayH);

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, mission, locale, terrain, dragBox]);

  // Initial fit to map
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cameraRef.current.fitToMap(canvas.clientWidth, canvas.clientHeight);
  }, [mapWidth, mapHeight]);

  // Mouse wheel zoom
  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenAnchor = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    cameraRef.current.zoomAtScreenPoint(
      zoomFactor,
      screenAnchor,
      canvas.clientWidth,
      canvas.clientHeight,
    );
  };

  // Mouse Down
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStartPos.current = screenPos;

    // Middle click or Alt + Click => Pan
    if (e.button === 1 || e.altKey) {
      isPanningRef.current = true;
      return;
    }

    // Left click => Unit selection or Drag Box start
    if (e.button === 0) {
      isDraggingRef.current = true;
    }
  };

  // Mouse Move
  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isPanningRef.current) {
      const dx = e.movementX;
      const dy = e.movementY;
      cameraRef.current.panByScreenDelta(dx, dy);
      return;
    }

    if (isDraggingRef.current) {
      const dist = Math.hypot(
        screenPos.x - dragStartPos.current.x,
        screenPos.y - dragStartPos.current.y,
      );
      if (dist > 5) {
        setDragBox({ start: dragStartPos.current, current: screenPos });
      }
    }
  };

  // Double Click on unit => select all of same kind
  const handleDoubleClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const camera = cameraRef.current;
    const worldClick = camera.screenToWorld(
      screenPos,
      canvas.clientWidth,
      canvas.clientHeight,
    );

    const clickedUnit = state.units.find(
      (u) =>
        u.alive &&
        u.side === playerSide &&
        Math.hypot(u.position.x - worldClick.x, u.position.y - worldClick.y) <= 3.0,
    );

    if (clickedUnit) {
      const sameKindIds = getUnitsOfSameKind(state.units, playerSide, clickedUnit.kind);
      selectUnits(sameKindIds);
    }
  };

  // Mouse Up / Click completion
  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const camera = cameraRef.current;

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;

      // If a drag-box was drawn
      if (dragBox) {
        setDragBox(null);
        const p1World = camera.screenToWorld(
          dragBox.start,
          canvas.clientWidth,
          canvas.clientHeight,
        );
        const p2World = camera.screenToWorld(
          dragBox.current,
          canvas.clientWidth,
          canvas.clientHeight,
        );

        const box = createBoundingBox(p1World, p2World);
        const boxedUnitIds = getUnitsInBox(state.units, playerSide, box);

        if (boxedUnitIds.length > 0) {
          if (e.shiftKey) {
            // Shift + drag box: Add to current selection
            const combined = Array.from(
              new Set([...state.selectedUnitIds, ...boxedUnitIds]),
            );
            selectUnits(combined);
          } else {
            selectUnits(boxedUnitIds);
          }
        }
        return;
      }

      // Single click action
      const worldClick = camera.screenToWorld(
        screenPos,
        canvas.clientWidth,
        canvas.clientHeight,
      );

      // Find unit under click (within 3.0 world units)
      const detectedEnemyIds = state.detectedEnemyUnitIds?.[playerSide] ?? [];
      const clickedUnit = state.units.find(
        (u) =>
          u.alive &&
          (u.side === playerSide || detectedEnemyIds.includes(u.id)) &&
          Math.hypot(u.position.x - worldClick.x, u.position.y - worldClick.y) <= 3.0,
      );

      if (clickedUnit) {
        if (clickedUnit.side === playerSide) {
          if (e.shiftKey) {
            // Shift + click: Toggle friendly unit selection
            const nextSelected = toggleUnitSelection(
              state.selectedUnitIds,
              clickedUnit.id,
            );
            selectUnits(nextSelected);
          } else {
            // Direct click: Single select
            selectUnits([clickedUnit.id]);
          }
        } else if (state.selectedUnitIds.length > 0) {
          // Attack clicked enemy unit
          enqueueCommand({
            type: mode === "support" ? "USE_SUPPORT" : "ATTACK",
            unitIds: state.selectedUnitIds,
            targetUnitIds: [clickedUnit.id],
          });
          if (mode === "support") setMode("move");
        }
      } else if (mode === "move" && state.selectedUnitIds.length > 0) {
        // Move selected units to empty terrain coordinate
        enqueueCommand({
          type: "MOVE",
          unitIds: state.selectedUnitIds,
          targetPosition: {
            x: Math.max(0, Math.min(mapWidth, worldClick.x)),
            y: Math.max(0, Math.min(mapHeight, worldClick.y)),
          },
        });
      } else if (!e.shiftKey) {
        // Click on empty terrain without shift clears selection
        clearSelection();
      }
    }
  };

  // Context Menu / Right Click for immediate Move or Attack
  const handleContextMenu = (e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || state.selectedUnitIds.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const camera = cameraRef.current;
    const worldClick = camera.screenToWorld(
      screenPos,
      canvas.clientWidth,
      canvas.clientHeight,
    );

    // Check if right clicking a detected enemy unit
    const detectedEnemyIds = state.detectedEnemyUnitIds?.[playerSide] ?? [];
    const clickedEnemy = state.units.find(
      (u) =>
        u.alive &&
        u.side !== playerSide &&
        detectedEnemyIds.includes(u.id) &&
        Math.hypot(u.position.x - worldClick.x, u.position.y - worldClick.y) <= 3.0,
    );

    if (clickedEnemy) {
      enqueueCommand({
        type: "ATTACK",
        unitIds: state.selectedUnitIds,
        targetUnitIds: [clickedEnemy.id],
      });
    } else {
      enqueueCommand({
        type: "MOVE",
        unitIds: state.selectedUnitIds,
        targetPosition: {
          x: Math.max(0, Math.min(mapWidth, worldClick.x)),
          y: Math.max(0, Math.min(mapHeight, worldClick.y)),
        },
      });
    }
  };

  // ── Touch Support (Mobile) ──────────────────────────────────────────────
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchDistRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        time: Date.now(),
      };
      // Long press timer (500ms) for attack command
      longPressTimerRef.current = setTimeout(() => {
        if (!touchStartRef.current || !canvas) return;
        const camera = cameraRef.current;
        const worldClick = camera.screenToWorld(
          { x: touchStartRef.current.x, y: touchStartRef.current.y },
          canvas.clientWidth,
          canvas.clientHeight,
        );
        if (state.selectedUnitIds.length > 0) {
          const detectedEnemyIds = state.detectedEnemyUnitIds?.[playerSide] ?? [];
          const clickedEnemy = state.units.find(
            (u) =>
              u.alive &&
              u.side !== playerSide &&
              detectedEnemyIds.includes(u.id) &&
              Math.hypot(u.position.x - worldClick.x, u.position.y - worldClick.y) <= 3.0,
          );
          if (clickedEnemy) {
            enqueueCommand({ type: "ATTACK", unitIds: state.selectedUnitIds, targetUnitIds: [clickedEnemy.id] });
          }
        }
        touchStartRef.current = null;
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (pinchDistRef.current > 0) {
        const factor = dist / pinchDistRef.current;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        cameraRef.current.zoomAtScreenPoint(
          factor,
          { x: midX - rect.left, y: midY - rect.top },
          canvas.clientWidth,
          canvas.clientHeight,
        );
      }
      pinchDistRef.current = dist;
      return;
    }

    if (e.touches.length === 1 && touchStartRef.current) {
      // Pan
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      const dx = x - touchStartRef.current.x;
      const dy = y - touchStartRef.current.y;
      cameraRef.current.panByScreenDelta(dx, dy);
      touchStartRef.current = { x, y, time: touchStartRef.current.time };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const canvas = canvasRef.current;
    if (!canvas || !touchStartRef.current) { touchStartRef.current = null; return; }

    const elapsed = Date.now() - touchStartRef.current.time;
    // Quick tap = select or move
    if (elapsed < 300) {
      const camera = cameraRef.current;
      const worldClick = camera.screenToWorld(
        { x: touchStartRef.current.x, y: touchStartRef.current.y },
        canvas.clientWidth,
        canvas.clientHeight,
      );

      const detectedEnemyIds = state.detectedEnemyUnitIds?.[playerSide] ?? [];
      const clickedUnit = state.units.find(
        (u) =>
          u.alive &&
          (u.side === playerSide || detectedEnemyIds.includes(u.id)) &&
          Math.hypot(u.position.x - worldClick.x, u.position.y - worldClick.y) <= 3.0,
      );

      if (clickedUnit) {
        if (clickedUnit.side === playerSide) {
          selectUnits([clickedUnit.id]);
        } else if (state.selectedUnitIds.length > 0) {
          enqueueCommand({ type: "ATTACK", unitIds: state.selectedUnitIds, targetUnitIds: [clickedUnit.id] });
        }
      } else if (state.selectedUnitIds.length > 0) {
        enqueueCommand({
          type: "MOVE",
          unitIds: state.selectedUnitIds,
          targetPosition: { x: Math.max(0, Math.min(mapWidth, worldClick.x)), y: Math.max(0, Math.min(mapHeight, worldClick.y)) },
        });
      } else {
        clearSelection();
      }
    }
    touchStartRef.current = null;
    pinchDistRef.current = 0;
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", flex: 1, minHeight: 0 }}>
      <canvas
        ref={canvasRef}
        className="battle-map"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          cursor: isPanningRef.current ? "grab" : "crosshair",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="img"
        aria-label="Tactical map canvas"
      />
    </div>
  );
}
