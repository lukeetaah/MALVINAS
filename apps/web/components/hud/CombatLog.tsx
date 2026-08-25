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
    <div className="flex flex-col bg-[#0f1b15] border border-[#263c2e] rounded-lg p-3 space-y-2 font-mono text-xs text-[#dce7dc]">
      <div className="flex items-center justify-between border-b border-[#213529] pb-1.5">
        <span className="font-bold text-[#f4d787] text-xs">
          📜 {t("ui.combatLog")}
        </span>
        <span className="text-[10px] text-[#6d8874]">
          {state.eventLog.length} {locale === "es-AR" ? "registros" : "events"}
        </span>
      </div>

      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
        {logs.length > 0 ? (
          logs.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-2 text-[11px] p-1.5 bg-[#122018] rounded border border-[#1b2c22] leading-tight"
            >
              <span className="text-[10px] text-[#8da594] font-bold shrink-0 mt-0.5">
                {formatOperationalTime(Math.floor(entry.tick / TICK_RATE))}
              </span>
              <span className="text-[#c5d36e] break-words flex-1">
                {entry.message}
              </span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-[#6d8874] italic py-2 text-center">
            {locale === "es-AR"
              ? "Sin eventos de combate registrados."
              : "No combat events recorded yet."}
          </div>
        )}
      </div>
    </div>
  );
}
