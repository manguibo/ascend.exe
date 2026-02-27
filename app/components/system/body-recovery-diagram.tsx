"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { BodyRecoveryView, BodyRegionInsight, BodyRegionSignal } from "@/lib/system/body-recovery";
import { deriveAvatarMorphParams } from "@/lib/system/avatar-profile";
import type { SessionLogInput } from "@/lib/system/session-state";
import { MicroMetricGrid } from "./micro-metric-grid";

type BodyRecoveryDiagramProps = {
  view: BodyRecoveryView;
  insights?: Record<string, BodyRegionInsight>;
  activityCodename?: string;
  input: SessionLogInput;
};

type RecoveryRoute = {
  route: string;
  rationale: string;
  steps: readonly string[];
};

type RegionShape = {
  id: BodyRegionSignal["id"];
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
};

type AvatarRigProps = {
  regionById: Map<BodyRegionSignal["id"], BodyRegionSignal>;
  selectedRegionId: BodyRegionSignal["id"] | null;
  onSelectRegion: (id: BodyRegionSignal["id"]) => void;
  morph: ReturnType<typeof deriveAvatarMorphParams>;
  heightScale: number;
};

type CameraControllerProps = {
  selectedRegionId: BodyRegionSignal["id"] | null;
};

const statusColor: Record<BodyRegionSignal["status"], string> = {
  READY: "#59f4ff",
  MONITOR: "#c7a7ff",
  RECOVER: "#ff8fa1",
};

const focusByRegion: Record<BodyRegionSignal["id"], THREE.Vector3> = {
  SHOULDERS: new THREE.Vector3(0, 1.56, 0),
  CHEST: new THREE.Vector3(0, 1.18, 0),
  BACK: new THREE.Vector3(0, 1.14, 0),
  ARMS: new THREE.Vector3(0.92, 0.98, 0),
  CORE: new THREE.Vector3(0, 0.62, 0),
  GLUTES: new THREE.Vector3(0, 0.18, 0),
  QUADS: new THREE.Vector3(0, -0.42, 0),
  HAMSTRINGS: new THREE.Vector3(0, -0.62, 0),
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

function CameraController({ selectedRegionId }: CameraControllerProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 0.9, 0));

  useFrame(() => {
    const focus = selectedRegionId ? focusByRegion[selectedRegionId] : new THREE.Vector3(0, 0.82, 0);
    const desiredCamera = selectedRegionId
      ? new THREE.Vector3(focus.x * 0.58, focus.y + 0.3, 2.05)
      : new THREE.Vector3(0, 0.95, 4.65);
    camera.position.lerp(desiredCamera, 0.08);
    lookAt.current.lerp(focus, 0.08);
    camera.lookAt(lookAt.current);
  });

  return null;
}

function RegionMesh({
  shape,
  region,
  selected,
  onSelect,
}: {
  shape: RegionShape;
  region: BodyRegionSignal;
  selected: boolean;
  onSelect: (id: BodyRegionSignal["id"]) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const baseColor = statusColor[region.status];
  const emissive = selected || hovered ? new THREE.Color(baseColor) : new THREE.Color(baseColor).multiplyScalar(0.3);
  const opacity = selected ? 0.5 : hovered ? 0.35 : 0.25;

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(shape.id);
  };

  return (
    <mesh
      position={shape.position}
      scale={shape.scale}
      rotation={shape.rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onPointerDown={handleSelect}
    >
      <boxGeometry args={[1, 1, 0.56]} />
      <meshStandardMaterial color={baseColor} transparent opacity={opacity} emissive={emissive} emissiveIntensity={selected ? 1.3 : 0.9} />
    </mesh>
  );
}

function AvatarRig({ regionById, selectedRegionId, onSelectRegion, morph, heightScale }: AvatarRigProps) {
  const rootRef = useRef<THREE.Group>(null);
  const shoulderWidth = 0.82 * morph.shoulderScale;
  const chestWidth = 0.64 * ((morph.shoulderScale + morph.waistScale) / 2);
  const waistWidth = 0.44 * morph.waistScale;
  const hipWidth = 0.55 * morph.hipScale;
  const armWidth = 0.2 * morph.armScale;
  const legWidth = 0.26 * morph.legScale;

  useFrame((state) => {
    if (!rootRef.current) return;
    const t = state.clock.getElapsedTime();
    rootRef.current.position.y = Math.sin(t * 1.35) * 0.03;
    rootRef.current.rotation.y = Math.sin(t * 0.54) * 0.06;
    rootRef.current.rotation.x = Math.sin(t * 0.72) * 0.03;
  });

  const regionShapes: RegionShape[] = [
    { id: "SHOULDERS", position: [0, 1.54, 0], scale: [shoulderWidth, 0.18 * morph.torsoScale, 0.42] },
    { id: "CHEST", position: [0, 1.16, 0], scale: [chestWidth, 0.46 * morph.torsoScale, 0.44] },
    { id: "BACK", position: [0, 1.1, -0.02], scale: [chestWidth, 0.48 * morph.torsoScale, 0.46] },
    { id: "CORE", position: [0, 0.66, 0], scale: [waistWidth, 0.54 * morph.torsoScale, 0.4] },
    { id: "GLUTES", position: [0, 0.2, 0], scale: [hipWidth, 0.26 * morph.torsoScale, 0.44] },
    { id: "ARMS", position: [0.95, 0.92, 0], scale: [armWidth, 0.94 * morph.torsoScale, 0.36] },
    { id: "QUADS", position: [0.12, -0.42, 0], scale: [legWidth, 0.9 * morph.legScale, 0.36] },
    { id: "HAMSTRINGS", position: [0.12, -0.62, -0.06], scale: [legWidth, 0.86 * morph.legScale, 0.36] },
  ];

  return (
    <group ref={rootRef} scale={[1, heightScale, 1]}>
      <mesh position={[0, 1.92, 0]}>
        <sphereGeometry args={[0.21 * (0.92 + morph.torsoScale * 0.1), 22, 22]} />
        <meshStandardMaterial color="#82eaff" emissive="#6f5ac7" emissiveIntensity={0.55} transparent opacity={0.35} />
      </mesh>

      <mesh position={[0, 1.76, 0]} scale={[0.22 * morph.torsoScale, 0.28 * morph.torsoScale, 0.22]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 14]} />
        <meshStandardMaterial color="#8cf2ff" emissive="#62d6ff" emissiveIntensity={0.45} transparent opacity={0.24} />
      </mesh>

      <mesh position={[0, 0.72, 0]} scale={[0.03, 2.35, 0.03]}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial color="#dfa1ff" emissive="#d68eff" emissiveIntensity={0.8} transparent opacity={0.5} />
      </mesh>

      {regionShapes.map((shape) => {
        const region = regionById.get(shape.id);
        if (!region) return null;
        if (shape.id === "ARMS") {
          return (
            <group key={shape.id}>
              <RegionMesh shape={{ ...shape, position: [-shape.position[0], shape.position[1], 0] }} region={region} selected={selectedRegionId === shape.id} onSelect={onSelectRegion} />
              <RegionMesh shape={shape} region={region} selected={selectedRegionId === shape.id} onSelect={onSelectRegion} />
            </group>
          );
        }
        if (shape.id === "QUADS" || shape.id === "HAMSTRINGS") {
          return (
            <group key={shape.id}>
              <RegionMesh shape={{ ...shape, position: [-shape.position[0], shape.position[1], shape.position[2]] }} region={region} selected={selectedRegionId === shape.id} onSelect={onSelectRegion} />
              <RegionMesh shape={shape} region={region} selected={selectedRegionId === shape.id} onSelect={onSelectRegion} />
            </group>
          );
        }
        return <RegionMesh key={shape.id} shape={shape} region={region} selected={selectedRegionId === shape.id} onSelect={onSelectRegion} />;
      })}
    </group>
  );
}

