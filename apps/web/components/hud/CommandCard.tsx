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
    <div className="command-card">
      {/* Unit Status / Selection Header */}
      <div className="command-unit-header">
        {hasSelection ? (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 className="command-unit-name">
                {selectedUnits.length === 1
                  ? leadUnit.label
                  : `${selectedUnits.length} ${locale === "es-AR" ? "Unidades Seleccionadas" : "Units Selected"}`}
              </h3>
              <span className="command-unit-kind-badge">
                {translateUnitKind(leadUnit.kind, locale)}
              </span>
            </div>

            {selectedUnits.length === 1 && (
              <div className="command-gauges-row">
                <div className="gauge-box">
                  <span className="gauge-label">INTEGRIDAD</span>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill health"
                      style={{ width: `${Math.max(0, Math.min(100, leadUnit.health))}%` }}
                    />
                  </div>
                  <span className="gauge-value">{Math.round(leadUnit.health)}%</span>
                </div>

                <div className="gauge-box">
                  <span className="gauge-label">MUNICIÓN</span>
                  <div className="gauge-bar-track">
                    <div
                      className={`gauge-bar-fill ${leadUnit.ammunition < 30 ? "ammo-low" : "ammo-good"}`}
                      style={{ width: `${Math.max(0, Math.min(100, leadUnit.ammunition))}%` }}
                    />
                  </div>
                  <span className="gauge-value">{leadUnit.ammunition}%</span>
                </div>

                <div className="gauge-box">
                  <span className="gauge-label">ESTADO</span>
                  <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "bold", marginTop: "2px" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", maxHeight: "64px", overflowY: "auto" }}>
                {selectedUnits.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelectSingleUnit(u.id)}
                    className="telemetry-btn"
                    style={{ fontSize: "10px", padding: "4px 8px" }}
                  >
                    {u.label} ({Math.round(u.health)}%)
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: "var(--mist)", fontStyle: "italic", padding: "8px 0", textAlign: "center", width: "100%", fontSize: "11px" }}>
            {t("ui.noSelection")}
          </div>
        )}
      </div>

      {/* RTS Action Command Grid */}
      <div className="command-actions-grid">
        <button
          onClick={onOrderMove}
          disabled={!hasSelection}
          className={`command-action-btn ${activeMode === "move" ? "active" : ""}`}
        >
          {t("order.move")}
        </button>

        <button
          onClick={onOrderAttack}
          disabled={!hasSelection}
          className={`command-action-btn ${activeMode === "fire" ? "active" : ""}`}
        >
          {t("order.attack")}
        </button>

        <button
          onClick={onOrderHold}
          disabled={!hasSelection}
          className="command-action-btn"
        >
          {t("order.hold")}
        </button>

        <button
          onClick={onOrderEntrench}
          disabled={!hasSelection}
          className="command-action-btn"
        >
          {t("order.entrench")}
        </button>

        <button
          onClick={onOrderRetreat}
          disabled={!hasSelection}
          className="command-action-btn retreat"
        >
          {t("order.retreat")}
        </button>

        <button
          onClick={onOrderSupport}
          disabled={!hasSelection || !hasArtillery}
          className={`command-action-btn ${activeMode === "support" ? "active" : ""}`}
        >
          {t("order.support")}
        </button>

        <button
          onClick={onOrderResupply}
          disabled={!hasSelection}
          className="command-action-btn"
          style={{ color: "var(--gold)" }}
        >
          📦 {t("order.resupply")}
        </button>
      </div>
    </div>
  );
}
