"use client";

import { motion } from "framer-motion";

type MiniMeterTone = "cyan" | "purple" | "red";

type MiniMeterProps = {
  label: string;
  value: number;
  tone?: MiniMeterTone;
};

const toneClass: Record<MiniMeterTone, string> = {
  cyan: "bg-cyan-300/85",
  purple: "bg-[#b08cff]/85",
  red: "bg-[#ff8d97]/85",
};

export function MiniMeter({ label, value, tone = "cyan" }: MiniMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="border border-cyan-500/35 bg-black/80 px-3 py-2 font-mono">
      <div className="flex items-center justify-between text-[10px] tracking-[0.14em] text-cyan-500/90">
        <span>{label}</span>
        <span className="text-cyan-200">{clamped}%</span>
      </div>
      <div className="mt-1 h-1.5 border border-cyan-500/30 bg-black">
        <motion.div
          className={`h-full ${toneClass[tone]}`}
          initial={false}
          animate={{ scaleX: clamped / 100 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        />
      </div>
    </div>
  );
}
