"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type TacticalVisualPanelProps = {
  title: string;
  children: ReactNode;
};

export function TacticalVisualPanel({ title, children }: TacticalVisualPanelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <article className="relative overflow-hidden border border-cyan-500/50 bg-black p-5 font-mono">
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,229,255,0.24)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.24)_1px,transparent_1px)] [background-size:22px_22px]" />
      {!reduceMotion ? (
        <motion.div
          aria-hidden
          className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
          animate={{ x: ["-130%", "420%"] }}
          transition={{ duration: 7, ease: "linear", repeat: Infinity }}
        />
      ) : null}
      <div className="relative z-10">
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">{title}</h2>
        <div className="mt-4 grid gap-3">{children}</div>
      </div>
    </article>
  );
}
