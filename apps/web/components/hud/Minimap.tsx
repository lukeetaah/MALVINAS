"use client";

import { useEffect, useRef } from "react";
import type { MatchState, MissionDefinition, Side } from "@malvinas/simulation";
import { isUnitDetected, FOG_UNEXPLORED, FOG_EXPLORED } from "@malvinas/simulation";

interface MinimapProps {
  state: MatchState;
  mission: MissionDefinition;
  playerSide: Side;
  camera: { x: number; y: number; zoom: number };
  onPanToWorld: (worldX: number, worldY: number) => void;
  width?: number;
  height?: number;
}

export function worldToMinimap(
  worldX: number,
  worldY: number,
  mapWidth: number,
  mapHeight: number,
  minimapWidth: number,
  minimapHeight: number,
): { x: number; y: number } {
  const normX = Math.max(0, Math.min(1, worldX / Math.max(1, mapWidth)));
  const normY = Math.max(0, Math.min(1, worldY / Math.max(1, mapHeight)));
  return {
    x: normX * minimapWidth,
    y: normY * minimapHeight,
  };
}

export function minimapToWorld(
  minimapX: number,
  minimapY: number,
  mapWidth: number,
  mapHeight: number,
  minimapWidth: number,
  minimapHeight: number,
): { worldX: number; worldY: number } {
  const normX = Math.max(0, Math.min(1, minimapX / Math.max(1, minimapWidth)));
  const normY = Math.max(0, Math.min(1, minimapY / Math.max(1, minimapHeight)));
  return {
    worldX: normX * mapWidth,
    worldY: normY * mapHeight,
  };
}

export function Minimap({
  state,
  mission,
  playerSide,
  camera,
  onPanToWorld,
  width = 180,
  height = 180,
}: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mapWidth = mission.map.width;
  const mapHeight = mission.map.height;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background terrain representation
    ctx.fillStyle = "#0c1511";
    ctx.fillRect(0, 0, width, height);

    // Draw terrain features / objectives
    for (const feature of mission.map.features) {
      const pos = worldToMinimap(
        feature.position.x,
        feature.position.y,
        mapWidth,
        mapHeight,
        width,
        height,
      );

      const isControlled = state.control[feature.id] === playerSide;
      const isEnemyControlled =
        state.control[feature.id] && state.control[feature.id] !== playerSide;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isControlled
        ? "#48bb78"
        : isEnemyControlled
          ? "#e53e3e"
          : "#ecc94b";
      ctx.fill();
      ctx.strokeStyle = "#102018";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw units
    const friendlyUnits = state.units.filter((u) => u.side === playerSide && u.alive);
    const fog = state.fogOfWar?.[playerSide];

    for (const unit of state.units) {
      if (!unit.alive) continue;

      const isPlayer = unit.side === playerSide;
      const isDetected =
        isPlayer ||
        (fog && mission.map.terrain
          ? isUnitDetected(unit, friendlyUnits, mission.map.terrain, fog, state.weather)
          : true);
      if (!isDetected) continue;

      const pos = worldToMinimap(
        unit.position.x,
        unit.position.y,
        mapWidth,
        mapHeight,
        width,
        height,
      );

      const isSelected = state.selectedUnitIds.includes(unit.id);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isPlayer ? "#38a169" : "#e53e3e";
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#fefcbf";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw camera viewport indicator rectangle
    const camCenter = worldToMinimap(
      camera.x,
      camera.y,
      mapWidth,
      mapHeight,
      width,
      height,
    );

    // Approximate visible world dimension given zoom
    const viewW = (width * 0.4) / Math.max(0.2, camera.zoom);
    const viewH = (height * 0.4) / Math.max(0.2, camera.zoom);

    ctx.strokeStyle = "rgba(244, 215, 135, 0.75)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      camCenter.x - viewW / 2,
      camCenter.y - viewH / 2,
      viewW,
      viewH,
    );
  }, [state, mission, playerSide, camera, width, height, mapWidth, mapHeight]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { worldX, worldY } = minimapToWorld(
      clickX,
      clickY,
      mapWidth,
      mapHeight,
      width,
      height,
    );

    onPanToWorld(worldX, worldY);
  };

  return (
    <div className="minimap-card">
      <p className="eyebrow" style={{ width: "100%", marginBottom: "6px" }}>
        RADAR TÁCTICO
      </p>
      <div className="minimap-canvas-frame">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
        />
      </div>
    </div>
  );
}
