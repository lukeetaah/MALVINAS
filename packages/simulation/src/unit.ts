import type {
  MatchState,
  MissionUnitConfig,
  Side,
  UnitKind,
  UnitOrder,
  UnitState,
} from "./types";

/**
 * Default tactical profiles per unit classification in 1982 South Atlantic theater.
 */
export const DEFAULT_UNIT_TACTICAL_PROFILES: Record<
  UnitKind,
  {
    sightRange: number;
    stealthRating: number;
    armorRating: number;
    penetrationRating: number;
    suppressionPower: number;
  }
> = {
  infantry: {
    sightRange: 14,
    stealthRating: 0.35,
    armorRating: 0.0,
    penetrationRating: 0.15,
    suppressionPower: 0.1,
  },
  "support-weapon": {
    sightRange: 16,
    stealthRating: 0.25,
    armorRating: 0.05,
    penetrationRating: 0.45,
    suppressionPower: 0.35, // Machine guns / Oerlikon / MILAN excel at suppression
  },
  artillery: {
    sightRange: 20,
    stealthRating: 0.1,
    armorRating: 0.1,
    penetrationRating: 0.6,
    suppressionPower: 0.6, // Heavy artillery creates massive suppression
  },
  armour: {
    sightRange: 16,
    stealthRating: 0.05,
    armorRating: 0.75,
    penetrationRating: 0.7,
    suppressionPower: 0.4,
  },
  aircraft: {
    sightRange: 32,
    stealthRating: 0.0,
    armorRating: 0.2,
    penetrationRating: 0.8,
    suppressionPower: 0.75,
  },
  ship: {
    sightRange: 40,
    stealthRating: 0.0,
    armorRating: 0.85,
    penetrationRating: 0.9,
    suppressionPower: 0.9,
  },
};

/**
 * Initializes a fully qualified UnitState from a MissionUnitConfig.
 */
export function createUnitState(config: MissionUnitConfig): UnitState {
  const profile = DEFAULT_UNIT_TACTICAL_PROFILES[config.kind];

  return {
    ...config,
    selected: false,
    order: "idle",
    destination: null,
    targetUnitId: null,
    cooldownUntilTick: 0,
    alive: config.health > 0,
    maxAmmunition: config.maxAmmunition ?? config.ammunition,
    maxFuel: config.maxFuel ?? config.fuel,
    sightRange: config.sightRange ?? profile.sightRange,
    stealthRating: config.stealthRating ?? profile.stealthRating,
    armorRating: config.armorRating ?? profile.armorRating,
    penetrationRating: config.penetrationRating ?? profile.penetrationRating,
    suppressionPower: config.suppressionPower ?? profile.suppressionPower,
    suppressionLevel: (config as any).suppressionLevel ?? 0,
    isSuppressed: (config as any).isSuppressed ?? (((config as any).suppressionLevel ?? 0) >= 0.4),
    entrenched: (config as any).entrenched ?? false,
    entrenchProgress: (config as any).entrenchProgress ?? ((config as any).entrenched ? 1 : 0),
    controlGroup: (config as any).controlGroup ?? null,
    path: (config as any).path ?? [],
  };
}

/**
 * Applies incoming suppression to a unit.
 * Pinned at suppressionLevel >= 0.8.
 */
export function applySuppression(unit: UnitState, amount: number): void {
  if (!unit.alive) return;
  // Entrenched units take 40% less suppression from incoming fire
  const resistance = unit.entrenched ? 0.6 : 1.0;
  unit.suppressionLevel = Math.min(1.0, unit.suppressionLevel + amount * resistance);
  unit.isSuppressed = unit.suppressionLevel >= 0.4;

  // Severe suppression also damages morale
  if (unit.suppressionLevel >= 0.7) {
    unit.morale = Math.max(0.05, unit.morale - 0.015);
  }
}

/**
 * Gradually reduces suppression over time (per tick).
 */
