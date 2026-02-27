"use client";

import { useMemo } from "react";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { applySessionProfile, resetSessionInputToStandard, sessionProfiles } from "@/lib/system/profiles";
import { cadenceOptions, type SessionLogInput } from "@/lib/system/session-state";
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
    return `XP ${snapshot.xp.totalXp} | ACTIVITY ${snapshot.activity.codename} | HEIGHT ${input.heightCm} CM | WEIGHT ${input.bodyWeightKg} KG`;
  }, [snapshot.xp.totalXp, snapshot.activity.codename, input.heightCm, input.bodyWeightKg]);

  const setNumberField = (field: keyof Pick<SessionLogInput, "heightCm" | "bodyWeightKg" | "targetWeightKg" | "fitnessBaselinePct">, rawValue: string) => {
    setInput((current) => {
      const parsed = parseNumber(rawValue, current[field]);
      if (field === "fitnessBaselinePct") {
        return { ...current, [field]: clamp(parsed, 0, 100) };
      }
      if (field === "heightCm") {
        return { ...current, [field]: clamp(parsed, 120, 230) };
      }
      return { ...current, [field]: clamp(parsed, 0, 500) };
    });
  };

  return (
    <section className="border-b border-cyan-500/20 bg-black/80 px-6 py-2 sm:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[10px] tracking-[0.16em] text-cyan-500/90">GLOBAL QUICK ACTIONS | {summary}</p>
          <button
            type="button"
            onClick={toggleOpen}
            className="border border-cyan-500/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
          >
            {open ? "HIDE" : "OPEN"}
          </button>
        </div>
        {open ? (
          <div className="mt-3 grid gap-3">
            <section className="border border-cyan-500/35 p-3 font-mono">
              <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">PERSONAL BASELINE</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">HEIGHT (CM)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    value={input.heightCm}
                    onChange={(event) => setNumberField("heightCm", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">CURRENT WEIGHT (KG)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={input.bodyWeightKg}
                    onChange={(event) => setNumberField("bodyWeightKg", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">TARGET WEIGHT (KG)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={input.targetWeightKg}
                    onChange={(event) => setNumberField("targetWeightKg", event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-xs text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">FITNESS BASELINE (%)</span>
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
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">WORKOUT FREQUENCY</span>
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
              RESET TO STANDARD
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
