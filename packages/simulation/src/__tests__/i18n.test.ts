import { describe, it, expect } from "vitest";
import {
  DICTIONARIES,
  t,
  translateUnitKind,
  translateUnitOrder,
  translateWeather,
  formatOperationalTime,
  formatSupplyStatus,
  type TranslationKey,
} from "../i18n";

describe("i18n Centralized System", () => {
  it("maintains 100% key parity between es-AR and en-GB dictionaries", () => {
    const esKeys = Object.keys(DICTIONARIES["es-AR"]).sort();
    const enKeys = Object.keys(DICTIONARIES["en-GB"]).sort();

    expect(esKeys).toEqual(enKeys);
    expect(esKeys.length).toBeGreaterThanOrEqual(40);
  });

  it("resolves direct translation keys for both locales", () => {
    expect(t("side.argentina", "es-AR")).toBe("Argentina");
    expect(t("side.britain", "es-AR")).toBe("Reino Unido");
    expect(t("side.britain", "en-GB")).toBe("United Kingdom");
    expect(t("ui.launch", "es-AR")).toBe("INICIAR SIMULACIÓN");
    expect(t("ui.launch", "en-GB")).toBe("START SIMULATION");
  });

  it("translates unit kinds properly in both languages", () => {
    expect(translateUnitKind("infantry", "es-AR")).toBe("Infantería");
    expect(translateUnitKind("infantry", "en-GB")).toBe("Infantry");
    expect(translateUnitKind("artillery", "es-AR")).toContain("Artillería");
    expect(translateUnitKind("artillery", "en-GB")).toContain("Artillery");
  });

  it("translates unit orders properly in both languages", () => {
    expect(translateUnitOrder("move", "es-AR")).toBe("Mover [M]");
    expect(translateUnitOrder("move", "en-GB")).toBe("Move [M]");
    expect(translateUnitOrder("entrench", "es-AR")).toBe("Atrincherar [E]");
    expect(translateUnitOrder("entrench", "en-GB")).toBe("Entrench [E]");
  });

  it("translates weather conditions in both languages", () => {
    expect(translateWeather("snow-blizzard", "es-AR")).toContain("Ventisca");
    expect(translateWeather("snow-blizzard", "en-GB")).toContain("Blizzard");
    expect(translateWeather("dense-fog", "es-AR")).toContain("Niebla");
    expect(translateWeather("dense-fog", "en-GB")).toContain("Dense Fog");
  });

  it("formats operational time into mm:ss strings", () => {
    expect(formatOperationalTime(0)).toBe("00:00");
    expect(formatOperationalTime(65)).toBe("01:05");
    expect(formatOperationalTime(180)).toBe("03:00");
  });

  it("formats supply status with localized labels", () => {
    const esSupply = formatSupplyStatus(80, 50, "es-AR");
    expect(esSupply).toContain("Munición: 80%");
    expect(esSupply).toContain("Combustible: 50%");

    const enSupply = formatSupplyStatus(80, 50, "en-GB");
    expect(enSupply).toContain("Ammo: 80%");
    expect(enSupply).toContain("Fuel: 50%");
  });
});
