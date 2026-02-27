"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BodyRecoveryView, BodyRegionSignal, BodyRegionInsight } from "@/lib/system/body-recovery";
import { deriveAvatarMorphParams } from "@/lib/system/avatar-profile";
import { buildAvatarRigGeometry } from "@/lib/system/avatar-rig";
import type { SessionLogInput } from "@/lib/system/session-state";
import { MicroMetricGrid } from "./micro-metric-grid";

type BodyRecoveryDiagramProps = {
  view: BodyRecoveryView;
  insights?: Record<string, BodyRegionInsight>;
  activityCodename?: string;
  input: SessionLogInput;
};

type RegionGeometry = {
  id: BodyRegionSignal["id"];
  path: string;
  focus: { x: number; y: number };
};

const statusZoneClass: Record<BodyRegionSignal["status"], string> = {
  READY: "fill-transparent stroke-cyan-300/95",
  MONITOR: "fill-transparent stroke-[#d1bbff]/95",
  RECOVER: "fill-transparent stroke-[#ff9aa4]/95",
};

const statusGlowClass: Record<BodyRegionSignal["status"], string> = {
  READY: "fill-transparent stroke-cyan-300/45",
  MONITOR: "fill-transparent stroke-[#d1bbff]/45",
  RECOVER: "fill-transparent stroke-[#ff9aa4]/45",
};

const rigToneClass: Record<"shell" | "core" | "limb", string> = {
  shell: "fill-transparent stroke-cyan-400/55",
  core: "fill-transparent stroke-[#d1bbff]/70",
  limb: "fill-transparent stroke-cyan-300/40",
};

const regionGeometry: readonly RegionGeometry[] = [
  { id: "SHOULDERS", path: "M386 136 C404 122 496 122 514 136 C506 150 394 150 386 136 Z", focus: { x: 450, y: 140 } },
  { id: "CHEST", path: "M406 170 C424 158 476 158 494 170 C488 198 472 226 450 238 C428 226 412 198 406 170 Z", focus: { x: 450, y: 198 } },
  { id: "BACK", path: "M408 170 C426 158 474 158 492 170 C486 204 470 232 450 244 C430 232 414 204 408 170 Z", focus: { x: 450, y: 204 } },
  {
    id: "ARMS",
    path: "M360 178 C370 164 384 162 394 176 C400 214 403 254 405 292 C399 310 392 324 382 332 C372 330 366 320 364 304 C360 262 358 218 360 178 Z M540 178 C542 218 540 262 536 304 C534 320 528 330 518 332 C508 324 501 310 495 292 C497 254 500 214 506 176 C516 162 530 164 540 178 Z",
    focus: { x: 548, y: 248 },
  },
  { id: "CORE", path: "M416 252 C430 242 470 242 484 252 C482 290 468 336 450 356 C432 336 418 290 416 252 Z", focus: { x: 450, y: 304 } },
  { id: "GLUTES", path: "M420 314 C434 304 466 304 480 314 C478 338 466 360 450 372 C434 360 422 338 420 314 Z", focus: { x: 450, y: 342 } },
  {
    id: "QUADS",
    path: "M426 336 C434 330 442 332 446 344 C446 382 444 430 438 468 C432 472 426 468 424 456 C422 420 422 370 426 336 Z M456 344 C460 332 468 330 476 336 C480 370 480 420 478 456 C476 468 470 472 464 468 C458 430 456 382 456 344 Z",
    focus: { x: 468, y: 404 },
  },
  {
    id: "HAMSTRINGS",
    path: "M428 440 C434 436 440 440 442 450 C440 474 438 498 432 508 C426 500 426 474 428 440 Z M458 450 C460 440 466 436 472 440 C474 474 474 500 468 508 C462 498 460 474 458 450 Z",
    focus: { x: 468, y: 472 },
  },
];

const frontRegions: readonly BodyRegionSignal["id"][] = ["SHOULDERS", "CHEST", "ARMS", "CORE", "QUADS"];
const backRegions: readonly BodyRegionSignal["id"][] = ["SHOULDERS", "BACK", "ARMS", "GLUTES", "HAMSTRINGS"];

