"use client";

import { useMemo } from "react";
import type { MatchState, Locale } from "@malvinas/simulation";
import { TICK_RATE, t as translateKey, formatOperationalTime } from "@malvinas/simulation";

interface CombatLogProps {
  state: MatchState;
  locale: Locale;
  maxEntries?: number;
}

export function CombatLog({ state, locale, maxEntries = 6 }: CombatLogProps) {
  const t = (key: any) => translateKey(key, locale);

  const logs = useMemo(() => {
    return [...state.eventLog].slice(-maxEntries).reverse();
  }, [state.eventLog, maxEntries]);

  return (
    <div className="combat-log-card">
      <div className="combat-log-header">
        <p className="eyebrow">
          📜 {t("ui.combatLog")}
        </p>
        <span style={{ fontSize: "10px", color: "var(--mist)" }}>
          {state.eventLog.length} {locale === "es-AR" ? "registros" : "events"}
        </span>
      </div>

      <div className="combat-log-list">
        {logs.length > 0 ? (
          logs.map((entry, idx) => (
            <div key={idx} className="combat-log-item">
              <span className="combat-log-time">
                {formatOperationalTime(Math.floor(entry.tick / TICK_RATE))}
              </span>
              <span className="combat-log-msg">{entry.message}</span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: "11px", color: "var(--mist)", fontStyle: "italic", padding: "10px 0", textAlign: "center" }}>
            {locale === "es-AR"
              ? "Sin eventos de combate registrados."
              : "No combat events recorded yet."}
          </div>
        )}
      </div>
    </div>
  );
}
