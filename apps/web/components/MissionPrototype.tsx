"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TICK_RATE,
  t as translateKey,
  type LocalizedMissionText,
  type Side,
  type TerrainFeature,
  type UnitState,
  type Locale,
} from "@malvinas/simulation";
import { useGameStore } from "@/store/gameStore";
import { TacticalCanvas } from "@/renderer/TacticalCanvas";
import { HistoricalArchiveModal } from "./HistoricalArchiveModal";
import { MainMenu } from "./MainMenu";
import { TelemetryBar } from "./hud/TelemetryBar";
import { Minimap } from "./hud/Minimap";
import { CommandCard } from "./hud/CommandCard";
import { CombatLog } from "./hud/CombatLog";
import { TacticalAudioManager } from "@/audio/audioManager";

const OPPONENT: Record<Side, Side> = {
  argentina: "britain",
  britain: "argentina",
};

const SIDE_NAME: Record<Locale, Record<Side, string>> = {
  "es-AR": { argentina: "Argentina", britain: "Reino Unido" },
  "en-GB": { argentina: "Argentina", britain: "United Kingdom" },
};

const FEATURE_NAMES: Record<string, LocalizedMissionText> = {
  "darwin-airfield": {
    "es-AR": "Aeródromo de Darwin",
    "en-GB": "Darwin airfield",
  },
  "goose-green-settlement": {
    "es-AR": "Pradera del Ganso",
    "en-GB": "Goose Green settlement",
  },
  "boca-house": { "es-AR": "Boca House", "en-GB": "Boca House" },
  "school-position": {
    "es-AR": "Posición Escuela",
    "en-GB": "School position",
  },
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
  return localize(
    FEATURE_NAMES[feature.id] ?? {
      "es-AR": feature.id,
      "en-GB": feature.id,
    },
    locale,
  );
}

