"use client";

import { motion } from "framer-motion";
import type { DisciplineState } from "@/lib/system/types";

type DisciplineHeatlineProps = {
  states: readonly DisciplineState[];
};

const stateToneClass: Record<DisciplineState, string> = {
  OPTIMAL: "bg-cyan-300/85",
  STABLE: "bg-cyan-400/65",
  DECLINING: "bg-[#8f6bff]/80",
  COMPROMISED: "bg-[#ff7d89]/85",
};

export function DisciplineHeatline({ states }: DisciplineHeatlineProps) {
  return (
    <div className="border border-cyan-500/35 bg-black/80 p-3 font-mono">
      <p className="text-[10px] tracking-[0.15em] text-cyan-500/90">CONSISTENCY TREND</p>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {states.map((state, index) => (
          <div key={`discipline-heat-${index + 1}`} className="grid gap-1">
            <motion.div
              className={`h-7 border border-cyan-500/25 ${stateToneClass[state]}`}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.03 }}
            />
            <p className="text-center text-[9px] tracking-[0.14em] text-cyan-500/80">{index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
