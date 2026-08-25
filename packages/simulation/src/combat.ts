import type { TerrainGrid } from "./terrain-types";
import { getCover, getElevation } from "./terrain";
import type { UnitState, Vec2, WeatherState } from "./types";
import {
  applySuppression,
  getEffectiveDamageMultiplier,
  getUnitDefenseCoverBonus,
} from "./unit";

export interface CombatResult {
  hit: boolean;
  damage: number;
  suppressionDealt: number;
  armorMitigated: boolean;
  elevationAdvantage: number; // positive = attacker on higher ground
  effectiveCover: number;
}

export interface AreaImpact {
  center: Vec2;
  radius: number;
  primaryDamage: number;
  suppressionPower: number;
}

/**
 * Calculates elevation advantage factor between attacker and defender.
 * Returns ratio > 1.0 if attacker is on higher ground, < 1.0 if attacker is shooting uphill.
 */
export function calculateElevationCombatModifier(
  grid: TerrainGrid | undefined,
  attackerPos: Vec2,
  defenderPos: Vec2,
): { damageMult: number; rangeMult: number; elevDiff: number } {
  if (!grid) {
    return { damageMult: 1.0, rangeMult: 1.0, elevDiff: 0 };
  }

  const attackerElev = getElevation(grid, attackerPos);
  const defenderElev = getElevation(grid, defenderPos);
  const elevDiff = attackerElev - defenderElev;

  // Each 10m of elevation advantage gives +15% range and +20% damage
  // Capped between 0.6x (heavy disadvantage) and 1.5x (commanding heights)
  const factor = elevDiff / 25;
  const damageMult = Math.max(0.65, Math.min(1.45, 1.0 + factor * 0.25));
  const rangeMult = Math.max(0.75, Math.min(1.35, 1.0 + factor * 0.2));

  return { damageMult, rangeMult, elevDiff };
}

/**
 * Calculates armor penetration mitigation factor.
 * If target has no armor, factor is 1.0 (no mitigation).
 * If target has high armor and incoming penetration is low, damage is reduced.
 */
export function calculateArmorMitigation(
  penetration: number,
  armor: number,
): { damageFactor: number; mitigated: boolean } {
  if (armor <= 0) return { damageFactor: 1.0, mitigated: false };

  const effectiveRatio = penetration / Math.max(0.01, armor);
  if (effectiveRatio >= 1.0) {
    // Complete penetration
    return { damageFactor: 1.0, mitigated: false };
  }

  // Partial or non-penetration: reduces damage down to minimum 20%
  const factor = Math.max(0.2, effectiveRatio);
  return { damageFactor: factor, mitigated: true };
}

/**
 * Calculates hit probability based on distance, attacker suppression, unit profile, and weather visibility.
 */
export function calculateHitProbability(
  dist: number,
  maxRange: number,
  attacker: UnitState,
  weather?: WeatherState,
): number {
  if (dist > maxRange) return 0;

  // Base accuracy drops with range
  const rangeRatio = dist / Math.max(1, maxRange);
  let accuracy = 0.95 - rangeRatio * 0.35; // 95% at point blank, 60% at max range

  // Attacker suppression penalty (up to -40% accuracy)
  if (attacker.suppressionLevel > 0) {
    accuracy -= attacker.suppressionLevel * 0.4;
  }

  // Morale effect
  accuracy *= 0.6 + attacker.morale * 0.4;

  // Weather visibility penalty
  if (weather) {
    accuracy *= 0.7 + weather.visibilityMultiplier * 0.3;
  }

  return Math.max(0.15, Math.min(0.98, accuracy));
}

/**
 * Resolves single-target attack calculation taking into account:
 * - Distance and effective range with elevation
 * - Attacker morale and suppression damage degradation
 * - Target terrain cover + entrenchment defense
 * - Target armor vs attacker penetration
 * - Atmospheric weather conditions
 */
export function calculateAttack(
  attacker: UnitState,
  target: UnitState,
  grid?: TerrainGrid,
  randomRoll = Math.random(),
  weather?: WeatherState,
): CombatResult {
  const dist = Math.hypot(
    attacker.position.x - target.position.x,
    attacker.position.y - target.position.y,
  );

  const elevMod = calculateElevationCombatModifier(
    grid,
    attacker.position,
    target.position,
  );
  const effectiveRange = attacker.attackRange * elevMod.rangeMult;

  if (dist > effectiveRange) {
    return {
      hit: false,
      damage: 0,
      suppressionDealt: 0,
      armorMitigated: false,
      elevationAdvantage: elevMod.elevDiff,
      effectiveCover: 0,
    };
  }

  const hitProb = calculateHitProbability(dist, effectiveRange, attacker, weather);
  const hit = randomRoll <= hitProb;

  // 1. Calculate defense cover
  const terrainCover = grid ? getCover(grid, target.position) : 0.1;
  const entrenchBonus = getUnitDefenseCoverBonus(target);
  const effectiveCover = Math.min(0.85, terrainCover + entrenchBonus);

  // 2. Calculate armor mitigation
  const armorMitigation = calculateArmorMitigation(
    attacker.penetrationRating,
    target.armorRating,
  );

  // 3. Calculate final raw damage
  const damageMult = getEffectiveDamageMultiplier(attacker) * elevMod.damageMult;
  let finalDamage = 0;

  if (hit) {
    const rawDamage =
      attacker.damage *
      (1 - effectiveCover) *
      armorMitigation.damageFactor *
      damageMult;
    finalDamage = Math.max(1, Math.round(rawDamage));
  }

  // Suppression is dealt even on near-misses
  const suppressionFactor = hit ? 1.0 : 0.45;
  const suppressionDealt = attacker.suppressionPower * suppressionFactor;

  return {
    hit,
    damage: finalDamage,
    suppressionDealt,
    armorMitigated: armorMitigation.mitigated,
    elevationAdvantage: elevMod.elevDiff,
    effectiveCover,
  };
}

/**
 * Resolves area-of-effect splash damage from artillery / heavy support weapons.
 */
export function resolveAreaSplash(
  impact: AreaImpact,
  units: UnitState[],
  sourceSide: string,
  grid?: TerrainGrid,
): Array<{ unit: UnitState; damage: number; suppression: number }> {
  const affected: Array<{ unit: UnitState; damage: number; suppression: number }> = [];

  for (const unit of units) {
    if (!unit.alive || unit.side === sourceSide) continue;

    const dist = Math.hypot(
      unit.position.x - impact.center.x,
      unit.position.y - impact.center.y,
    );

    if (dist <= impact.radius) {
      const falloff = 1 - dist / impact.radius;
      const terrainCover = grid ? getCover(grid, unit.position) : 0.1;
      const entrenchBonus = getUnitDefenseCoverBonus(unit);
      const effectiveCover = Math.min(0.85, terrainCover + entrenchBonus);

      const splashDamage = Math.max(
        1,
        Math.round(impact.primaryDamage * falloff * (1 - effectiveCover)),
      );
      const splashSuppression = impact.suppressionPower * falloff;

      unit.health = Math.max(0, unit.health - splashDamage);
      applySuppression(unit, splashSuppression);

      if (unit.health <= 0) {
        unit.alive = false;
        unit.order = "idle";
      }

      affected.push({
        unit,
        damage: splashDamage,
        suppression: splashSuppression,
      });
    }
  }

  return affected;
}
