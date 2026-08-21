"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  GOOSE_GREEN_MISSION,
  createMissionState,
  resolveMissionResult,
  stepMission,
  TICK_RATE,
  type MatchState,
  type SimCommand,
  type UnitState,
  type Vec2,
} from "@malvinas/simulation";

const PLAYER_SIDE = "argentina" as const;

function formatTime(tick: number): string {
  const seconds = Math.floor(tick / TICK_RATE);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function MissionPrototype() {
  const [state, setState] = useState<MatchState>(() => createMissionState());
  const [running, setRunning] = useState(true);
  const commandSequence = useRef(0);
  const pendingCommands = useRef<SimCommand[]>([]);

  useEffect(() => {
    const loop = window.setInterval(() => {
      if (!running) return;
      setState((current) => {
        const commands = pendingCommands.current.splice(0);
        return stepMission(current, GOOSE_GREEN_MISSION, commands);
      });
    }, 1000 / TICK_RATE);
    return () => window.clearInterval(loop);
  }, [running]);

  const enqueue = (partial: Omit<SimCommand, "protocolVersion" | "matchId" | "playerId" | "side" | "tick" | "sequence">) => {
    pendingCommands.current.push({
      protocolVersion: 1,
      matchId: state.matchId,
      playerId: "local-player",
      side: PLAYER_SIDE,
      tick: state.tick + 1,
      sequence: commandSequence.current++,
      ...partial,
    });
  };

  const selectUnit = (unit: UnitState) => {
    if (unit.side !== PLAYER_SIDE || !unit.alive) return;
    enqueue({ type: "SELECT", unitIds: [unit.id] });
  };

  const issueMove = (position: Vec2) => {
    if (state.selectedUnitIds.length === 0) return;
    enqueue({ type: "MOVE", unitIds: state.selectedUnitIds, targetPosition: position });
  };

  const issueAttack = (target: UnitState) => {
    if (target.side === PLAYER_SIDE || state.selectedUnitIds.length === 0) return;
    enqueue({ type: "ATTACK", unitIds: state.selectedUnitIds, targetUnitIds: [target.id] });
  };

  const reset = () => {
    pendingCommands.current = [];
    commandSequence.current = 0;
    setState(createMissionState());
    setRunning(true);
  };

  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    issueMove({
      x: ((event.clientX - rect.left) / rect.width) * GOOSE_GREEN_MISSION.map.width,
      y: ((event.clientY - rect.top) / rect.height) * GOOSE_GREEN_MISSION.map.height,
    });
  };

  const result = resolveMissionResult(state, GOOSE_GREEN_MISSION, PLAYER_SIDE);
  const selectedCount = state.selectedUnitIds.length;
  const playerUnits = state.units.filter((unit) => unit.side === PLAYER_SIDE && unit.alive);
  const enemyUnits = state.units.filter((unit) => unit.side !== PLAYER_SIDE && unit.alive);

  return (
    <main className="mission-shell">
      <header className="mission-header">
        <div>
          <p className="eyebrow">MISIÓN PROTOTIPO · 27–29 MAYO 1982</p>
          <h1>Darwin — Pradera del Ganso</h1>
          <p className="mission-subtitle">Defendé los puntos de la Fuerza de Tareas Mercedes. La historia fija el escenario; tus órdenes fijan el desenlace.</p>
        </div>
        <div className="mission-actions">
          <button onClick={() => setRunning((value) => !value)}>{running ? "Pausa" : "Continuar"}</button>
          <button onClick={reset}>Reiniciar</button>
        </div>
      </header>

      <section className="mission-grid">
        <div className="battle-panel">
          <div className="battle-topbar">
            <span>ARGENTINA · DEFENSA LOCAL</span>
            <strong>{formatTime(state.tick)} / 03:00</strong>
            <span>{state.status === "playing" ? "EN CURSO" : state.status.toUpperCase()}</span>
          </div>
          <svg className="battle-map" viewBox={`0 0 ${GOOSE_GREEN_MISSION.map.width} ${GOOSE_GREEN_MISSION.map.height}`} onClick={handleMapClick} role="img" aria-label="Mapa táctico abstracto de Darwin y Pradera del Ganso">
            <rect width="100" height="60" fill="#35463f" />
            <path d="M0 12 C20 20, 35 5, 51 15 S80 25, 100 12" fill="none" stroke="#73816b" strokeWidth="1.2" opacity=".45" />
            <path d="M0 51 C23 42, 41 55, 60 44 S83 38, 100 50" fill="none" stroke="#73816b" strokeWidth="1" opacity=".35" />
            {GOOSE_GREEN_MISSION.map.features.map((feature) => {
              const controlledBy = state.control[feature.id];
              return (
                <g key={feature.id}>
                  <circle cx={feature.position.x} cy={feature.position.y} r={feature.radius} fill={controlledBy === "argentina" ? "#a3b46d55" : controlledBy === "britain" ? "#a8705d55" : "#c7c7a622"} stroke="#d1d4b0" strokeWidth=".35" strokeDasharray="1 1" />
                  <text x={feature.position.x} y={feature.position.y - feature.radius - 1} textAnchor="middle" className="map-label">{feature.id.replaceAll("-", " ")}</text>
                </g>
              );
            })}
            {state.units.map((unit) => unit.alive && (
              <g key={unit.id} onClick={(event) => { event.stopPropagation(); unit.side === PLAYER_SIDE ? selectUnit(unit) : issueAttack(unit); }}>
                {unit.selected && <circle cx={unit.position.x} cy={unit.position.y} r="2.1" fill="none" stroke="#f2e6a0" strokeWidth=".35" />}
                <circle cx={unit.position.x} cy={unit.position.y} r="1.15" fill={unit.side === "argentina" ? "#bad486" : "#d48670"} stroke="#101917" strokeWidth=".35" />
                <text x={unit.position.x} y={unit.position.y + 3} textAnchor="middle" className="unit-label">{unit.label.split("·")[0].trim()}</text>
              </g>
            ))}
          </svg>
          <p className="map-hint">Click en una unidad argentina para seleccionarla. Click en el terreno para moverla. Click en una unidad británica para atacarla.</p>
        </div>

        <aside className="mission-sidebar">
          <div className="stat-card">
            <span>UNIDADES OPERATIVAS</span>
            <strong>{playerUnits.length} <small>vs</small> {enemyUnits.length}</strong>
            <div className="bar"><i style={{ width: `${(playerUnits.length / 5) * 100}%` }} /></div>
          </div>
          <div className="stat-card">
            <span>SELECCIONADAS</span>
            <strong>{selectedCount}</strong>
            <button className="support-button" disabled={selectedCount === 0 || state.logistics.argentina.reinforcements === 0} onClick={() => enqueue({ type: "REQUEST_REINFORCEMENT", unitIds: state.selectedUnitIds })}>Solicitar apoyo logístico</button>
          </div>
          <div className="objective-card">
            <span>OBJETIVOS</span>
            {GOOSE_GREEN_MISSION.objectives.filter((objective) => objective.side === PLAYER_SIDE).map((objective) => (
              <div className="objective" key={objective.id}>
                <i className={state.control[objective.featureId] === PLAYER_SIDE ? "objective-dot complete" : "objective-dot"} />
                <span>{objective.featureId.replaceAll("-", " ")}</span>
              </div>
            ))}
          </div>
          <div className="event-card">
            <span>BITÁCORA TÁCTICA</span>
            {state.eventLog.slice(-5).reverse().map((event, index) => <p key={`${event.tick}-${index}`}>[{formatTime(event.tick)}] {event.message}</p>)}
          </div>
        </aside>
      </section>

      {result && (
        <section className="result-panel">
          <p className="eyebrow">RESUMEN CONTRAFACTUAL</p>
          <h2>{result.playerWon ? "La defensa sostuvo la posición" : "La posición fue superada"}</h2>
          <p>{result.endReason}</p>
          <div className="result-grid">
            <div><span>Resultado de tu partida</span><strong>{result.playerWon ? "Victoria argentina" : "Victoria británica"}</strong></div>
            <div><span>Resultado histórico registrado</span><strong>Victoria británica · Goose Green</strong></div>
          </div>
          <p className="result-note">{result.comparison["es-AR"]}</p>
        </section>
      )}
    </main>
  );
}
