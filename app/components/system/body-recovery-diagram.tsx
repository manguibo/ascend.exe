"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BodyRecoveryView, BodyRegionSignal, BodyRegionInsight } from "@/lib/system/body-recovery";
import { MicroMetricGrid } from "./micro-metric-grid";

type BodyRecoveryDiagramProps = {
  view: BodyRecoveryView;
  insights?: Record<string, BodyRegionInsight>;
};

type RegionGeometry = {
  id: BodyRegionSignal["id"];
  path: string;
  anchor: { x: number; y: number };
  callout: { x: number; y: number; side: "left" | "right" };
};

type CalibrationState = Record<
  BodyRegionSignal["id"],
  { anchor: { x: number; y: number }; callout: { x: number; y: number; side: "left" | "right" } }
>;

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

const statusCalloutClass: Record<BodyRegionSignal["status"], string> = {
  READY: "fill-cyan-950/55 stroke-cyan-300/90",
  MONITOR: "fill-[#140c24]/75 stroke-[#c7acff]/90",
  RECOVER: "fill-[#20090c]/75 stroke-[#ff9aa4]/90",
};

const regionGeometry: readonly RegionGeometry[] = [
  {
    id: "SHOULDERS",
    path: "M386 136 C404 122 496 122 514 136 C506 150 394 150 386 136 Z",
    anchor: { x: 450, y: 136 },
    callout: { x: 120, y: 94, side: "left" },
  },
  {
    id: "CHEST",
    path: "M406 170 C424 158 476 158 494 170 C488 198 472 226 450 238 C428 226 412 198 406 170 Z",
    anchor: { x: 450, y: 198 },
    callout: { x: 120, y: 156, side: "left" },
  },
  {
    id: "BACK",
    path: "M408 170 C426 158 474 158 492 170 C486 204 470 232 450 244 C430 232 414 204 408 170 Z",
    anchor: { x: 450, y: 202 },
    callout: { x: 120, y: 218, side: "left" },
  },
  {
    id: "ARMS",
    path: "M360 178 C370 164 384 162 394 176 C400 214 403 254 405 292 C399 310 392 324 382 332 C372 330 366 320 364 304 C360 262 358 218 360 178 Z M540 178 C542 218 540 262 536 304 C534 320 528 330 518 332 C508 324 501 310 495 292 C497 254 500 214 506 176 C516 162 530 164 540 178 Z",
    anchor: { x: 548, y: 248 },
    callout: { x: 628, y: 156, side: "right" },
  },
  {
    id: "CORE",
    path: "M416 252 C430 242 470 242 484 252 C482 290 468 336 450 356 C432 336 418 290 416 252 Z",
    anchor: { x: 450, y: 304 },
    callout: { x: 120, y: 280, side: "left" },
  },
  {
    id: "GLUTES",
    path: "M420 314 C434 304 466 304 480 314 C478 338 466 360 450 372 C434 360 422 338 420 314 Z",
    anchor: { x: 450, y: 342 },
    callout: { x: 628, y: 220, side: "right" },
  },
  {
    id: "QUADS",
    path: "M426 336 C434 330 442 332 446 344 C446 382 444 430 438 468 C432 472 426 468 424 456 C422 420 422 370 426 336 Z M456 344 C460 332 468 330 476 336 C480 370 480 420 478 456 C476 468 470 472 464 468 C458 430 456 382 456 344 Z",
    anchor: { x: 468, y: 404 },
    callout: { x: 628, y: 284, side: "right" },
  },
  {
    id: "HAMSTRINGS",
    path: "M428 440 C434 436 440 440 442 450 C440 474 438 498 432 508 C426 500 426 474 428 440 Z M458 450 C460 440 466 436 472 440 C474 474 474 500 468 508 C462 498 460 474 458 450 Z",
    anchor: { x: 468, y: 472 },
    callout: { x: 628, y: 348, side: "right" },
  },
];

const frontRegions: readonly BodyRegionSignal["id"][] = ["SHOULDERS", "CHEST", "ARMS", "CORE", "QUADS"];
const backRegions: readonly BodyRegionSignal["id"][] = ["SHOULDERS", "BACK", "ARMS", "GLUTES", "HAMSTRINGS"];
const CALIBRATION_STORAGE_KEY = "ascend.body.map.calibration.v1";
const calibrationEnabled = process.env.NEXT_PUBLIC_ENABLE_CALIBRATION === "1";