export default function MissionPrototype() {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const state = useGameStore((s) => s.state);
  const mission = useGameStore((s) => s.mission);
  const result = useGameStore((s) => s.result);
  const locale = useGameStore((s) => s.locale);
  const screen = useGameStore((s) => s.screen);
  const mode = useGameStore((s) => s.mode);
  const playerSide = useGameStore((s) => s.playerSide);
  const planId = useGameStore((s) => s.planId);
  const running = useGameStore((s) => s.running);

  const toggleLocale = useGameStore((s) => s.toggleLocale);
  const selectSide = useGameStore((s) => s.selectSide);
  const setPlanId = useGameStore((s) => s.setPlanId);
  const setMode = useGameStore((s) => s.setMode);
  const enqueueCommand = useGameStore((s) => s.enqueueCommand);
  const launchMission = useGameStore((s) => s.launchMission);
  const toggleRunning = useGameStore((s) => s.toggleRunning);
  const returnToBriefing = useGameStore((s) => s.returnToBriefing);

  const t = (text: LocalizedMissionText) => localize(text, locale);
  const playerPlans = mission.briefing.plans.filter(
    (plan) => plan.side === playerSide,
  );
  const selectedPlan =
    playerPlans.find((plan) => plan.id === planId) ?? playerPlans[0];
  const playerUnits = state.units.filter(
    (unit) => unit.side === playerSide && unit.alive,
  );
  const enemyUnits = state.units.filter(
    (unit) => unit.side === OPPONENT[playerSide] && unit.alive,
  );
  const selectedUnits = state.units.filter((unit) =>
    state.selectedUnitIds.includes(unit.id),
  );
  const selectedUnit = selectedUnits[0];
  const selectedSupport = selectedUnits.some(
    (unit) => unit.kind === "artillery" || unit.kind === "support-weapon",
  );

  const currentMoment = useMemo(
    () =>
      [...mission.narrativeMoments]
        .reverse()
        .find((moment) => moment.atSecond <= state.tick / TICK_RATE) ??
      mission.narrativeMoments[0],
    [mission.narrativeMoments, state.tick],
  );

  const controls = useMemo(
    () => ({
      briefing: translateKey("ui.briefing", locale),
      chooseSide: translateKey("ui.chooseSide", locale),
      choosePlan: translateKey("ui.choosePlan", locale),
      situation: translateKey("ui.situation", locale),
      historical: translateKey("ui.historicalFrame", locale),
      launch: translateKey("ui.launch", locale),
      battle: translateKey("ui.tacticalBoard", locale),
      pause: translateKey("ui.pause", locale),
      resume: translateKey("ui.resume", locale),
      orders: translateKey("ui.orders", locale),
      objectives: translateKey("ui.objectives", locale),
      forces: translateKey("ui.forceStatus", locale),
      log: translateKey("ui.combatLog", locale),
      time: translateKey("ui.operationalTime", locale),
      control: translateKey("ui.control", locale),
      result: translateKey("ui.simulationResult", locale),
      archive: translateKey("ui.historicalArchive", locale),
      replay: translateKey("ui.replay", locale),
      planned: translateKey("ui.openingPlan", locale),
      current: translateKey("ui.inProgress", locale),
      final: translateKey("ui.completed", locale),
      report: translateKey("ui.situationReport", locale),
      source: translateKey("ui.sources", locale),
      selected: translateKey("ui.selectedUnit", locale),
      none: translateKey("ui.noSelection", locale),
      move: translateKey("order.move", locale),
      fire: translateKey("order.attack", locale),
      support: translateKey("order.support", locale),
      hold: translateKey("order.hold", locale),
      entrench: translateKey("order.entrench", locale),
      retreat: translateKey("order.retreat", locale),
      resupply: translateKey("order.resupply", locale),
      roster: translateKey("ui.availableForce", locale),
      back: translateKey("ui.returnToBriefing", locale),
      objective: translateKey("ui.playerObjective", locale),
      tooltip: translateKey("ui.tooltip", locale),
    }),
    [locale],
  );

  const [cameraPanTarget, setCameraPanTarget] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (running && screen === "battle") {
      TacticalAudioManager.getInstance().updateAtmosphere(state.weather?.type ?? "clear");
    } else {
      TacticalAudioManager.getInstance().stopAtmosphere();
    }
  }, [running, screen, state.weather?.type]);

  const returnToMenu = useGameStore((s) => s.returnToMenu);

  if (screen !== "battle") {
    return <MainMenu />;
  }

  return (
    <main className="command-shell">
      {/* Top HUD Telemetry Bar */}
      <TelemetryBar
        state={state}
        mission={mission}
        playerSide={playerSide}
        locale={locale}
        running={running}
        onToggleRunning={toggleRunning}
        onToggleLocale={toggleLocale}
        onOpenArchive={() => setIsArchiveOpen(true)}
        onReturnToBriefing={returnToMenu}
      />

      <section className="command-grid">
        {/* Left Rail: Tactical Objectives, Narrative Report, and Real-time Combat Log */}
        <aside className="left-rail">
          <div className="rail-card objectives-card">
            <p className="rail-label">{controls.objectives}</p>
            <h2>{t(mission.briefing.playerObjective[playerSide])}</h2>
            {mission.objectives
              .filter((objective) => objective.side === playerSide)
              .map((objective) => {
                const feat = mission.map.features.find(
                  (f) => f.id === objective.featureId,
                );
                return (
                  <div className="objective-row" key={objective.id}>
                    <i
                      className={
                        state.control[objective.featureId] === playerSide
                          ? "done"
                          : ""
                      }
                    />
                    <span>{feat ? featureName(feat, locale) : objective.featureId}</span>
                    <b>
                      {state.control[objective.featureId] === playerSide
                        ? locale === "es-AR"
                          ? "ASEGURADO"
                          : "HELD"
                        : locale === "es-AR"
                          ? "EN RIESGO"
                          : "AT RISK"}
                    </b>
                  </div>
                );
              })}
          </div>

          <div className="rail-card narrative-card">
            <p className="rail-label">
              {controls.report} ·{" "}
              {formatTime(Math.floor(currentMoment.atSecond * TICK_RATE))}
            </p>
            <h2>{t(currentMoment.title)}</h2>
            <p>{t(currentMoment.body)}</p>
            <small>
              {controls.source}: {currentMoment.sourceIds.join(" · ")}
            </small>
          </div>

          <CombatLog state={state} locale={locale} />
        </aside>

        {/* Center: Tactical Canvas & Command Card */}
        <section className="map-console">
          <div className="map-frame">
            <div className="map-toolbar">
              <span>
                {locale === "es-AR"
                  ? "TABLERO TÁCTICO"
                  : "TACTICAL BOARD"}
              </span>
              <span className="map-key">
                <i className="argentina" /> ARG <i className="britain" /> UK{" "}
                <i className="objective" />{" "}
                {locale === "es-AR" ? "objetivo" : "objective"}
              </span>
            </div>
            <TacticalCanvas
              mapWidth={mission.map.width}
              mapHeight={mission.map.height}
              terrain={mission.map.terrain}
              cameraPanTarget={cameraPanTarget}
            />
          </div>

          <CommandCard
            state={state}
            playerSide={playerSide}
            locale={locale}
            activeMode={mode}
            onOrderMove={() => setMode("move")}
            onOrderAttack={() => setMode("fire")}
            onOrderSupport={() => setMode("support")}
            onOrderHold={() => {
              TacticalAudioManager.getInstance().playRadioChirp();
              enqueueCommand({
                type: "HOLD",
                unitIds: state.selectedUnitIds,
              });
            }}
            onOrderEntrench={() => {
              TacticalAudioManager.getInstance().playRadioChirp();
              enqueueCommand({
                type: "ENTRENCH",
                unitIds: state.selectedUnitIds,
              });
            }}
            onOrderRetreat={() => {
              TacticalAudioManager.getInstance().playRadioChirp();
              enqueueCommand({
                type: "RETREAT",
                unitIds: state.selectedUnitIds,
              });
            }}
            onOrderResupply={() => {
              TacticalAudioManager.getInstance().playRadioChirp();
              enqueueCommand({
                type: "REQUEST_REINFORCEMENT",
                unitIds: state.selectedUnitIds,
              });
            }}
            onSelectSingleUnit={(unitId) =>
              enqueueCommand({
                type: "SELECT",
                unitIds: [unitId],
              })
            }
          />
        </section>

        {/* Right Rail: Tactical Minimap, Force Roster & Historical Outcome */}
        <aside className="right-rail">
          <Minimap
            state={state}
            mission={mission}
            playerSide={playerSide}
            camera={{ x: cameraPanTarget?.x ?? 500, y: cameraPanTarget?.y ?? 500, zoom: 1 }}
            onPanToWorld={(x, y) => setCameraPanTarget({ x, y })}
            width={220}
            height={200}
          />

          <div className="rail-card force-card">
            <p className="rail-label">{controls.roster}</p>
            {state.units
              .filter((unit) => unit.side === playerSide)
              .map((unit) => (
                <button
                  key={unit.id}
                  disabled={!unit.alive}
                  onClick={() =>
                    enqueueCommand({
                      type: "SELECT",
                      unitIds: [unit.id],
                    })
                  }
                  className={`roster-unit ${unit.selected ? "selected" : ""}`}
                >
                  <i>{unitGlyph(unit)}</i>
                  <span>
                    <strong>{unit.label}</strong>
                    <small>
                      {unit.alive
                        ? `${Math.round(unit.health)}% · ${unit.ammunition} ${locale === "es-AR" ? "mun." : "ammo"}`
                        : locale === "es-AR"
                          ? "Fuera de combate"
                          : "Out of action"}
                    </small>
                  </span>
                  <b>
                    {unit.order === "attack"
                      ? "×"
                      : unit.order === "move"
                        ? "→"
                        : unit.order === "entrench"
                          ? "🛡️"
                          : unit.order === "hold"
                            ? "⏹"
                            : "·"}
                  </b>
                </button>
              ))}
          </div>

          <div className="rail-card archive-card">
            <p className="rail-label">{controls.archive}</p>
            <p>{t(mission.historicalOutcome.summary)}</p>
            <span>
              {mission.historicalOutcome.winner === "britain" ? "UK" : "ARG"}{" "}
              · {locale === "es-AR" ? "resultado documentado" : "recorded outcome"}
            </span>
          </div>
        </aside>
      </section>
      {result && (
        <section className="after-action">
          <p className="eyebrow">{controls.result}</p>
          <h2>
            {result.playerWon
              ? locale === "es-AR"
                ? "Tu cadena de mando alcanzó el objetivo."
                : "Your command chain achieved its objective."
              : locale === "es-AR"
                ? "La posición no pudo sostenerse."
                : "The position could not be held."}
          </h2>
          <p>{result.endReason}</p>
          <div>
            <span>
              {locale === "es-AR" ? "Tu resultado" : "Your result"}
              <strong>
                {result.playerWon
                  ? SIDE_NAME[locale][playerSide]
                  : SIDE_NAME[locale][OPPONENT[playerSide]]}
              </strong>
            </span>
            <span>
              {controls.archive}
              <strong>
                {SIDE_NAME[locale][mission.historicalOutcome.winner]}
              </strong>
            </span>
          </div>
          <button onClick={returnToBriefing}>{controls.replay} →</button>
        </section>
      )}
      <HistoricalArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        mission={mission}
        locale={locale}
      />
    </main>
  );
}
