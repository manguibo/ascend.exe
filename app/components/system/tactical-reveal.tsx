"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type TacticalRevealProps = {
  children: ReactNode;
  delay?: number;
};

export function TacticalReveal({ children, delay = 0 }: TacticalRevealProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
