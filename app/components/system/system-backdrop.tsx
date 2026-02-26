"use client";

import { motion } from "framer-motion";

export function SystemBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(0,229,255,0.09),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(127,90,240,0.07),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(0,229,255,0.05),transparent_42%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,229,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />
      <motion.div
        className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent motion-reduce:hidden"
        animate={{ x: ["0%", "380%"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}