type RecoveryRoute = {
  route: string;
  rationale: string;
  steps: readonly string[];
};

function buildRecoveryRoute(region: BodyRegionSignal, activityCodename?: string): RecoveryRoute {
  const context = activityCodename ? `for ${activityCodename}` : "for current activity";
  if (region.status === "RECOVER" || (region.loadPct >= 75 && region.recoveryPct <= 60)) {
    return {
      route: "DELOAD + ACTIVE RECOVERY",
      rationale: `${region.label} is under high stress ${context}. Priority is tissue recovery before progression.`,
      steps: ["Reduce direct loading for 24-48h.", "Use light mobility and blood-flow work.", "Sleep and hydration compliance at high priority."],
    };
  }

  if (region.status === "MONITOR" || region.loadPct >= 60) {
    return {
      route: "CONTROLLED LOAD + MONITORING",
      rationale: `${region.label} is trainable but carrying medium stress ${context}. Progress with controlled volume.`,
      steps: ["Maintain moderate intensity and reduce failure sets.", "Add mobility between sets for this region.", "Recheck readiness trend after next logged session."],
    };
  }

  return {
    route: "PROGRESSIVE OVERLOAD WINDOW",
    rationale: `${region.label} is in a ready state ${context}. You can increase stimulus safely with control.`,
    steps: ["Increase load or volume by 5-10%.", "Keep warm-up and activation specific to this region.", "Track next-session readiness to confirm adaptation."],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function BodyRecoveryDiagram({ view, insights = {}, activityCodename, input }: BodyRecoveryDiagramProps) {
  const [surface, setSurface] = useState<"FRONT" | "BACK">("FRONT");
  const [hoveredRegionId, setHoveredRegionId] = useState<BodyRegionSignal["id"] | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionSignal["id"] | null>(null);

  const byId = new Map(view.regions.map((region) => [region.id, region]));
  const morph = useMemo(() => deriveAvatarMorphParams(input, view, null), [input, view]);
  const rig = useMemo(() => buildAvatarRigGeometry(morph, surface), [morph, surface]);
  const visibleRegionSet = useMemo(() => new Set(surface === "FRONT" ? frontRegions : backRegions), [surface]);
  const visibleRegions = useMemo(() => view.regions.filter((region) => visibleRegionSet.has(region.id)), [view.regions, visibleRegionSet]);
  const activeRegionId = selectedRegionId ?? hoveredRegionId ?? visibleRegions[0]?.id ?? null;
  const selectedRegion = selectedRegionId ? byId.get(selectedRegionId) ?? null : null;
  const selectedInsight = selectedRegionId ? insights[selectedRegionId] : undefined;
  const selectedRoute = selectedRegion ? buildRecoveryRoute(selectedRegion, activityCodename) : null;

  const cameraTransform = useMemo(() => {
    if (!selectedRegionId) {
      return { x: 0, y: 0, scale: 1 };
    }
    const target = regionGeometry.find((item) => item.id === selectedRegionId)?.focus;
    if (!target) {
      return { x: 0, y: 0, scale: 1 };
    }
    return {
      x: (450 - target.x) * 0.95,
      y: (268 - target.y) * 0.95,
      scale: 1.52,
    };
  }, [selectedRegionId]);

  const baseWidthScale = clamp((morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 0.98, 0.72, 1.34);
  const baseHeightScale = clamp((morph.legScale * 0.52 + morph.torsoScale * 0.48) * 0.98, 0.76, 1.34);

  const getRegionTransform = (regionId: BodyRegionSignal["id"]) => {
    const cx = 450;
    const cy = 270;
    const postureShiftX = morph.postureLeanDeg * 0.55;

    if (regionId === "SHOULDERS") {
      return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${morph.shoulderScale} ${morph.torsoScale}) translate(${-cx} ${-cy})`;
    }
    if (regionId === "CHEST" || regionId === "BACK") {
      return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${(morph.shoulderScale + morph.waistScale) / 2} ${morph.torsoScale}) translate(${-cx} ${-cy})`;
    }
    if (regionId === "ARMS") {
      return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${morph.armScale} ${morph.torsoScale}) translate(${-cx} ${-cy})`;
    }
    if (regionId === "CORE") {
      return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${morph.waistScale} ${morph.torsoScale}) translate(${-cx} ${-cy})`;
    }
    if (regionId === "GLUTES") {
      return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${morph.hipScale} ${morph.torsoScale}) translate(${-cx} ${-cy})`;
    }
    return `translate(${postureShiftX} 0) translate(${cx} ${cy}) scale(${morph.legScale} ${morph.legScale}) translate(${-cx} ${-cy})`;
  };

  return (
    <section className="border border-cyan-500/50 bg-black p-4 font-mono sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">INTERACTIVE BODY AVATAR</h2>
        <div className="flex items-center gap-2">
          <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">PROFILE {view.profile}</p>
          <button
            type="button"
            onClick={() => setSurface("FRONT")}
            className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${surface === "FRONT" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}
          >
            FRONT
          </button>
          <button
            type="button"
            onClick={() => setSurface("BACK")}
            className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${surface === "BACK" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}
          >
            BACK
          </button>
          {selectedRegionId ? (
            <button
              type="button"
              onClick={() => setSelectedRegionId(null)}
              className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300"
            >
              RESET VIEW
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border border-cyan-500/30 p-2">
        <div className="relative h-[560px] w-full overflow-hidden border border-cyan-500/20 [perspective:1400px]">
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={{
              rotateY: [-3.4, 3.6, -3.4],
              rotateX: [1.8, -1.2, 1.8],
              y: [0, -4, 0],
            }}
            transition={{ duration: 7.2, ease: "easeInOut", repeat: Infinity }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <motion.div
              className="absolute inset-0"
              initial={false}
              animate={{ x: cameraTransform.x, y: cameraTransform.y, scale: cameraTransform.scale }}
              transition={{ duration: 0.36, ease: "easeOut" }}
            >
              <svg viewBox="0 0 900 520" className="h-full w-full">
                <defs>
                  <radialGradient id="avatar-body-glow" cx="50%" cy="46%" r="55%">
                    <stop offset="0%" stopColor="rgba(0,229,255,0.2)" />
                    <stop offset="100%" stopColor="rgba(0,229,255,0.02)" />
                  </radialGradient>
                  <filter id="avatar-outline-glow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="1.8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect x="323" y="56" width="254" height="452" fill="url(#avatar-body-glow)" opacity="0.88" />
                <motion.circle
                  cx="450"
                  cy="254"
                  r="118"
                  fill="none"
                  stroke="rgba(0,229,255,0.22)"
                  strokeWidth="1"
                  initial={false}
                  animate={{ scale: [1, 1.025, 1], opacity: [0.55, 0.8, 0.55] }}
                  transition={{ duration: 3.4, ease: "easeInOut", repeat: Infinity }}
                />
                <motion.circle
                  cx="450"
                  cy="254"
                  r="132"
                  fill="none"
                  stroke="rgba(209,187,255,0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 5"
                  initial={false}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 16, ease: "linear", repeat: Infinity }}
                  style={{ transformOrigin: "450px 254px" }}
                />

                <g transform={`translate(${morph.postureLeanDeg * 0.8} 0) translate(450 282) scale(${baseWidthScale} ${baseHeightScale}) translate(-450 -282)`}>
                  <path d={rig.shellPath} fill="rgba(0,229,255,0.05)" stroke="rgba(120,230,255,0.5)" strokeWidth="1.3" />
                  <path d={rig.shellPath} fill="none" stroke="rgba(209,187,255,0.24)" strokeWidth="4" filter="url(#avatar-outline-glow)" />
                  {rig.segments.map((segment) => (
                    <path key={`rig-${segment.id}`} d={segment.d} className={rigToneClass[segment.tone]} strokeWidth={segment.width} filter="url(#avatar-outline-glow)" />
                  ))}
                </g>

                {regionGeometry.map((item, index) => {
                  const region = byId.get(item.id);
                  if (!region || !visibleRegionSet.has(item.id)) return null;
                  const isActive = activeRegionId === item.id;
                  return (
                    <g key={`region-${item.id}`}>
                      <motion.path
                        d={item.path}
                        className={statusGlowClass[region.status]}
                        strokeWidth="4"
                        filter="url(#avatar-outline-glow)"
                        transform={getRegionTransform(item.id)}
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      />
                      <motion.path
                        d={item.path}
                        className={statusZoneClass[region.status]}
                        strokeWidth={isActive ? "2.2" : "1.5"}
                        transform={getRegionTransform(item.id)}
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        onMouseEnter={() => setHoveredRegionId(item.id)}
                        onMouseLeave={() => setHoveredRegionId((current) => (current === item.id ? null : current))}
                        onClick={() => setSelectedRegionId((current) => (current === item.id ? null : item.id))}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedRegionId((current) => (current === item.id ? null : item.id));
                          }
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            </motion.div>
          </motion.div>
        </div>
        <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-500/85">CLICK A MUSCLE REGION TO ZOOM | CYAN READY | PURPLE MONITOR | RED RECOVER</p>
      </div>

      <AnimatePresence>
        {selectedRegion && selectedRoute ? (
          <motion.aside
            key={`muscle-window-${selectedRegion.id}`}
            initial={false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 w-[min(92vw,460px)] overflow-hidden border border-cyan-500/50 bg-black/95 p-3 font-mono shadow-[0_0_22px_rgba(0,229,255,0.14)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(0,229,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] tracking-[0.15em] text-cyan-500">TARGETED MUSCLE INTERFACE</p>
                <button
                  type="button"
                  onClick={() => setSelectedRegionId(null)}
                  className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300"
                >
                  CLOSE
                </button>
              </div>
              <p className="mt-2 text-xs tracking-[0.14em] text-cyan-200">
                TARGET {selectedRegion.label} | ACTIVITY {activityCodename ?? "CURRENT ACTIVITY"}
              </p>
              <p className="mt-1 text-[11px] text-cyan-300/90">
                STRESS {selectedRegion.loadPct}% | READINESS {selectedRegion.readinessPct}% | RECOVERY {selectedRegion.recoveryPct}%
              </p>
              <p className="mt-1 text-[11px] text-cyan-500/90">
                TREND {selectedInsight?.deltaPct && selectedInsight.deltaPct > 0 ? "+" : ""}
                {selectedInsight?.deltaPct ?? 0}% | ETA {selectedInsight?.etaDays ?? "-"} DAY(S)
              </p>
              <p className="mt-2 text-xs tracking-[0.14em] text-cyan-100">{selectedRoute.route}</p>
              <p className="mt-1 text-[11px] text-cyan-300/85">{selectedRoute.rationale}</p>
              <ul className="mt-2 grid gap-1 text-[11px] text-cyan-300/85">
                {selectedRoute.steps.map((step) => (
                  <li key={`${selectedRegion.id}-${step}`} className="border border-cyan-500/25 px-2 py-1">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <div className="mt-4">
        <MicroMetricGrid
          columns={4}
          items={[
            { label: "HEIGHT", value: `${input.heightCm} CM` },
            { label: "BODY WEIGHT", value: `${view.development.bodyWeightKg} KG` },
            { label: "TARGET WEIGHT", value: `${view.development.targetWeightKg} KG`, tone: "subtle" },
            { label: "WEIGHT DELTA", value: `${view.development.weightDeltaKg > 0 ? "+" : ""}${view.development.weightDeltaKg} KG`, tone: "subtle" },
            { label: "DEVELOPMENT", value: view.development.status, tone: view.development.status === "DEGRADED" ? "red" : "purple" },
            { label: "COMPOSITION", value: `${view.development.compositionPct}%` },
            { label: "STRENGTH", value: `${view.development.strengthPct}%` },
            { label: "CONDITIONING", value: `${view.development.conditioningPct}%` },
            { label: "AVATAR WIDTH", value: `${Math.round(baseWidthScale * 100)}%`, tone: "subtle" },
            { label: "AVATAR HEIGHT", value: `${Math.round(baseHeightScale * 100)}%`, tone: "subtle" },
            { label: "AVATAR CONFIDENCE", value: `${Math.round(morph.confidencePct)}%`, tone: "subtle" },
          ]}
        />
      </div>
    </section>
  );
}