export function BodyRecoveryDiagram({ view, insights = {}, activityCodename, input }: BodyRecoveryDiagramProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<BodyRegionSignal["id"] | null>(null);
  const regionById = useMemo(() => new Map(view.regions.map((region) => [region.id, region])), [view.regions]);
  const morph = useMemo(() => deriveAvatarMorphParams(input, view, null), [input, view]);
  const selectedRegion = selectedRegionId ? regionById.get(selectedRegionId) ?? null : null;
  const selectedInsight = selectedRegionId ? insights[selectedRegionId] : undefined;
  const selectedRoute = selectedRegion ? buildRecoveryRoute(selectedRegion, activityCodename) : null;
  const heightScale = clamp(0.84 + (input.heightCm - 160) / 120 + (morph.legScale - 1) * 0.2, 0.8, 1.5);
  const widthSignal = Math.round((morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 100);

  return (
    <section className="border border-cyan-500/50 bg-black p-4 font-mono sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">3D BODY AVATAR</h2>
        <div className="flex items-center gap-2">
          <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">IDLE ACTIVE</p>
          {selectedRegionId ? (
            <button type="button" onClick={() => setSelectedRegionId(null)} className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300">
              RESET VIEW
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border border-cyan-500/30 p-2">
        <div className="h-[560px] w-full overflow-hidden border border-cyan-500/20">
          <Canvas camera={{ position: [0, 0.95, 4.65], fov: 38 }} gl={{ antialias: true }}>
            <color attach="background" args={["#02070c"]} />
            <fog attach="fog" args={["#02070c", 5, 9.5]} />
            <ambientLight intensity={0.42} />
            <pointLight position={[1.8, 2.6, 3.8]} intensity={1.2} color="#84ecff" />
            <pointLight position={[-2.2, 1.4, -3.2]} intensity={0.5} color="#d7a7ff" />
            <AvatarRig
              regionById={regionById}
              selectedRegionId={selectedRegionId}
              onSelectRegion={(id) => setSelectedRegionId((current) => (current === id ? null : id))}
              morph={morph}
              heightScale={heightScale}
            />
            <CameraController selectedRegionId={selectedRegionId} />
          </Canvas>
        </div>
        <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-500/85">CLICK A MUSCLE REGION TO ZOOM | RE-CLICK TO CLOSE</p>
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
                <button type="button" onClick={() => setSelectedRegionId(null)} className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300">
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
            { label: "AVATAR WIDTH", value: `${widthSignal}%`, tone: "subtle" },
            { label: "AVATAR HEIGHT", value: `${Math.round(heightScale * 100)}%`, tone: "subtle" },
            { label: "AVATAR CONFIDENCE", value: `${Math.round(morph.confidencePct)}%`, tone: "subtle" },
          ]}
        />
      </div>
    </section>
  );
}
