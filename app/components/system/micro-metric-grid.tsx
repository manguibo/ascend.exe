"use client";

import { motion, useReducedMotion } from "framer-motion";

export type MicroMetricItem = {
  label: string;
  value: string;
  tone?: "default" | "subtle" | "purple" | "red";
};

type MicroMetricGridProps = {
  items: readonly MicroMetricItem[];
  columns?: 2 | 3 | 4;
};

const toneClass: Record<NonNullable<MicroMetricItem["tone"]>, string> = {
  default: "border-cyan-500/40 text-cyan-200",
  subtle: "border-cyan-700/60 text-cyan-300/90",
  purple: "border-[#4b2a78] text-[#d1bbff]",
  red: "border-[#7a2f35] text-[#ff9aa4]",
};

const columnClass: Record<NonNullable<MicroMetricGridProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function MicroMetricGrid({ items, columns = 2 }: MicroMetricGridProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`grid gap-2 ${columnClass[columns]}`}>
      {items.map((item, index) => {
        const tone = item.tone ?? "default";
        return (
          <motion.article
            key={`${item.label}-${index}`}
            className={`border bg-black/70 p-3 ${toneClass[tone]}`}
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.02 }}
          >
            <p className="text-[10px] tracking-[0.17em] text-cyan-500/85">{item.label}</p>
            <p className="mt-1 text-sm tracking-[0.04em]">{item.value}</p>
          </motion.article>
        );
      })}
    </div>
  );
}
