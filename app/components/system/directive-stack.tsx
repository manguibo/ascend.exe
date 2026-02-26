"use client";

import { motion, useReducedMotion } from "framer-motion";

type DirectiveStackProps = {
  directives: readonly string[];
  showIndex?: boolean;
};

export function DirectiveStack({ directives, showIndex = true }: DirectiveStackProps) {
  const reduceMotion = useReducedMotion();

  return (
    <ul className="grid gap-2">
      {directives.map((directive, index) => {
        const body = (
          <li key={directive} className="flex items-start gap-2 border border-cyan-500/30 px-3 py-2 text-sm text-cyan-200">
            {showIndex ? (
              <span className="mt-[2px] border border-cyan-500/40 px-2 py-[1px] text-[10px] tracking-[0.16em] text-cyan-500/90">
                D-{index + 1}
              </span>
            ) : null}
            <span>{directive}</span>
          </li>
        );

        if (reduceMotion) {
          return body;
        }

        return (
          <motion.li
            key={directive}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.04 }}
            className="flex items-start gap-2 border border-cyan-500/30 px-3 py-2 text-sm text-cyan-200"
          >
            {showIndex ? (
              <span className="mt-[2px] border border-cyan-500/40 px-2 py-[1px] text-[10px] tracking-[0.16em] text-cyan-500/90">
                D-{index + 1}
              </span>
            ) : null}
            <span>{directive}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
