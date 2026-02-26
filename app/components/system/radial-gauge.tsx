"use client";

import { motion, useReducedMotion } from "framer-motion";

type RadialGaugeTone = "cyan" | "purple" | "red";

type RadialGaugeProps = {
  label: string;
  value: number;
  tone?: RadialGaugeTone;
};

const toneClass: Record<RadialGaugeTone, string> = {
  cyan: "stroke-cyan-300",
  purple: "stroke-[#b08cff]",
  red: "stroke-[#ff8d97]",
};

export function RadialGauge({ label, value, tone = "cyan" }: RadialGaugeProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="border border-cyan-500/35 bg-black/80 px-3 py-2 font-mono">
      <p className="text-[10px] tracking-[0.15em] text-cyan-500/90">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(0,229,255,0.2)" strokeWidth="4" />
          <motion.circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            strokeWidth="4"
            className={toneClass[tone]}
            strokeDasharray={circumference}
            initial={reduceMotion ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <p className="text-sm text-cyan-200">{clamped}%</p>
      </div>
    </div>
  );
}
