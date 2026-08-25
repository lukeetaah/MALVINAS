import { describe, it, expect } from "vitest";
import {
  WEATHER_PRESETS,
  DEFAULT_WEATHER,
  getEffectiveSightRange,
  getWeatherMovementMultiplier,
  getBallisticWindDrift,
  stepWeather,
} from "../weather";
import { createMissionState, stepMission, GOOSE_GREEN_MISSION } from "../mission";
import { createUnitState } from "../unit";
import type { MissionDefinition, WeatherState } from "../types";

describe("Weather & Atmospheric Simulation System", () => {
  it("provides comprehensive presets for all Falklands weather conditions", () => {
    expect(WEATHER_PRESETS.clear.visibilityMultiplier).toBe(1.0);
    expect(WEATHER_PRESETS["dense-fog"].visibilityMultiplier).toBeLessThan(0.5);
    expect(WEATHER_PRESETS["snow-blizzard"].aircraftOperational).toBe(false);
    expect(WEATHER_PRESETS.rain.movementCostMultiplier).toBeGreaterThan(1.2);
  });

  it("reduces unit effective sight range under poor weather conditions", () => {
    const baseSight = 14;
    const clearSight = getEffectiveSightRange(baseSight, WEATHER_PRESETS.clear);
    const fogSight = getEffectiveSightRange(baseSight, WEATHER_PRESETS["dense-fog"]);
    const blizzardSight = getEffectiveSightRange(baseSight, WEATHER_PRESETS["snow-blizzard"]);

    expect(clearSight).toBe(baseSight);
    expect(fogSight).toBeLessThan(baseSight * 0.5);
    expect(blizzardSight).toBeLessThan(fogSight);
    expect(blizzardSight).toBeGreaterThanOrEqual(3.0); // minimum baseline
  });

  it("applies movement cost penalties for rain and blizzard ground conditions", () => {
    expect(getWeatherMovementMultiplier(WEATHER_PRESETS.clear)).toBe(1.0);
    expect(getWeatherMovementMultiplier(WEATHER_PRESETS.rain)).toBe(1.4);
    expect(getWeatherMovementMultiplier(WEATHER_PRESETS["snow-blizzard"])).toBe(1.65);
  });

  it("shifts artillery impact coordinates with ballistic wind drift", () => {
    const targetPos = { x: 50, y: 30 };
    const distance = 25; // 25 units range

    const galeWeather: WeatherState = {
      type: "gale-winds",
      visibilityMultiplier: 0.75,
      movementCostMultiplier: 1.25,
      windVector: { x: 1.0, y: 0.5 },
      temperature: 2,
      aircraftOperational: false,
    };

    const drifted = getBallisticWindDrift(targetPos, distance, galeWeather);

    expect(drifted.x).toBeGreaterThan(targetPos.x);
    expect(drifted.y).toBeGreaterThan(targetPos.y);
  });

  it("advances dynamic weather along the mission timeline", () => {
    const missionWithWeatherTimeline: MissionDefinition = {
      ...GOOSE_GREEN_MISSION,
      initialWeather: WEATHER_PRESETS.clear,
      weatherTimeline: [
        {
          atSecond: 10,
          weather: WEATHER_PRESETS["dense-fog"],
          message: {
            "es-AR": "Un denso banco de niebla costera cubre las posiciones.",
            "en-GB": "A dense coastal fog rolls over the positions.",
          },
        },
      ],
    };

    const state = createMissionState(missionWithWeatherTimeline);
    expect(state.weather?.type).toBe("clear");

    // Fast forward to tick 99 (at 10 ticks/sec => second 9.9)
    state.tick = 99;
    stepWeather(state, missionWithWeatherTimeline);
    expect(state.weather?.type).toBe("clear");

    // At tick 100 (second 10.0)
    state.tick = 100;
    stepWeather(state, missionWithWeatherTimeline);
    expect(state.weather?.type).toBe("dense-fog");
  });

  it("grounds aircraft strikes when weather is non-operational", () => {
    const state = createMissionState();
    state.weather = WEATHER_PRESETS["snow-blizzard"]; // aircraftOperational = false

    const airUnit = createUnitState({
      id: "skyhawk-test",
      side: "argentina",
      kind: "aircraft",
      label: "A-4B Skyhawk Flight",
      position: { x: 20, y: 20 },
      health: 100,
      morale: 1.0,
      ammunition: 20,
      fuel: 100,
      speed: 8,
      attackRange: 15,
      damage: 30,
    });

    const targetUnit = createUnitState({
      id: "enemy-target",
      side: "britain",
      kind: "infantry",
      label: "Enemy Platoon",
      position: { x: 25, y: 20 },
      health: 100,
      morale: 1.0,
      ammunition: 50,
      fuel: 1,
      speed: 4,
      attackRange: 8,
      damage: 10,
    });

    airUnit.targetUnitId = targetUnit.id;
    airUnit.order = "attack";
    state.units = [airUnit, targetUnit];

    const initialAmmo = airUnit.ammunition;
    const initialHealth = targetUnit.health;

    // Step simulation: aircraft should NOT fire or expend ammo due to blizzard grounding
    stepMission(state);

    expect(airUnit.ammunition).toBe(initialAmmo);
    expect(targetUnit.health).toBe(initialHealth);
  });
});
