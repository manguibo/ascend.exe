"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { DisciplineState } from "@/lib/system/types";
import { DisciplineHeatline } from "./discipline-heatline";
import { RadialGauge } from "./radial-gauge";
import { SignalMeter } from "./signal-meter";
import { TacticalVisualPanel } from "./tactical-visual-panel";

type SystemTelemetryPanelProps = {
  primaryLabel: string;
  primaryValuePct: number;
  primaryHint: string;
  disciplineRiskPct: number;
  decayPressurePct: number;
  disciplineStates?: readonly DisciplineState[];
  showMatrix?: boolean;
};

export function SystemTelemetryPanel({
  primaryLabel,
  primaryValuePct,
  primaryHint,
  disciplineRiskPct,
  decayPressurePct,
  disciplineStates,
  showMatrix = true,
}: SystemTelemetryPanelProps) {
  const reduceMotion = useReducedMotion();
  const readiness = Math.max(0, Math.min(100, Math.round(primaryValuePct)));
  const disciplineRisk = Math.max(0, Math.min(100, Math.round(disciplineRiskPct)));
  const decayPressure = Math.max(0, Math.min(100, Math.round(decayPressurePct)));
  const activeNodes = Math.max(1, Math.round((readiness / 100) * 12));

  return (
    <TacticalVisualPanel title="HEALTH SUMMARY">
      {showMatrix ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] tracking-[0.17em] text-cyan-500/90">STATUS GRID</p>
            <p className="text-[10px] tracking-[0.14em] text-cyan-500/90">ACTIVE CELLS {activeNodes}/12</p>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, index) => {
              const active = index < activeNodes;
              return (
                <motion.div
                  key={`matrix-node-${index + 1}`}
                  className={`h-5 border ${active ? "border-cyan-300/70 bg-cyan-400/25" : "border-cyan-500/25 bg-black"}`}
                  initial={reduceMotion ? false : { opacity: 0.45 }}
                  animate={{ opacity: active ? 1 : 0.4 }}
                  transition={{
                    duration: 0.28,
                    delay: reduceMotion ? 0 : index * 0.02,
                    repeat: active && !reduceMotion ? Infinity : 0,
                    repeatType: "reverse",
                    repeatDelay: 1.8,
                  }}
                />
              );
            })}
          </div>
          <div className="grid gap-2 text-[10px] tracking-[0.15em] text-cyan-300 sm:grid-cols-3">
            <p className="border border-cyan-500/35 px-2 py-1">READINESS {readiness}%</p>
            <p className="border border-[#4b2a78] px-2 py-1 text-[#c7acff]">CONSISTENCY RISK {disciplineRisk}%</p>
            <p className="border border-[#7a2f35] px-2 py-1 text-[#ff8d97]">DECAY PRESSURE {decayPressure}%</p>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-3">
          <SignalMeter label={primaryLabel} value={primaryValuePct} hint={primaryHint} />
          <SignalMeter label="CONSISTENCY RISK" value={disciplineRiskPct} tone="purple" hint="COMPROMISED DAYS IN LAST 7 DAYS" />
          <SignalMeter label="DECAY PRESSURE" value={decayPressurePct} tone="red" hint="INACTIVE DAYS PAST GRACE WINDOW" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
          <RadialGauge label="READINESS" value={primaryValuePct} />
          <RadialGauge label="CONSISTENCY" value={disciplineRiskPct} tone="purple" />
          <RadialGauge label="DECAY" value={decayPressurePct} tone="red" />
        </div>
      </div>
      {disciplineStates ? <DisciplineHeatline states={disciplineStates} /> : null}
    </TacticalVisualPanel>
  );
}
