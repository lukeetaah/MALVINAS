"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  GOOSE_GREEN_MISSION,
  createMissionState,
  resolveMissionResult,
  stepMission,
  TICK_RATE,
  type LocalizedMissionText,
  type MatchState,
  type Side,
  type SimCommand,
  type TerrainFeature,
  type UnitState,
} from "@malvinas/simulation";

type Locale = "es-AR" | "en-GB";
type Screen = "briefing" | "battle";
type CommandMode = "move" | "fire" | "support";

const OPPONENT: Record<Side, Side> = { argentina: "britain", britain: "argentina" };
const SIDE_NAME: Record<Locale, Record<Side, string>> = {
  "es-AR": { argentina: "Argentina", britain: "Reino Unido" },
  "en-GB": { argentina: "Argentina", britain: "United Kingdom" },
};
const FEATURE_NAMES: Record<string, LocalizedMissionText> = {
  "darwin-airfield": { "es-AR": "Aeródromo de Darwin", "en-GB": "Darwin airfield" },
  "goose-green-settlement": { "es-AR": "Pradera del Ganso", "en-GB": "Goose Green settlement" },
  "boca-house": { "es-AR": "Boca House", "en-GB": "Boca House" },
  "school-position": { "es-AR": "Posición Escuela", "en-GB": "School position" },
};

function localize(text: LocalizedMissionText, locale: Locale): string {
  return text[locale];
}

