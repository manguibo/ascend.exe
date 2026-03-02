"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const CUTSCENE_MS = 3400;

const sequence = [
  { atMs: 250, text: "ASCEND.EXE // TACTICAL PERFORMANCE SYSTEM" },
  { atMs: 900, text: "AUTHENTICATING OPERATOR PROFILE" },
  { atMs: 1600, text: "SYNCING DISCIPLINE INDEX" },
  { atMs: 2300, text: "CALIBRATING READINESS TELEMETRY" },
  { atMs: 3000, text: "SYSTEM ONLINE" },
] as const;

export function SystemEntryCutscene() {
  const [active, setActive] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const startedAt = Date.now();
    const activate = window.setTimeout(() => {
      setActive(true);
    }, 0);
    const ticker = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 60);

    const done = window.setTimeout(() => {
      window.clearInterval(ticker);
      setElapsedMs(CUTSCENE_MS);
      setActive(false);
    }, CUTSCENE_MS);

    return () => {
      window.clearTimeout(activate);
      window.clearInterval(ticker);
      window.clearTimeout(done);
    };
  }, []);

  const progress = Math.min(100, Math.round((elapsedMs / CUTSCENE_MS) * 100));
  const visibleLines = useMemo(
    () => sequence.filter((item) => elapsedMs >= item.atMs).map((item) => item.text),
    [elapsedMs],
  );

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed inset-0 z-[90] bg-black"
        >
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,229,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.22)_1px,transparent_1px)] [background-size:22px_22px]" />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute top-0 h-[28%] w-full bg-gradient-to-b from-cyan-300/10 via-cyan-300/0 to-transparent"
            animate={{ y: ["-16%", "132%"] }}
            transition={{ duration: 1.25, ease: "linear", repeat: Infinity }}
          />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_92%,rgba(0,0,0,0.5)_100%)] bg-[length:100%_3px] opacity-35" />

          <section className="relative mx-auto flex h-full w-[min(96vw,860px)] flex-col justify-center px-5 py-8 text-cyan-200">
            <div className="ui-panel relative border-cyan-400/55 p-5 shadow-[0_0_34px_rgba(0,229,255,0.16)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] tracking-[0.2em] text-cyan-400">BOOT SEQUENCE</p>
                <button
                  type="button"
                  onClick={() => setActive(false)}
                  className="ui-focus-ring border border-cyan-400/35 px-2 py-1 text-[10px] tracking-[0.16em] text-cyan-200 transition-colors hover:bg-cyan-400/10"
                >
                  SKIP
                </button>
              </div>

              <div className="h-1.5 border border-cyan-400/40 bg-black">
                <motion.div
                  className="h-full bg-cyan-300/90"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.12, ease: "linear" }}
                />
              </div>
              <p className="mt-2 text-[10px] tracking-[0.16em] text-cyan-500/90">ENTRY CHECK {progress}%</p>

              <div className="mt-4 grid min-h-[168px] content-start gap-2 border border-cyan-500/25 bg-black/60 p-3">
                {visibleLines.map((line) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="text-xs tracking-[0.14em] text-cyan-100"
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            </div>
          </section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
