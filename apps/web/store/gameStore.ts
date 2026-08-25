import { create } from "zustand";
import {
  createMissionState,
  GameLoop,
  getMissionById,
  GOOSE_GREEN_MISSION,
  HISTORICAL_MISSIONS,
  PROTOCOL_VERSION,
  resolveMissionResult,
  stepMission,
  type MatchState,
  type MissionDefinition,
  type MissionResult,
  type Side,
  type SimCommand,
} from "@malvinas/simulation";

type Locale = "es-AR" | "en-GB";
type Screen = "menu" | "briefing" | "battle";
type CommandMode = "move" | "fire" | "support";

const OPPONENT: Record<Side, Side> = {
  argentina: "britain",
  britain: "argentina",
};

// ── Module-level mutable state (never triggers React re-renders) ────────────
let gameLoop: GameLoop | null = null;
const pendingCommands: SimCommand[] = [];
let commandSequence = 0;

// ── Public types ────────────────────────────────────────────────────────────
export type CommandInput = Omit<
  SimCommand,
  "protocolVersion" | "matchId" | "playerId" | "side" | "tick" | "sequence"
>;

interface GameStore {
  // Simulation
  state: MatchState;
  mission: MissionDefinition;
  result: MissionResult | null;

  // UI
  locale: Locale;
  screen: Screen;
  mode: CommandMode;
  playerSide: Side;
  planId: string;
  running: boolean;
  isMultiplayer: boolean;
  desyncDetected: boolean;

  // Actions
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  selectMission: (missionId: string) => void;
  selectSide: (side: Side) => void;
  setPlanId: (planId: string) => void;
  setMode: (mode: CommandMode) => void;
  enqueueCommand: (input: CommandInput) => void;
  selectUnits: (unitIds: string[]) => void;
  clearSelection: () => void;
  assignControlGroup: (groupNum: number, unitIds?: string[]) => void;
  selectControlGroup: (groupNum: number) => void;
  issueHoldOrder: () => void;
  issueEntrenchOrder: () => void;
  issueRetreatOrder: () => void;
  launchMission: () => void;
  toggleRunning: () => void;
  returnToBriefing: () => void;
  returnToMenu: () => void;
  openBriefing: (missionId?: string) => void;
  setDesyncDetected: (desync: boolean) => void;
}

// ── Store ───────────────────────────────────────────────────────────────────
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  state: createMissionState(),
  mission: GOOSE_GREEN_MISSION,
  result: null,
  locale: "es-AR",
  screen: "menu",
  mode: "move",
  playerSide: "argentina",
  planId: "argentina-layered-defense",
  running: false,
  isMultiplayer: false,
  desyncDetected: false,

  setDesyncDetected: (desync) => set({ desyncDetected: desync }),

  // ── Locale ──────────────────────────────────────────────────────────────
  setLocale: (locale) => set({ locale }),
  toggleLocale: () =>
    set((s) => ({ locale: s.locale === "es-AR" ? "en-GB" : "es-AR" })),

  // ── Mission, Side & plan ───────────────────────────────────────────────
  selectMission: (missionId) => {
    const targetMission = getMissionById(missionId) ?? GOOSE_GREEN_MISSION;
    const playerSide = get().playerSide;
    const defaultPlan = targetMission.briefing.plans.find((p) => p.side === playerSide);
    set({
      mission: targetMission,
      state: createMissionState(targetMission, `local-${targetMission.id}`),
      planId: defaultPlan?.id ?? targetMission.briefing.plans[0]?.id ?? "",
      result: null,
    });
  },
  selectSide: (side) => {
    const { mission } = get();
    const defaultPlan = mission.briefing.plans.find((p) => p.side === side);
    set({ playerSide: side, planId: defaultPlan?.id ?? "" });
  },
  setPlanId: (planId) => set({ planId }),
  setMode: (mode) => set({ mode }),

  // ── Commands & Selection ───────────────────────────────────────────────
  enqueueCommand: (input) => {
    const { state, playerSide } = get();
    pendingCommands.push({
      protocolVersion: PROTOCOL_VERSION,
      matchId: state.matchId,
      playerId: "local-player",
      side: playerSide,
      tick: state.tick + 1,
      sequence: commandSequence++,
      ...input,
    });
  },

  selectUnits: (unitIds) => {
    get().enqueueCommand({ type: "SELECT", unitIds });
  },

  clearSelection: () => {
    get().enqueueCommand({ type: "SELECT", unitIds: [] });
    set({ mode: "move" });
  },

  assignControlGroup: (groupNum, unitIds) => {
    const ids = unitIds ?? get().state.selectedUnitIds;
    if (ids.length > 0) {
      get().enqueueCommand({
        type: "ASSIGN_GROUP",
        unitIds: ids,
        groupNumber: groupNum,
      });
    }
  },

  selectControlGroup: (groupNum) => {
    get().enqueueCommand({
      type: "SELECT_GROUP",
      unitIds: [],
      groupNumber: groupNum,
    });
  },

  issueHoldOrder: () => {
    const { state } = get();
    if (state.selectedUnitIds.length > 0) {
      get().enqueueCommand({
        type: "HOLD",
        unitIds: state.selectedUnitIds,
      });
    }
  },

  issueEntrenchOrder: () => {
    const { state } = get();
    if (state.selectedUnitIds.length > 0) {
      get().enqueueCommand({
        type: "ENTRENCH",
        unitIds: state.selectedUnitIds,
      });
    }
  },

  issueRetreatOrder: () => {
    const { state } = get();
    if (state.selectedUnitIds.length > 0) {
      get().enqueueCommand({
        type: "RETREAT",
        unitIds: state.selectedUnitIds,
      });
    }
  },

  // ── Mission lifecycle ───────────────────────────────────────────────────
  launchMission: () => {
    gameLoop?.stop();
    const { playerSide, planId, mission } = get();
    const selectedPlan = mission.briefing.plans.find((p) => p.id === planId);
    const matchState = createMissionState(
      mission,
      `local-${mission.id}-${playerSide}`,
      selectedPlan?.id,
    );

    // Reset command buffer
    pendingCommands.length = 0;
    commandSequence = 0;

    // Create and start the game loop
    gameLoop = new GameLoop(() => {
      const { state: current, mission: m, playerSide: ps } = get();
      if (current.status !== "playing") {
        gameLoop?.stop();
        set({ running: false });
        return;
      }
      const commands = pendingCommands.splice(0);
      const next = stepMission(current, m, commands, OPPONENT[ps]);
      const missionResult =
        next.status !== "playing"
          ? resolveMissionResult(next, m, ps)
          : null;
      set({ state: next, result: missionResult });
      if (next.status !== "playing") {
        gameLoop?.stop();
        set({ running: false });
      }
    });

    set({
      state: matchState,
      screen: "battle",
      mode: "move",
      running: true,
      result: null,
    });
    gameLoop.start();
  },

  toggleRunning: () => {
    const { running, state } = get();
    if (state.status !== "playing") return;
    if (running) {
      gameLoop?.pause();
      set({ running: false });
    } else {
      gameLoop?.resume();
      set({ running: true });
    }
  },

  returnToBriefing: () => {
    gameLoop?.stop();
    pendingCommands.length = 0;
    commandSequence = 0;
    set({ running: false, screen: "menu" });
  },

  returnToMenu: () => {
    gameLoop?.stop();
    pendingCommands.length = 0;
    commandSequence = 0;
    set({ running: false, screen: "menu" });
  },

  openBriefing: (missionId?: string) => {
    if (missionId) {
      get().selectMission(missionId);
    }
    set({ screen: "briefing" });
  },
}));