function buildCalibrationStateFromGeometry(): CalibrationState {
  return Object.fromEntries(
    regionGeometry.map((region) => [
      region.id,
      {
        anchor: { ...region.anchor },
        callout: { ...region.callout },
      },
    ]),
  ) as CalibrationState;
}

export function BodyRecoveryDiagram({ view, insights = {} }: BodyRecoveryDiagramProps) {
  const reduceMotion = useReducedMotion();
  const [surface, setSurface] = useState<"FRONT" | "BACK">("FRONT");
  const [hoveredRegionId, setHoveredRegionId] = useState<BodyRegionSignal["id"] | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionSignal["id"] | null>(null);
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [calibration, setCalibration] = useState<CalibrationState>(() => {
    const baseline = buildCalibrationStateFromGeometry();
    if (typeof window === "undefined") {
      return baseline;
    }

    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) {
      return baseline;
    }

    try {
      const parsed = JSON.parse(raw) as CalibrationState;
      return parsed && typeof parsed === "object" ? parsed : baseline;
    } catch {
      return baseline;
    }
  });
  const [assetFallbackStage, setAssetFallbackStage] = useState<{ front: 0 | 1; back: 0 | 1 | 2 }>({ front: 0, back: 0 });
  const byId = new Map(view.regions.map((region) => [region.id, region]));
  const visibleRegions = useMemo(() => (surface === "FRONT" ? new Set(frontRegions) : new Set(backRegions)), [surface]);
  const frontAsset = assetFallbackStage.front === 0 ? "/anatomy/body-front.png" : "/anatomy/cyber-humanoid-front.svg";
  const backAsset =
    assetFallbackStage.back === 0
      ? "/anatomy/body-back.png"
      : assetFallbackStage.back === 1
        ? "/anatomy/body-front.png"
        : "/anatomy/cyber-humanoid-back.svg";
  const visibleRegionList = useMemo(
    () => view.regions.filter((region) => visibleRegions.has(region.id)),
    [view.regions, visibleRegions],
  );
  const activeRegionId = selectedRegionId ?? hoveredRegionId ?? visibleRegionList[0]?.id ?? null;
  const activeRegion = activeRegionId ? byId.get(activeRegionId) ?? null : null;
  const activeInsight = activeRegionId ? insights[activeRegionId] : undefined;

  const nudgeCalibration = (target: "anchor" | "callout", axis: "x" | "y", direction: -1 | 1) => {
    if (!activeRegionId) return;
    setCalibration((current) => {
      const entry = current[activeRegionId];
      if (!entry) return current;
      const delta = direction * 2;
      const next = {
        ...current,
        [activeRegionId]: {
          ...entry,
          [target]: {
            ...entry[target],
            [axis]: entry[target][axis] + delta,
          },
        },
      };
      return next;
    });
  };

  const saveCalibration = () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(calibration));
  };

  const resetCalibration = () => {
    const baseline = buildCalibrationStateFromGeometry();
    setCalibration(baseline);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    }
  };

  const exportCalibration = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(JSON.stringify(calibration, null, 2));
  };

  return (
    <section className="border border-cyan-500/50 bg-black p-4 font-mono sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">BODY READINESS MAP</h2>
        <div className="flex items-center gap-2">
          <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">PROFILE {view.profile}</p>
          {calibrationEnabled ? (
            <button
              type="button"
              onClick={() => setCalibrationMode((current) => !current)}
              className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${calibrationMode ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}
            >
              CALIBRATION
            </button>
          ) : null}
          <button type="button" onClick={() => setSurface("FRONT")} className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${surface === "FRONT" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}>
            FRONT
          </button>
          <button type="button" onClick={() => setSurface("BACK")} className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${surface === "BACK" ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300"}`}>
            BACK
          </button>
        </div>
      </div>

      <div className="mt-4 border border-cyan-500/30 p-2">
        <div className="overflow-x-auto">
          <svg viewBox="0 0 900 520" className="h-auto min-w-[760px] w-full">
            <defs>
              <radialGradient id="body-glow" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="rgba(0,229,255,0.22)" />
                <stop offset="100%" stopColor="rgba(0,229,255,0.02)" />
              </radialGradient>
              <filter id="region-outline-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Calibrated frame for portrait anatomy assets (~0.56 aspect ratio). */}
            <rect x="323" y="56" width="254" height="452" fill="url(#body-glow)" opacity="0.85" />
            <rect x="0" y="0" width="900" height="520" fill="transparent" />
            <image
              x="323"
              y="56"
              width="254"
              height="452"
              href={surface === "FRONT" ? frontAsset : backAsset}
              preserveAspectRatio="xMidYMid meet"
              onError={() => {
                setAssetFallbackStage((current) => {
                  if (surface === "FRONT") {
                    return current.front === 0 ? { ...current, front: 1 } : current;
                  }

                  if (current.back === 0) return { ...current, back: 1 };
                  if (current.back === 1) return { ...current, back: 2 };
                  return current;
                });
              }}
            />
            <circle cx="450" cy="254" r="120" fill="none" stroke="rgba(255,107,132,0.18)" strokeWidth="1" />
            <circle cx="450" cy="254" r="132" fill="none" stroke="rgba(0,229,255,0.16)" strokeWidth="1" strokeDasharray="3 4" />

            {regionGeometry.map((item, index) => {
              const region = byId.get(item.id);
              if (!region || !visibleRegions.has(item.id)) return null;
              const adjusted = calibration[item.id];
              const calloutW = 236;
              const calloutH = 48;
              const calloutX = adjusted?.callout.x ?? item.callout.x;
              const calloutY = adjusted?.callout.y ?? item.callout.y;
              const calloutSide = adjusted?.callout.side ?? item.callout.side;
              const anchorX = adjusted?.anchor.x ?? item.anchor.x;
              const anchorY = adjusted?.anchor.y ?? item.anchor.y;
              const connectorMidX = calloutSide === "left" ? calloutX + calloutW + 14 : calloutX - 14;
              const connectorEndX = calloutSide === "left" ? calloutX + calloutW : calloutX;
              const connectorY = calloutY + calloutH / 2;
              const isActive = activeRegionId === item.id;

              return (
                <g key={`body-region-${item.id}`}>
                  <motion.path
                    d={item.path}
                    className={statusGlowClass[region.status]}
                    strokeWidth="4"
                    filter="url(#region-outline-glow)"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.03 }}
                  />
                  <motion.path
                    d={item.path}
                    className={statusZoneClass[region.status]}
                    strokeWidth={isActive ? "2.1" : "1.5"}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.03 }}
                    onMouseEnter={() => setHoveredRegionId(item.id)}
                    onMouseLeave={() => setHoveredRegionId((current) => (current === item.id ? null : current))}
                    onClick={() => setSelectedRegionId(item.id)}
                  />
                  <polyline points={`${anchorX},${anchorY} ${connectorMidX},${connectorY} ${connectorEndX},${connectorY}`} fill="none" stroke="rgba(0,229,255,0.55)" strokeWidth="1" strokeDasharray="3 3" className="hidden md:block" />
                  {calibrationMode ? <circle cx={anchorX} cy={anchorY} r="3" fill="rgba(0,229,255,0.85)" className="hidden md:block" /> : null}
                  <circle cx={anchorX} cy={anchorY} r="11" fill="transparent" className="cursor-pointer" onClick={() => setSelectedRegionId(item.id)} />
                  {calibrationMode ? <circle cx={calloutX + (calloutSide === "left" ? calloutW : 0)} cy={connectorY} r="3" fill="rgba(0,229,255,0.85)" className="hidden md:block" /> : null}
                  <rect x={calloutX} y={calloutY} width={calloutW} height={calloutH} className={`${statusCalloutClass[region.status]} hidden md:block`} strokeWidth="1.1" />
                  <text x={calloutX + 10} y={calloutY + 17} fill="rgba(0,229,255,0.95)" fontSize="10" letterSpacing="2" className="hidden md:block">
                    {region.label}
                  </text>
                  <text x={calloutX + 10} y={calloutY + 32} fill="rgba(180,244,255,0.95)" fontSize="10" letterSpacing="1" className="hidden md:block">
                    RDY {region.readinessPct}% | LOAD {region.loadPct}% | REC {region.recoveryPct}%
                  </text>
                  <text x={calloutX + calloutW - 10} y={calloutY + 17} fill="rgba(0,229,255,0.9)" fontSize="10" textAnchor="end" letterSpacing="1" className="hidden md:block">
                    {region.status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-500/85">Cyan = READY | Purple = MONITOR | Red = RECOVER</p>

        {activeRegion ? (
          <article className="mt-3 border border-cyan-500/40 bg-black/80 p-3 md:hidden">
            <p className="text-xs tracking-[0.16em] text-cyan-200">{activeRegion.label} | {activeRegion.status}</p>
            <p className="mt-1 text-[11px] text-cyan-300/90">
              READINESS {activeRegion.readinessPct}% | LOAD {activeRegion.loadPct}% | RECOVERY {activeRegion.recoveryPct}%
            </p>
            <p className="mt-1 text-[11px] text-cyan-500/90">
              TREND {activeInsight?.deltaPct && activeInsight.deltaPct > 0 ? "+" : ""}{activeInsight?.deltaPct ?? 0}% | ETA {activeInsight?.etaDays ?? "-"} DAY(S)
            </p>
          </article>
        ) : null}

        {calibrationEnabled && calibrationMode && activeRegion ? (
          <section className="mt-3 border border-cyan-500/35 p-3">
            <p className="text-[10px] tracking-[0.15em] text-cyan-500">CALIBRATION: {activeRegion.label}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <p className="text-[10px] tracking-[0.14em] text-cyan-300">ANCHOR</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => nudgeCalibration("anchor", "x", -1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">X-</button>
                  <button type="button" onClick={() => nudgeCalibration("anchor", "x", 1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">X+</button>
                  <button type="button" onClick={() => nudgeCalibration("anchor", "y", -1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">Y-</button>
                  <button type="button" onClick={() => nudgeCalibration("anchor", "y", 1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">Y+</button>
                </div>
              </div>
              <div className="grid gap-1">
                <p className="text-[10px] tracking-[0.14em] text-cyan-300">CALLOUT</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => nudgeCalibration("callout", "x", -1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">X-</button>
                  <button type="button" onClick={() => nudgeCalibration("callout", "x", 1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">X+</button>
                  <button type="button" onClick={() => nudgeCalibration("callout", "y", -1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">Y-</button>
                  <button type="button" onClick={() => nudgeCalibration("callout", "y", 1)} className="border border-cyan-500/40 px-2 py-1 text-[10px]">Y+</button>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={saveCalibration} className="border border-cyan-500/40 px-3 py-1 text-[10px] tracking-[0.14em] text-cyan-300">SAVE CALIBRATION</button>
              <button type="button" onClick={resetCalibration} className="border border-[#7a2f35]/70 px-3 py-1 text-[10px] tracking-[0.14em] text-[#ff9aa4]">RESET</button>
              <button type="button" onClick={exportCalibration} className="border border-cyan-500/40 px-3 py-1 text-[10px] tracking-[0.14em] text-cyan-300">COPY JSON</button>
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-4">
        <MicroMetricGrid
          columns={4}
          items={[
            { label: "BODY WEIGHT", value: `${view.development.bodyWeightKg} KG` },
            { label: "TARGET WEIGHT", value: `${view.development.targetWeightKg} KG`, tone: "subtle" },
            { label: "WEIGHT DELTA", value: `${view.development.weightDeltaKg > 0 ? "+" : ""}${view.development.weightDeltaKg} KG`, tone: "subtle" },
            { label: "DEVELOPMENT", value: view.development.status, tone: view.development.status === "DEGRADED" ? "red" : "purple" },
            { label: "COMPOSITION", value: `${view.development.compositionPct}%` },
            { label: "STRENGTH", value: `${view.development.strengthPct}%` },
            { label: "CONDITIONING", value: `${view.development.conditioningPct}%` },
          ]}
        />
      </div>
    </section>
  );
}
