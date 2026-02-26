"use client";

import { motion } from "framer-motion";

type SignalMeterTone = "cyan" | "purple" | "red";

type SignalMeterProps = {
  label: string;
  value: number;
  hint?: string;
  tone?: SignalMeterTone;
};

const toneClass: Record<SignalMeterTone, string> = {
  cyan: "bg-cyan-400/85",
  purple: "bg-[#8f6bff]/85",
  red: "bg-[#ff7d89]/85",
};

export function SignalMeter({ label, value, hint, tone = "cyan" }: SignalMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-[11px] tracking-[0.16em] text-cyan-400/95">
        <span>{label}</span>
        <span className="text-cyan-200">{clamped}%</span>
      </div>
      <div className="h-2 border border-cyan-500/40 bg-black">
        <motion.div
          className={`h-full ${toneClass[tone]}`}
          initial={false}
          animate={{ scaleX: clamped / 100 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        />
      </div>
      {hint ? <p className="text-[10px] tracking-[0.12em] text-cyan-500/85">{hint}</p> : null}
    </div>
  );
}
