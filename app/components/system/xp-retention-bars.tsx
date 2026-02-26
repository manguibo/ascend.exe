"use client";

import { motion, useReducedMotion } from "framer-motion";

type XpRetentionBarsProps = {
  preDecayTotalXp: number;
  postDecayTotalXp: number;
  decayDeltaXp: number;
  retentionPct: number;
};

export function XpRetentionBars({ preDecayTotalXp, postDecayTotalXp, decayDeltaXp, retentionPct }: XpRetentionBarsProps) {
  const reduceMotion = useReducedMotion();
  const safePre = Math.max(1, preDecayTotalXp);
  const postPct = Math.max(0, Math.min(100, Math.round((postDecayTotalXp / safePre) * 100)));
  const deltaPct = Math.max(0, Math.min(100, 100 - postPct));

  return (
    <div className="border border-cyan-500/35 bg-black/80 p-4 font-mono">
      <div className="flex items-center justify-between text-[10px] tracking-[0.15em] text-cyan-500/90">
        <span>XP RETENTION</span>
        <span className="text-cyan-200">{retentionPct}%</span>
      </div>
      <div className="mt-3 grid gap-2">
        <div className="grid gap-1">
          <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-cyan-400/90">
            <span>POST-DECAY TOTAL</span>
            <span>{postDecayTotalXp}</span>
          </div>
          <div className="h-2 border border-cyan-500/30 bg-black">
            <motion.div
              className="h-full bg-cyan-400/80"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: postPct / 100 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ transformOrigin: "left center" }}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <div className="flex items-center justify-between text-[10px] tracking-[0.12em] text-cyan-400/90">
            <span>DECAY DELTA</span>
            <span>-{decayDeltaXp}</span>
          </div>
          <div className="h-2 border border-cyan-500/30 bg-black">
            <motion.div
              className="h-full bg-[#ff7d89]/80"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: deltaPct / 100 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
              style={{ transformOrigin: "left center" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
