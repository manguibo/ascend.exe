"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type TacticalVisualPanelProps = {
  title: string;
  children: ReactNode;
};

export function TacticalVisualPanel({ title, children }: TacticalVisualPanelProps) {
  return (
    <article className="ui-panel relative overflow-hidden p-5 font-mono">
      <div className="ui-grid-overlay absolute inset-0 opacity-20" />
      <motion.div
        aria-hidden
        className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
        initial={false}
        animate={{ x: ["-130%", "420%"] }}
        transition={{ duration: 7, ease: "linear", repeat: Infinity }}
      />
      <div className="relative z-10">
        <h2 className="ui-panel-title">{title}</h2>
        <div className="mt-4 grid gap-3">{children}</div>
      </div>
    </article>
  );
}
