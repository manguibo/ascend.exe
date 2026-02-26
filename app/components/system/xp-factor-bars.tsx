"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { XpFactor } from "@/lib/system/types";

type XpFactorBarsProps = {
  factors: readonly XpFactor[];
  maxScale?: number;
};

export function XpFactorBars({ factors, maxScale = 2 }: XpFactorBarsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-2">
      {factors.map((factor, index) => {
        const pct = Math.max(0, Math.min(100, Math.round((factor.value / maxScale) * 100)));

        return (
          <div key={factor.label} className="grid gap-1">
            <div className="flex items-center justify-between text-[10px] tracking-[0.15em] text-cyan-500/90">
              <span>{factor.label}</span>
              <span className="text-cyan-200">{factor.value.toFixed(2)}</span>
            </div>
            <div className="h-1.5 border border-cyan-500/30 bg-black">
              <motion.div
                className="h-full bg-cyan-400/80"
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: pct / 100 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.03 }}
                style={{ transformOrigin: "left center" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
