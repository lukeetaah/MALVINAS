"use client";

import type { MatchState, Side, UnitState, Locale } from "@malvinas/simulation";
import { t as translateKey, translateUnitKind } from "@malvinas/simulation";

interface CommandCardProps {
  state: MatchState;
  playerSide: Side;
  locale: Locale;
  onOrderMove: () => void;
  onOrderAttack: () => void;
  onOrderSupport: () => void;
  onOrderHold: () => void;
  onOrderEntrench: () => void;
  onOrderRetreat: () => void;
  onOrderResupply: () => void;
  onSelectSingleUnit: (unitId: string) => void;
  activeMode: string;
}

export function CommandCard({
  state,
  playerSide,
  locale,
  onOrderMove,
  onOrderAttack,
  onOrderSupport,
  onOrderHold,
  onOrderEntrench,
  onOrderRetreat,
  onOrderResupply,
  onSelectSingleUnit,
  activeMode,
}: CommandCardProps) {
  const selectedUnits = state.units.filter(
    (u) => state.selectedUnitIds.includes(u.id) && u.alive && u.side === playerSide,
  );

  const hasSelection = selectedUnits.length > 0;
  const leadUnit = selectedUnits[0];

  const hasArtillery = selectedUnits.some(
    (u) => u.kind === "artillery" || u.kind === "support-weapon",
  );

  const t = (key: any) => translateKey(key, locale);

  return (
    <div className="flex flex-col bg-[#0f1b15] border border-[#263c2e] rounded-lg p-3 space-y-3 font-mono text-xs text-[#dce7dc]">
      {/* Unit Status / Selection Header */}
      <div className="border-b border-[#213529] pb-2">
        {hasSelection ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#f4d787] text-sm">
                {selectedUnits.length === 1
                  ? leadUnit.label
                  : `${selectedUnits.length} ${locale === "es-AR" ? "Unidades Seleccionadas" : "Units Selected"}`}
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-[#1b2f23] rounded border border-[#3b5744] text-[#a0c1a8]">
                {translateUnitKind(leadUnit.kind, locale)}
              </span>
            </div>

            {selectedUnits.length === 1 && (
              <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                <div>
                  <span className="text-[#7e9985] text-[10px]">INTEGRIDAD</span>
                  <div className="w-full bg-[#16271e] h-2 rounded mt-0.5 overflow-hidden border border-[#2b4133]">
                    <div
                      className="h-full bg-[#48bb78] transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, leadUnit.health))}%` }}
                    />
                  </div>
                  <span className="text-[10px]">{Math.round(leadUnit.health)}%</span>
                </div>

                <div>
                  <span className="text-[#7e9985] text-[10px]">MUNICIÓN</span>
                  <div className="w-full bg-[#16271e] h-2 rounded mt-0.5 overflow-hidden border border-[#2b4133]">
                    <div
                      className={`h-full transition-all ${
                        leadUnit.ammunition < 30 ? "bg-[#e53e3e]" : "bg-[#ecc94b]"
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, leadUnit.ammunition))}%` }}
                    />
                  </div>
                  <span className="text-[10px]">{leadUnit.ammunition}%</span>
                </div>

                <div>
                  <span className="text-[#7e9985] text-[10px]">ESTADO</span>
                  <div className="text-[10px] text-[#f4d787] mt-0.5 truncate">
                    {leadUnit.entrenched
                      ? "[ATRINCHERADO]"
                      : leadUnit.isSuppressed
                        ? "[BAJO FUEGO]"
                        : leadUnit.order.toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            {/* Multi-unit Selection Badges */}
            {selectedUnits.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-16 overflow-y-auto">
                {selectedUnits.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelectSingleUnit(u.id)}
                    className="text-[10px] px-2 py-1 bg-[#14231a] border border-[#2b4133] rounded hover:border-[#f4d787] text-[#c5d36e]"
                  >
                    {u.label} ({Math.round(u.health)}%)
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[#6d8874] italic py-2 text-center text-[11px]">
            {t("ui.noSelection")}
          </div>
        )}
      </div>

      {/* RTS Action Command Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={onOrderMove}
          disabled={!hasSelection}
          className={`px-2 py-2 text-center rounded border font-semibold text-[11px] transition-colors ${
            activeMode === "move"
              ? "bg-[#284834] border-[#f4d787] text-[#f4d787]"
              : "bg-[#14231b] border-[#2b4133] text-[#c5d36e] hover:bg-[#1b2f23] disabled:opacity-30"
          }`}
        >
          {t("order.move")}
        </button>

        <button
          onClick={onOrderAttack}
          disabled={!hasSelection}
          className={`px-2 py-2 text-center rounded border font-semibold text-[11px] transition-colors ${
            activeMode === "attack"
              ? "bg-[#4a2424] border-[#e53e3e] text-[#feb2b2]"
              : "bg-[#14231b] border-[#2b4133] text-[#c5d36e] hover:bg-[#1b2f23] disabled:opacity-30"
          }`}
        >
          {t("order.attack")}
        </button>

        <button
          onClick={onOrderHold}
          disabled={!hasSelection}
          className="px-2 py-2 text-center rounded border font-semibold text-[11px] bg-[#14231b] border-[#2b4133] text-[#c5d36e] hover:bg-[#1b2f23] disabled:opacity-30"
        >
          {t("order.hold")}
        </button>

        <button
          onClick={onOrderEntrench}
          disabled={!hasSelection}
          className="px-2 py-2 text-center rounded border font-semibold text-[11px] bg-[#14231b] border-[#2b4133] text-[#c5d36e] hover:bg-[#1b2f23] disabled:opacity-30"
        >
          {t("order.entrench")}
        </button>

        <button
          onClick={onOrderRetreat}
          disabled={!hasSelection}
          className="px-2 py-2 text-center rounded border font-semibold text-[11px] bg-[#14231b] border-[#2b4133] text-[#f56565] hover:bg-[#2c1b1b] disabled:opacity-30"
        >
          {t("order.retreat")}
        </button>

        <button
          onClick={onOrderSupport}
          disabled={!hasSelection || !hasArtillery}
          className={`px-2 py-2 text-center rounded border font-semibold text-[11px] transition-colors ${
            activeMode === "support"
              ? "bg-[#284834] border-[#f4d787] text-[#f4d787]"
              : "bg-[#14231b] border-[#2b4133] text-[#c5d36e] hover:bg-[#1b2f23] disabled:opacity-30"
          }`}
        >
          {t("order.support")}
        </button>

        <button
          onClick={onOrderResupply}
          disabled={!hasSelection}
          className="col-span-2 px-2 py-2 text-center rounded border font-semibold text-[11px] bg-[#14231b] border-[#2b4133] text-[#ecc94b] hover:bg-[#232918] disabled:opacity-30"
        >
          📦 {t("order.resupply")}
        </button>
      </div>
    </div>
  );
}