function formatTime(tick: number): string {
  const seconds = Math.floor(tick / TICK_RATE);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function unitGlyph(unit: UnitState): string {
  if (unit.kind === "artillery") return "ART";
  if (unit.kind === "support-weapon") return "GUN";
  return "INF";
}

function featureName(feature: TerrainFeature, locale: Locale): string {
  return localize(FEATURE_NAMES[feature.id] ?? { "es-AR": feature.id, "en-GB": feature.id }, locale);
}

function featureIcon(feature: TerrainFeature) {
  if (feature.kind === "airfield") return <><rect x={feature.position.x - 6.3} y={feature.position.y - 1.4} width="12.6" height="2.8" rx=".4" className="map-runway" /><path d={`M${feature.position.x - 4} ${feature.position.y}h8`} className="map-runway-line" /></>;
  if (feature.kind === "settlement") return <><rect x={feature.position.x - 2.5} y={feature.position.y - 1} width="2.4" height="2.4" className="map-building" /><rect x={feature.position.x + .6} y={feature.position.y - 2.5} width="2.8" height="3.8" className="map-building" /><rect x={feature.position.x - .2} y={feature.position.y + 2} width="3.1" height="2.1" className="map-building" /></>;
  return <path d={`M${feature.position.x - 3} ${feature.position.y + 2.5} L${feature.position.x} ${feature.position.y - 2.5} L${feature.position.x + 3} ${feature.position.y + 2.5}Z`} className="map-position" />;
}

function MissionMap({ state, locale, mode, onMapClick, onUnitClick }: { state: MatchState; locale: Locale; mode: CommandMode; onMapClick: (event: MouseEvent<SVGSVGElement>) => void; onUnitClick: (unit: UnitState) => void; }) {
  return <svg className="battle-map" viewBox={`0 0 ${GOOSE_GREEN_MISSION.map.width} ${GOOSE_GREEN_MISSION.map.height}`} onClick={onMapClick} role="img" aria-label="Tactical map of Darwin and Goose Green">
    <defs>
      <linearGradient id="terrain" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#4d6351" /><stop offset="1" stopColor="#243d35" /></linearGradient>
      <linearGradient id="water" x1="0" x2="1"><stop stopColor="#153849" /><stop offset="1" stopColor="#255265" /></linearGradient>
      <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="#d5dbc21a" strokeWidth=".16" /></pattern>
      <marker id="arrow" markerWidth="3" markerHeight="3" refX="2.4" refY="1.5" orient="auto"><path d="M0 0 L3 1.5 L0 3z" fill="#dc997d" /></marker>
    </defs>
    <rect width="100" height="60" fill="url(#terrain)" />
    <path d="M0 0 H8 C14 9 8 17 12 26 C16 36 9 45 13 60 H0Z" fill="url(#water)" opacity=".92" /><path d="M8 0 C14 8 8 17 12 26 C16 36 9 45 13 60" className="coast-line" />
    <path d="M12 7 C28 13 33 8 44 13 S65 18 82 10" className="contour" /><path d="M14 18 C27 23 35 18 52 25 S75 29 96 22" className="contour" /><path d="M11 35 C25 29 37 37 54 32 S78 35 97 28" className="contour" /><path d="M13 51 C29 45 44 54 62 47 S80 49 98 43" className="contour" />
    <path d="M12 31 C29 31 43 30 56 31 S75 31 94 30" className="road" /><path d="M20 9 C21 20 22 31 23 46" className="road minor" /><path d="M23 42 C33 39 37 34 43 30" className="road minor" />
    <path d="M93 18 C73 20 58 25 44 30" className="axis-arrow" markerEnd="url(#arrow)" /><path d="M91 43 C69 43 50 42 29 42" className="axis-arrow" markerEnd="url(#arrow)" />
    <rect width="100" height="60" fill="url(#grid)" /><text x="87" y="7" className="compass">N ↑</text><text x="4" y="57" className="map-scale">0 · 500 m · 1 km</text>
    {GOOSE_GREEN_MISSION.map.features.map((feature) => {
      const owner = state.control[feature.id];
      return <g key={feature.id} className="map-feature"><circle cx={feature.position.x} cy={feature.position.y} r={feature.radius} className={`objective-zone ${owner ?? "neutral"}`} />{featureIcon(feature)}<text x={feature.position.x} y={feature.position.y - feature.radius - 1.3} textAnchor="middle" className="map-label">{featureName(feature, locale)}</text><text x={feature.position.x} y={feature.position.y + feature.radius + 2.2} textAnchor="middle" className={`control-label ${owner ?? "neutral"}`}>{owner ? SIDE_NAME[locale][owner] : locale === "es-AR" ? "DISPUTADO" : "CONTESTED"}</text></g>;
    })}
    {state.units.map((unit) => unit.alive && <g key={unit.id} className={`unit-token ${unit.side} ${unit.selected ? "selected" : ""}`} onClick={(event) => { event.stopPropagation(); onUnitClick(unit); }}>
      {unit.selected && <rect x={unit.position.x - 2.8} y={unit.position.y - 2.25} width="5.6" height="4.5" rx=".3" className="selection-ring" />}<rect x={unit.position.x - 2.05} y={unit.position.y - 1.55} width="4.1" height="3.1" rx=".2" className="unit-body" /><path d={`M${unit.position.x - 1.65} ${unit.position.y}h3.3`} className="unit-mark" /><text x={unit.position.x} y={unit.position.y + .6} textAnchor="middle" className="unit-glyph">{unitGlyph(unit)}</text><text x={unit.position.x} y={unit.position.y + 3.6} textAnchor="middle" className="unit-label">{unit.label.split("·")[0].trim()}</text><rect x={unit.position.x - 2.05} y={unit.position.y - 2.35} width="4.1" height=".45" className="health-track" /><rect x={unit.position.x - 2.05} y={unit.position.y - 2.35} width={4.1 * (unit.health / 100)} height=".45" className="health-fill" />
    </g>)}
    <text x="95" y="57" textAnchor="end" className="mode-stamp">{mode === "move" ? (locale === "es-AR" ? "MOVER" : "MOVE") : mode === "fire" ? (locale === "es-AR" ? "FUEGO" : "FIRE") : (locale === "es-AR" ? "APOYO" : "SUPPORT")}</text>
  </svg>;
}

export default function MissionPrototype() {
  const [screen, setScreen] = useState<Screen>("briefing");
  const [locale, setLocale] = useState<Locale>("es-AR");
  const [playerSide, setPlayerSide] = useState<Side>("argentina");
  const [planId, setPlanId] = useState("argentina-layered-defense");
  const [state, setState] = useState<MatchState>(() => createMissionState());
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<CommandMode>("move");
  const commandSequence = useRef(0);
  const pendingCommands = useRef<SimCommand[]>([]);
  const t = (text: LocalizedMissionText) => localize(text, locale);
  const playerPlans = GOOSE_GREEN_MISSION.briefing.plans.filter((plan) => plan.side === playerSide);
  const selectedPlan = playerPlans.find((plan) => plan.id === planId) ?? playerPlans[0];
  const playerUnits = state.units.filter((unit) => unit.side === playerSide && unit.alive);
  const enemyUnits = state.units.filter((unit) => unit.side === OPPONENT[playerSide] && unit.alive);
  const selectedUnits = state.units.filter((unit) => state.selectedUnitIds.includes(unit.id));
  const selectedUnit = selectedUnits[0];
  const selectedSupport = selectedUnits.some((unit) => unit.kind === "artillery" || unit.kind === "support-weapon");
  const currentMoment = useMemo(() => [...GOOSE_GREEN_MISSION.narrativeMoments].reverse().find((moment) => moment.atSecond <= state.tick / TICK_RATE) ?? GOOSE_GREEN_MISSION.narrativeMoments[0], [state.tick]);
  const result = resolveMissionResult(state, GOOSE_GREEN_MISSION, playerSide);

  useEffect(() => {
    if (screen !== "battle" || !running) return;
    const loop = window.setInterval(() => setState((current) => stepMission(current, GOOSE_GREEN_MISSION, pendingCommands.current.splice(0), OPPONENT[playerSide])), 1000 / TICK_RATE);
    return () => window.clearInterval(loop);
  }, [playerSide, running, screen]);

  useEffect(() => { if (state.status !== "playing") setRunning(false); }, [state.status]);

  const enqueue = (partial: Omit<SimCommand, "protocolVersion" | "matchId" | "playerId" | "side" | "tick" | "sequence">) => pendingCommands.current.push({ protocolVersion: 1, matchId: state.matchId, playerId: "local-player", side: playerSide, tick: state.tick + 1, sequence: commandSequence.current++, ...partial });
  const chooseSide = (side: Side) => { setPlayerSide(side); setPlanId(GOOSE_GREEN_MISSION.briefing.plans.find((plan) => plan.side === side)?.id ?? ""); };
  const launchMission = () => { pendingCommands.current = []; commandSequence.current = 0; setState(createMissionState(GOOSE_GREEN_MISSION, `local-goose-green-${playerSide}`, selectedPlan?.id)); setMode("move"); setRunning(true); setScreen("battle"); };
  const returnToBriefing = () => { setRunning(false); pendingCommands.current = []; commandSequence.current = 0; setScreen("briefing"); };
  const handleMapClick = (event: MouseEvent<SVGSVGElement>) => { if (mode !== "move" || state.selectedUnitIds.length === 0) return; const rect = event.currentTarget.getBoundingClientRect(); enqueue({ type: "MOVE", unitIds: state.selectedUnitIds, targetPosition: { x: ((event.clientX - rect.left) / rect.width) * GOOSE_GREEN_MISSION.map.width, y: ((event.clientY - rect.top) / rect.height) * GOOSE_GREEN_MISSION.map.height } }); };
  const handleUnitClick = (unit: UnitState) => { if (unit.side === playerSide) { enqueue({ type: "SELECT", unitIds: [unit.id] }); return; } if (state.selectedUnitIds.length === 0) return; enqueue({ type: mode === "support" ? "USE_SUPPORT" : "ATTACK", unitIds: state.selectedUnitIds, targetUnitIds: [unit.id] }); if (mode === "support") setMode("move"); };
  const controls = locale === "es-AR" ? { briefing: "BRIEFING OPERACIONAL", chooseSide: "ELEGÍ TU PERSPECTIVA", choosePlan: "ELEGÍ EL ENFOQUE INICIAL", launch: "INICIAR OPERACIÓN", historical: "MARCO HISTÓRICO", situation: "SITUACIÓN", objective: "TU OBJETIVO", source: "Fuentes", battle: "SALA DE MANDO", pause: "Pausar", resume: "Continuar", back: "Volver al briefing", move: "Mover", fire: "Fuego directo", support: "Fuego de apoyo", resupply: "Solicitar reabastecimiento", roster: "FUERZA DISPONIBLE", selected: "UNIDAD SELECCIONADA", none: "Seleccioná una unidad propia en el mapa o en la lista.", objectives: "OBJETIVOS", report: "PARTE DE SITUACIÓN", log: "TRAZA DE COMBATE", time: "TIEMPO OPERATIVO", control: "CONTROL", result: "RESULTADO DE LA SIMULACIÓN", archive: "REGISTRO HISTÓRICO", replay: "NUEVA DECISIÓN", planned: "PLAN INICIAL", current: "EN CURSO", final: "FINALIZADA", tooltip: "Elegí una unidad · clic en terreno para mover · clic en enemigo para atacar" } : { briefing: "OPERATIONAL BRIEFING", chooseSide: "CHOOSE YOUR PERSPECTIVE", choosePlan: "CHOOSE YOUR OPENING PLAN", launch: "BEGIN OPERATION", historical: "HISTORICAL FRAME", situation: "SITUATION", objective: "YOUR OBJECTIVE", source: "Sources", battle: "COMMAND ROOM", pause: "Pause", resume: "Resume", back: "Return to briefing", move: "Move", fire: "Direct fire", support: "Fire support", resupply: "Request resupply", roster: "AVAILABLE FORCE", selected: "SELECTED UNIT", none: "Select one of your units on the map or in the roster.", objectives: "OBJECTIVES", report: "SITUATION REPORT", log: "COMBAT TRACE", time: "OPERATIONAL TIME", control: "CONTROL", result: "SIMULATION RESULT", archive: "HISTORICAL RECORD", replay: "MAKE A NEW DECISION", planned: "OPENING PLAN", current: "IN PROGRESS", final: "COMPLETE", tooltip: "Select a unit · click terrain to move · click an enemy to attack" };

  if (screen === "briefing") return <main className="briefing-shell"><header className="briefing-topline"><span>ARCHIVO 1982 / MALVINAS–FALKLANDS</span><button className="language-switch" onClick={() => setLocale((current) => current === "es-AR" ? "en-GB" : "es-AR")}>{locale === "es-AR" ? "EN" : "ES"}</button></header><section className="briefing-hero"><div className="briefing-index"><span>OPERACIÓN 04</span><i /><span>27—29 MAY 1982</span></div><p className="eyebrow">{controls.briefing}</p><h1>{t(GOOSE_GREEN_MISSION.title)}</h1><p className="theatre">{t(GOOSE_GREEN_MISSION.briefing.theatre)}</p><div className="briefing-copy"><div><span>{controls.situation}</span><p>{t(GOOSE_GREEN_MISSION.briefing.situation)}</p></div><div><span>{controls.historical}</span><p>{t(GOOSE_GREEN_MISSION.briefing.historicalFrame)}</p></div></div></section><section className="decision-deck"><div className="decision-head"><div><p className="eyebrow">01 / {controls.chooseSide}</p><h2>{locale === "es-AR" ? "No hay bando “neutral” dentro del combate." : "There is no neutral side inside the battle."}</h2></div><p>{locale === "es-AR" ? "La cronología permanece separada de tu resultado. Elegí desde qué cadena de mando querés experimentar la operación." : "The chronology remains separate from your result. Choose which command chain you want to experience."}</p></div><div className="side-options">{(["argentina", "britain"] as Side[]).map((side) => <button key={side} className={`side-choice ${side} ${playerSide === side ? "active" : ""}`} onClick={() => chooseSide(side)}><span>{side === "argentina" ? "ARG" : "UK"}</span><strong>{SIDE_NAME[locale][side]}</strong><small>{t(GOOSE_GREEN_MISSION.briefing.playerObjective[side])}</small></button>)}</div><div className="plan-section"><p className="eyebrow">02 / {controls.choosePlan}</p><div className="plan-options">{playerPlans.map((plan) => <button key={plan.id} className={`plan-choice ${plan.id === planId ? "active" : ""}`} onClick={() => setPlanId(plan.id)}><span>{t(plan.name)}</span><strong>{t(plan.effect)}</strong><small>{t(plan.description)}</small></button>)}</div></div><div className="launch-row"><div><span>{controls.planned}</span><strong>{selectedPlan ? t(selectedPlan.name) : "—"}</strong></div><button className="launch-button" onClick={launchMission}>{controls.launch} <b>→</b></button></div></section><footer className="briefing-footer">{GOOSE_GREEN_MISSION.sourceIds.map((source) => <span key={source}>{source}</span>)}<p>{GOOSE_GREEN_MISSION.abstractionNote[locale]}</p></footer></main>;

  return <main className="command-shell"><header className="command-header"><div className="command-title"><button className="back-button" onClick={returnToBriefing}>←</button><div><p>{controls.battle} · {formatTime(state.tick)} / 03:00</p><h1>{t(GOOSE_GREEN_MISSION.title)}</h1></div></div><div className="command-status"><span className={`live-dot ${state.status === "playing" ? "" : "ended"}`} />{state.status === "playing" ? controls.current : controls.final}<button className="language-switch" onClick={() => setLocale((current) => current === "es-AR" ? "en-GB" : "es-AR")}>{locale === "es-AR" ? "EN" : "ES"}</button><button onClick={() => setRunning((value) => !value)} disabled={state.status !== "playing"}>{running ? controls.pause : controls.resume}</button></div></header><section className="command-strip"><div><span>{controls.time}</span><strong>{formatTime(state.tick)} <em>/ 03:00</em></strong></div><div><span>{controls.control}</span><strong>{GOOSE_GREEN_MISSION.map.features.filter((feature) => state.control[feature.id] === playerSide).length} <em>/ {GOOSE_GREEN_MISSION.map.features.length}</em></strong></div><div><span>{SIDE_NAME[locale][playerSide]}</span><strong>{playerUnits.length} <em>{locale === "es-AR" ? "unidades" : "units"}</em></strong></div><div><span>{SIDE_NAME[locale][OPPONENT[playerSide]]}</span><strong>{enemyUnits.length} <em>{locale === "es-AR" ? "detectadas" : "detected"}</em></strong></div><p>{controls.tooltip}</p></section><section className="command-grid"><aside className="left-rail"><div className="rail-card objectives-card"><p className="rail-label">{controls.objectives}</p><h2>{t(GOOSE_GREEN_MISSION.briefing.playerObjective[playerSide])}</h2>{GOOSE_GREEN_MISSION.objectives.filter((objective) => objective.side === playerSide).map((objective) => <div className="objective-row" key={objective.id}><i className={state.control[objective.featureId] === playerSide ? "done" : ""} /><span>{featureName(GOOSE_GREEN_MISSION.map.features.find((feature) => feature.id === objective.featureId)!, locale)}</span><b>{state.control[objective.featureId] === playerSide ? (locale === "es-AR" ? "ASEGURADO" : "HELD") : (locale === "es-AR" ? "EN RIESGO" : "AT RISK")}</b></div>)}</div><div className="rail-card narrative-card"><p className="rail-label">{controls.report} · {formatTime(Math.floor(currentMoment.atSecond * TICK_RATE))}</p><h2>{t(currentMoment.title)}</h2><p>{t(currentMoment.body)}</p><small>{controls.source}: {currentMoment.sourceIds.join(" · ")}</small></div><div className="rail-card log-card"><p className="rail-label">{controls.log}</p>{state.eventLog.length === 0 ? <p>{locale === "es-AR" ? "Sin novedades. La operación aguarda tu primera orden." : "No reports. The operation awaits your first order."}</p> : state.eventLog.slice(-5).reverse().map((event, index) => <p key={`${event.tick}-${index}`}><b>{formatTime(event.tick)}</b> {event.message}</p>)}</div></aside><section className="map-console"><div className="map-frame"><div className="map-toolbar"><span>{locale === "es-AR" ? "TABLERO TÁCTICO" : "TACTICAL BOARD"}</span><span className="map-key"><i className="argentina" /> ARG <i className="britain" /> UK <i className="objective" /> {locale === "es-AR" ? "objetivo" : "objective"}</span></div><MissionMap state={state} locale={locale} mode={mode} onMapClick={handleMapClick} onUnitClick={handleUnitClick} /></div><div className="command-deck"><div className="active-unit"><p>{controls.selected}</p>{selectedUnit ? <><strong>{selectedUnit.label}</strong><span>{unitGlyph(selectedUnit)} · {Math.round(selectedUnit.health)}% {locale === "es-AR" ? "integridad" : "strength"} · {selectedUnit.ammunition} {locale === "es-AR" ? "mun." : "ammo"}</span></> : <span>{controls.none}</span>}</div><div className="order-buttons"><button className={mode === "move" ? "active" : ""} onClick={() => setMode("move")} disabled={!selectedUnit}>{controls.move}</button><button className={mode === "fire" ? "active" : ""} onClick={() => setMode("fire")} disabled={!selectedUnit}>{controls.fire}</button><button className={mode === "support" ? "active" : ""} onClick={() => setMode("support")} disabled={!selectedSupport}>{controls.support}</button><button className="resupply" disabled={!selectedUnit || state.logistics[playerSide].reinforcements === 0} onClick={() => enqueue({ type: "REQUEST_REINFORCEMENT", unitIds: state.selectedUnitIds })}>{controls.resupply}</button></div></div></section><aside className="right-rail"><div className="rail-card force-card"><p className="rail-label">{controls.roster}</p>{state.units.filter((unit) => unit.side === playerSide).map((unit) => <button key={unit.id} disabled={!unit.alive} onClick={() => enqueue({ type: "SELECT", unitIds: [unit.id] })} className={`roster-unit ${unit.selected ? "selected" : ""}`}><i>{unitGlyph(unit)}</i><span><strong>{unit.label}</strong><small>{unit.alive ? `${Math.round(unit.health)}% · ${unit.ammunition} ${locale === "es-AR" ? "mun." : "ammo"}` : (locale === "es-AR" ? "Fuera de combate" : "Out of action")}</small></span><b>{unit.order === "attack" ? "×" : unit.order === "move" ? "→" : "·"}</b></button>)}</div><div className="rail-card archive-card"><p className="rail-label">{controls.archive}</p><p>{t(GOOSE_GREEN_MISSION.historicalOutcome.summary)}</p><span>{GOOSE_GREEN_MISSION.historicalOutcome.winner === "britain" ? "UK" : "ARG"} · {locale === "es-AR" ? "resultado documentado" : "recorded outcome"}</span></div></aside></section>{result && <section className="after-action"><p className="eyebrow">{controls.result}</p><h2>{result.playerWon ? (locale === "es-AR" ? "Tu cadena de mando alcanzó el objetivo." : "Your command chain achieved its objective.") : (locale === "es-AR" ? "La posición no pudo sostenerse." : "The position could not be held.")}</h2><p>{result.endReason}</p><div><span>{locale === "es-AR" ? "Tu resultado" : "Your result"}<strong>{result.playerWon ? SIDE_NAME[locale][playerSide] : SIDE_NAME[locale][OPPONENT[playerSide]]}</strong></span><span>{controls.archive}<strong>{SIDE_NAME[locale][GOOSE_GREEN_MISSION.historicalOutcome.winner]}</strong></span></div><button onClick={returnToBriefing}>{controls.replay} →</button></section>}</main>;
}
