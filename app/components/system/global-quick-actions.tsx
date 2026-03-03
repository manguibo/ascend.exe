"use client";

import { useMemo } from "react";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { displayWeightToKg, formatHeight, formatWeight, getHeightUnitLabel, getWeightUnitLabel, heightDisplayToCm, heightCmToDisplay, kgToDisplayWeight } from "@/lib/system/units";
import { applySessionProfile, resetSessionInputToStandard, sessionProfiles } from "@/lib/system/profiles";
import { cadenceOptions, unitSystemOptions, type SessionLogInput, type UnitSystem } from "@/lib/system/session-state";
import { useUiPanelOpen } from "@/lib/system/use-ui-panel-open";
import { SessionProfileButtons } from "./session-profile-buttons";

function parseNumber(rawValue: string, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function GlobalQuickActions() {
  const { snapshot, input, setInput } = useSystemSnapshot();
  const { open, toggleOpen } = useUiPanelOpen("global-quick-actions", false);

  const summary = useMemo(() => {
    return `Points ${snapshot.xp.totalXp} | Activity ${snapshot.activity.label} | Height ${formatHeight(input.heightCm, input.unitSystem)} | Weight ${formatWeight(input.bodyWeightKg, input.unitSystem)}`;
  }, [snapshot.xp.totalXp, snapshot.activity.label, input.heightCm, input.bodyWeightKg, input.unitSystem]);

  const setNumberField = (field: keyof Pick<SessionLogInput, "heightCm" | "bodyWeightKg" | "targetWeightKg" | "fitnessBaselinePct">, rawValue: string) => {
    setInput((current) => {
      const parsed = parseNumber(rawValue, current[field]);
      if (field === "fitnessBaselinePct") {
        return { ...current, [field]: clamp(parsed, 0, 100) };
      }
      if (field === "heightCm") {
        const metricHeight = heightDisplayToCm(parsed, current.unitSystem);
        return { ...current, [field]: clamp(metricHeight, 120, 230) };
      }
      const metricWeight = displayWeightToKg(parsed, current.unitSystem);
      return { ...current, [field]: clamp(metricWeight, 0, 500) };
    });
  };

  return (
    <section className="border-b border-cyan-500/20 bg-black/80 px-6 py-2 sm:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.16em] text-cyan-500/90">QUICK EDITS | {summary}</p>
          <button
            type="button"
            onClick={toggleOpen}
            className="border border-cyan-500/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
          >
            {open ? "HIDE" : "EDIT"}
          </button>
        </div>
        {open ? (
          <div className="mt-3 grid gap-3">
            <section className="border border-cyan-500/35 p-3 font-mono">
              <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">PERSONAL DETAILS</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">HEIGHT ({getHeightUnitLabel(input.unitSystem).toUpperCase()})</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={input.unitSystem === "IMPERIAL" ? "0.1" : "1"}
                    value={heightCmToDisplay(input.heightCm, input.unitSystem)}
                    onChange={(event) => setNumberField("heightCm", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">CURRENT WEIGHT ({getWeightUnitLabel(input.unitSystem).toUpperCase()})</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={kgToDisplayWeight(input.bodyWeightKg, input.unitSystem)}
                    onChange={(event) => setNumberField("bodyWeightKg", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">TARGET WEIGHT ({getWeightUnitLabel(input.unitSystem).toUpperCase()})</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={kgToDisplayWeight(input.targetWeightKg, input.unitSystem)}
                    onChange={(event) => setNumberField("targetWeightKg", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">FITNESS LEVEL (0-100)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    value={input.fitnessBaselinePct}
                    onChange={(event) => setNumberField("fitnessBaselinePct", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">WORKOUT GOAL</span>
                  <select
                    value={input.expectedCadence}
                    onChange={(event) => setInput((current) => ({ ...current, expectedCadence: event.target.value as SessionLogInput["expectedCadence"] }))}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    {cadenceOptions.map((option) => (
                      <option key={option} value={option} className="bg-black text-cyan-200">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">MEASUREMENT SYSTEM</span>
                  <select
                    value={input.unitSystem}
                    onChange={(event) => setInput((current) => ({ ...current, unitSystem: event.target.value as UnitSystem }))}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    {unitSystemOptions.map((option) => (
                      <option key={`global-unit-${option}`} value={option} className="bg-black text-cyan-200">
                        {option === "METRIC" ? "Metric (cm / kg)" : "Imperial (in / lb)"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <SessionProfileButtons
              profiles={sessionProfiles}
              className="grid gap-2 sm:grid-cols-3"
              onApply={(profileId) => setInput((current) => applySessionProfile(current, profileId))}
            />
            <button
              type="button"
              onClick={() => setInput((current) => resetSessionInputToStandard(current))}
              className="w-fit border border-cyan-500/40 px-3 py-2 font-mono text-xs tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
            >
              RESET TO DEFAULTS
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