export function decaySuppression(unit: UnitState, decayRate = 0.02): void {
  if (!unit.alive || unit.suppressionLevel <= 0) return;
  unit.suppressionLevel = Math.max(0, unit.suppressionLevel - decayRate);
  unit.isSuppressed = unit.suppressionLevel >= 0.4;
}

/**
 * Advances or handles entrenchment progress.
 * Takes 100 ticks (10 seconds) to fully entrench.
 */
export function updateEntrenchment(unit: UnitState, dtTicks = 1): void {
  if (!unit.alive) return;

  if (unit.order === "entrench" && !unit.entrenched) {
    // Only infantry and support weapons can entrench in field positions
    if (unit.kind === "infantry" || unit.kind === "support-weapon") {
      unit.entrenchProgress = Math.min(1.0, unit.entrenchProgress + dtTicks * 0.01);
      if (unit.entrenchProgress >= 1.0) {
        unit.entrenched = true;
      }
    }
  } else if (unit.order === "move" || unit.order === "retreat") {
    // Moving breaks entrenchment
    unit.entrenched = false;
    unit.entrenchProgress = 0;
  }
}

/**
 * Calculates effective speed considering health, suppression and entrenchment.
 */
export function getEffectiveSpeed(unit: UnitState): number {
  if (!unit.alive) return 0;
  if (unit.entrenched) return 0; // Entrenched units cannot move without a move/retreat order breaking entrenchment

  // Speed drops by up to 50% under heavy suppression
  const suppressionPenalty = 1.0 - unit.suppressionLevel * 0.5;
  // Low health (<50%) causes up to 25% speed penalty
  const healthFactor = unit.health < 50 ? 0.75 + (unit.health / 50) * 0.25 : 1.0;

  return unit.speed * suppressionPenalty * healthFactor;
}

/**
 * Calculates effective combat damage multiplier modified by morale and suppression.
 */
export function getEffectiveDamageMultiplier(unit: UnitState): number {
  if (!unit.alive || unit.ammunition <= 0) return 0;

  // Morale scaling (0.45 min to 1.0)
  const moraleFactor = Math.max(0.45, unit.morale);
  // Suppression reduces accuracy/damage output by up to 60%
  const suppressionFactor = 1.0 - unit.suppressionLevel * 0.6;

  return moraleFactor * suppressionFactor;
}

/**
 * Calculates defense cover bonus provided by personal status (e.g. entrenchment).
 */
export function getUnitDefenseCoverBonus(unit: UnitState): number {
  if (!unit.alive) return 0;
  // Entrenched status adds +0.30 flat cover
  return unit.entrenched ? 0.3 : 0.0;
}

/**
 * Checks whether a unit is capable of executing combat orders.
 */
export function isUnitOperational(unit: UnitState): boolean {
  return unit.alive && unit.health > 0 && unit.morale > 0.1;
}

/**
 * Assigns unit IDs to a designated control group (1-9).
 */
export function assignControlGroup(
  state: MatchState,
  side: Side,
  groupNumber: number,
  unitIds: string[],
): void {
  if (groupNumber < 1 || groupNumber > 9) return;
  if (!state.controlGroups[side]) {
    state.controlGroups[side] = {};
  }

  // Filter valid living units belonging to player
  const validIds = unitIds.filter((id) =>
    state.units.some((u) => u.id === id && u.side === side && u.alive),
  );

  state.controlGroups[side][groupNumber] = validIds;

  for (const unit of state.units) {
    if (unit.side === side) {
      if (validIds.includes(unit.id)) {
        unit.controlGroup = groupNumber;
      } else if (unit.controlGroup === groupNumber) {
        unit.controlGroup = null;
      }
    }
  }
}

/**
 * Retrieves unit IDs for a given control group.
 */
export function getControlGroupUnitIds(
  state: MatchState,
  side: Side,
  groupNumber: number,
): string[] {
  const ids = state.controlGroups[side]?.[groupNumber] ?? [];
  return ids.filter((id) =>
    state.units.some((u) => u.id === id && u.side === side && u.alive),
  );
}
