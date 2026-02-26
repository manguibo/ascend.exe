"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useUiPanelOpen } from "@/lib/system/use-ui-panel-open";

type CollapsiblePanelProps = {
  panelId: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
};

export function CollapsiblePanel({ panelId, title, children, defaultOpen = true, className }: CollapsiblePanelProps) {
  const { open, toggleOpen } = useUiPanelOpen(panelId, defaultOpen);

  return (
    <section className={`border border-cyan-500/50 bg-black font-mono ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-cyan-500/5"
      >
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">{title}</h2>
        <span className="text-xs tracking-[0.16em] text-cyan-300">{open ? "COLLAPSE" : "EXPAND"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
