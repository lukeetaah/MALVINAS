import type { MatchState, MissionDefinition, Vec2, WeatherState, WeatherType } from "./types";

export const WEATHER_PRESETS: Record<WeatherType, WeatherState> = {
  clear: {
    type: "clear",
    visibilityMultiplier: 1.0,
    movementCostMultiplier: 1.0,
    windVector: { x: 0.1, y: 0.0 },
    temperature: 8,
    aircraftOperational: true,
  },
  overcast: {
    type: "overcast",
    visibilityMultiplier: 0.9,
    movementCostMultiplier: 1.05,
    windVector: { x: 0.3, y: 0.1 },
    temperature: 4,
    aircraftOperational: true,
  },
  "dense-fog": {
    type: "dense-fog",
    visibilityMultiplier: 0.45,
    movementCostMultiplier: 1.2,
    windVector: { x: 0.1, y: 0.05 },
    temperature: 2,
    aircraftOperational: false,
  },
  rain: {
    type: "rain",
    visibilityMultiplier: 0.7,
    movementCostMultiplier: 1.4,
    windVector: { x: 0.5, y: -0.2 },
    temperature: 3,
    aircraftOperational: true,
  },
  "snow-blizzard": {
    type: "snow-blizzard",
    visibilityMultiplier: 0.35,
    movementCostMultiplier: 1.65,
    windVector: { x: 0.8, y: -0.4 },
    temperature: -3,
    aircraftOperational: false,
  },
  "gale-winds": {
    type: "gale-winds",
    visibilityMultiplier: 0.75,
    movementCostMultiplier: 1.25,
    windVector: { x: 1.2, y: -0.8 },
    temperature: 1,
    aircraftOperational: false,
  },
};

export const DEFAULT_WEATHER: WeatherState = WEATHER_PRESETS.overcast;

/**
 * Calculates effective sight range adjusted by atmospheric weather visibility.
 */
export function getEffectiveSightRange(
  baseSightRange: number,
  weather?: WeatherState,
): number {
  if (!weather) return baseSightRange;
  return Math.max(3.0, baseSightRange * weather.visibilityMultiplier);
}

/**
 * Returns the movement cost penalty multiplier from wet or frozen ground.
 */
export function getWeatherMovementMultiplier(weather?: WeatherState): number {
  if (!weather) return 1.0;
  return weather.movementCostMultiplier;
}

/**
 * Calculates artillery dispersion and drift offset caused by crosswinds over distance.
 */
export function getBallisticWindDrift(
  targetPos: Vec2,
  distance: number,
  weather?: WeatherState,
): Vec2 {
  if (!weather || Math.hypot(weather.windVector.x, weather.windVector.y) === 0) {
    return targetPos;
  }

  // Drift increases with trajectory flight distance
  const driftFactor = (distance / 20.0) * 1.5;
  return {
    x: targetPos.x + weather.windVector.x * driftFactor,
    y: targetPos.y + weather.windVector.y * driftFactor,
  };
}

/**
 * Updates weather transitions based on the mission's weather timeline.
 */
export function stepWeather(
  state: MatchState,
  mission: MissionDefinition,
): void {
  if (!state.weather) {
    state.weather = mission.initialWeather ?? { ...DEFAULT_WEATHER };
  }

  if (!mission.weatherTimeline || mission.weatherTimeline.length === 0) return;

  const currentSecond = Math.floor(state.tick / mission.tickRate);

  for (const entry of mission.weatherTimeline) {
    if (state.tick === entry.atSecond * mission.tickRate) {
      state.weather = { ...entry.weather };

      if (entry.message) {
        state.eventLog.push({
          tick: state.tick,
          type: "unit-damaged", // general tactical message type
          message: entry.message["es-AR"],
        });
      }
    }
  }
}
