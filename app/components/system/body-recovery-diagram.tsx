"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
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

type RegionId = BodyRegionSignal["id"];
type RegionCenterMap = Partial<Record<RegionId, THREE.Vector3>>;

type CameraControllerProps = {
  surface: "FRONT" | "BACK";
  selectedRegionId: RegionId | null;
  regionCenters: RegionCenterMap;
};

type AvatarModelProps = {
  modelUrl: string;
  morph: ReturnType<typeof deriveAvatarMorphParams>;
  surface: "FRONT" | "BACK";
  selectedRegionId: RegionId | null;
  hoveredRegionId: RegionId | null;
  regionById: Map<RegionId, BodyRegionSignal>;
  onRegionHover: (regionId: RegionId | null) => void;
  onRegionSelect: (regionId: RegionId) => void;
  onRegionCenters: (centers: RegionCenterMap) => void;
};

const statusColor: Record<BodyRegionSignal["status"], string> = {
  READY: "#59f4ff",
  MONITOR: "#c7a7ff",
  RECOVER: "#ff8fa1",
};

const MODEL_URL = "/anatomy/human-avatar.glb";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

function inferRegionFromName(name: string): RegionId | null {
  const key = name.toUpperCase();
  if (!key) return null;

  if (key.includes("SHOULDER") || key.includes("DELTOID") || key.includes("CLAVICLE")) return "SHOULDERS";
  if (key.includes("CHEST") || key.includes("PECT") || key.includes("RIBCAGE")) return "CHEST";
  if (key.includes("BACK") || key.includes("LAT") || key.includes("SPINE") || key.includes("SCAPULA")) return "BACK";
  if (key.includes("ARM") || key.includes("BICEP") || key.includes("TRICEP") || key.includes("FOREARM") || key.includes("HAND")) return "ARMS";
  if (key.includes("CORE") || key.includes("ABS") || key.includes("ABDOMEN") || key.includes("OBLIQUE") || key.includes("TORSO")) return "CORE";
  if (key.includes("GLUTE") || key.includes("PELVIS") || key.includes("BUTT")) return "GLUTES";
  if (key.includes("QUAD") || key.includes("THIGH")) return "QUADS";
  if (key.includes("HAMSTRING") || key.includes("CALF") || key.includes("SHIN")) return "HAMSTRINGS";
  return null;
}

function inferRegionFromPosition(position: THREE.Vector3): RegionId {
  if (position.y > 1.38) return "SHOULDERS";
  if (position.y > 1.05) return position.z > -0.05 ? "CHEST" : "BACK";
  if (Math.abs(position.x) > 0.48 && position.y > 0.2) return "ARMS";
  if (position.y > 0.35) return "CORE";
  if (position.y > -0.2) return "GLUTES";
  return position.y > -0.7 ? "QUADS" : "HAMSTRINGS";
}

function resolveRegionIdFromObject(object: THREE.Object3D): RegionId | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const regionId = node.userData?.regionId as RegionId | undefined;
    if (regionId) return regionId;
    node = node.parent;
  }
  return null;
}

function CameraController({ surface, selectedRegionId, regionCenters }: CameraControllerProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 0.94, 0));

  useFrame(() => {
    const defaultLook = surface === "FRONT" ? new THREE.Vector3(0, 0.94, 0.05) : new THREE.Vector3(0, 0.94, -0.05);
    const defaultPos = surface === "FRONT" ? new THREE.Vector3(0, 1.08, 3.42) : new THREE.Vector3(0, 1.08, -3.42);
    const center = selectedRegionId ? regionCenters[selectedRegionId] : null;
    const desiredLook = center ? center.clone() : defaultLook;
    const desiredPos = center
      ? new THREE.Vector3(center.x * 0.42, center.y + 0.24, center.z + (surface === "FRONT" ? 1.86 : -1.86))
      : defaultPos;

    camera.position.lerp(desiredPos, 0.1);
    lookAt.current.lerp(desiredLook, 0.1);
    camera.lookAt(lookAt.current);
  });

  return null;
}

function AvatarModel({
  modelUrl,
  morph,
  surface,
  selectedRegionId,
  hoveredRegionId,
  regionById,
  onRegionHover,
  onRegionSelect,
  onRegionCenters,
}: AvatarModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const centers = new Map<RegionId, THREE.Vector3[]>();
    const centerAccumulator = (regionId: RegionId, point: THREE.Vector3) => {
      const existing = centers.get(regionId) ?? [];
      existing.push(point.clone());
      centers.set(regionId, existing);
    };

    cloned.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const nameRegion = inferRegionFromName(mesh.name);
      const fallbackRegion = inferRegionFromPosition(mesh.position);
      const regionId = nameRegion ?? fallbackRegion;
      mesh.userData.regionId = regionId;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((item) => item.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      centerAccumulator(regionId, center);
    });

    const normalized: RegionCenterMap = {};
    centers.forEach((points, regionId) => {
      if (points.length === 0) return;
      const sum = points.reduce((acc, point) => acc.add(point), new THREE.Vector3(0, 0, 0));
      normalized[regionId] = sum.multiplyScalar(1 / points.length);
    });
    onRegionCenters(normalized);
  }, [cloned, onRegionCenters]);

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;

    const t = state.clock.getElapsedTime();
    root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, surface === "FRONT" ? 0 : Math.PI, 0.08);
    root.rotation.x = Math.sin(t * 0.7) * 0.02;
    root.position.y = Math.sin(t * 1.25) * 0.03;
    root.scale.set(
      0.84 + (morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 0.12,
      0.9 + morph.torsoScale * 0.08 + morph.legScale * 0.2,
      0.86 + morph.hipScale * 0.08,
    );

    cloned.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const regionId = mesh.userData.regionId as RegionId | undefined;
      if (!regionId) return;
      const region = regionById.get(regionId);
      if (!region) return;

      const color = new THREE.Color(statusColor[region.status]);
      const selected = selectedRegionId === regionId;
      const hovered = hoveredRegionId === regionId;
      material.color.copy(color.clone().multiplyScalar(0.84));
      material.transparent = true;
      material.opacity = selected ? 0.54 : hovered ? 0.42 : 0.28;
      material.emissive.copy(selected ? color : color.clone().multiplyScalar(0.22));
      material.emissiveIntensity = selected ? 1.55 : hovered ? 1 : 0.56;
      material.roughness = 0.32;
      material.metalness = 0.12;
    });
  });

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onRegionHover(resolveRegionIdFromObject(event.object));
  };

  const onPointerOut = () => {
    onRegionHover(null);
  };

  const onPointerDown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const regionId = resolveRegionIdFromObject(event.object);
    if (regionId) onRegionSelect(regionId);
  };

  return (
    <group ref={rootRef} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onPointerDown={onPointerDown}>
      <primitive object={cloned} />
    </group>
  );
}

function FallbackFigure() {
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color="#8be9ff" emissive="#8e6ee8" emissiveIntensity={0.6} transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, 0.9, 0]} scale={[0.92, 1.65, 0.52]}>
        <capsuleGeometry args={[0.34, 0.92, 10, 18]} />
        <meshStandardMaterial color="#7fe9ff" emissive="#58d5ff" emissiveIntensity={0.5} transparent opacity={0.26} />
      </mesh>
      <mesh position={[-0.56, 0.75, 0]} scale={[0.22, 1.34, 0.22]}>
        <capsuleGeometry args={[0.35, 1, 8, 14]} />
        <meshStandardMaterial color="#84dfff" emissive="#85a8ff" emissiveIntensity={0.42} transparent opacity={0.22} />
      </mesh>
      <mesh position={[0.56, 0.75, 0]} scale={[0.22, 1.34, 0.22]}>
        <capsuleGeometry args={[0.35, 1, 8, 14]} />
        <meshStandardMaterial color="#84dfff" emissive="#85a8ff" emissiveIntensity={0.42} transparent opacity={0.22} />
      </mesh>
      <mesh position={[-0.2, -0.5, 0]} scale={[0.26, 1.6, 0.24]}>
        <capsuleGeometry args={[0.36, 1.2, 8, 14]} />
        <meshStandardMaterial color="#7fd2ff" emissive="#b58dff" emissiveIntensity={0.4} transparent opacity={0.22} />
      </mesh>
      <mesh position={[0.2, -0.5, 0]} scale={[0.26, 1.6, 0.24]}>
        <capsuleGeometry args={[0.36, 1.2, 8, 14]} />
        <meshStandardMaterial color="#7fd2ff" emissive="#b58dff" emissiveIntensity={0.4} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

export function BodyRecoveryDiagram({ view, insights = {}, activityCodename, input }: BodyRecoveryDiagramProps) {
  const [surface, setSurface] = useState<"FRONT" | "BACK">("FRONT");
  const [selectedRegionId, setSelectedRegionId] = useState<RegionId | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<RegionId | null>(null);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);
  const [regionCenters, setRegionCenters] = useState<RegionCenterMap>({});
  const regionById = useMemo(() => new Map(view.regions.map((region) => [region.id, region])), [view.regions]);
  const morph = useMemo(() => deriveAvatarMorphParams(input, view, null), [input, view]);
  const selectedRegion = selectedRegionId ? regionById.get(selectedRegionId) ?? null : null;
  const selectedInsight = selectedRegionId ? insights[selectedRegionId] : undefined;
  const selectedRoute = selectedRegion ? buildRecoveryRoute(selectedRegion, activityCodename) : null;
  const widthSignal = Math.round((morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 100);
  const heightSignal = Math.round(clamp(84 + (input.heightCm - 160) * 0.52 + (morph.legScale - 1) * 18, 80, 152));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(MODEL_URL, { method: "HEAD" });
        if (!cancelled) setModelAvailable(response.ok);
      } catch {
        if (!cancelled) setModelAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="border border-cyan-500/50 bg-black p-4 font-mono sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">3D BODY AVATAR</h2>
        <div className="flex items-center gap-2">
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
            <button type="button" onClick={() => setSelectedRegionId(null)} className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300">
              RESET VIEW
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border border-cyan-500/30 p-2">
        <div className="h-[560px] w-full overflow-hidden border border-cyan-500/20">
          <Canvas camera={{ position: [0, 1.08, 3.42], fov: 34 }} gl={{ antialias: true }}>
            <color attach="background" args={["#02070c"]} />
            <fog attach="fog" args={["#02070c", 4.8, 9]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[2.6, 3.1, 2.4]} intensity={1.05} color="#8beeff" />
            <directionalLight position={[-2.8, 1.6, -3.2]} intensity={0.42} color="#c49dff" />
            <pointLight position={[0, 0.6, 2.1]} intensity={0.44} color="#6de2ff" />
            <pointLight position={[0, 1.2, -2.2]} intensity={0.24} color="#ae8fff" />
            <Suspense fallback={null}>
              {modelAvailable ? (
                <AvatarModel
                  modelUrl={MODEL_URL}
                  morph={morph}
                  surface={surface}
                  selectedRegionId={selectedRegionId}
                  hoveredRegionId={hoveredRegionId}
                  regionById={regionById}
                  onRegionHover={setHoveredRegionId}
                  onRegionSelect={(regionId) => setSelectedRegionId((current) => (current === regionId ? null : regionId))}
                  onRegionCenters={setRegionCenters}
                />
              ) : (
                <FallbackFigure />
              )}
            </Suspense>
            <CameraController surface={surface} selectedRegionId={selectedRegionId} regionCenters={regionCenters} />
          </Canvas>
        </div>
        <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-500/85">CLICK A MUSCLE REGION TO ZOOM | RE-CLICK TO CLOSE</p>
        {modelAvailable === false ? (
          <p className="mt-2 border border-cyan-500/30 px-2 py-1 text-[10px] tracking-[0.12em] text-cyan-300/90">
            MODEL NOT FOUND. PLACE `human-avatar.glb` IN `app/public/anatomy/` FOR REALISTIC CHARACTER RENDER.
          </p>
        ) : null}
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
            { label: "AVATAR HEIGHT", value: `${heightSignal}%`, tone: "subtle" },
            { label: "AVATAR CONFIDENCE", value: `${Math.round(morph.confidencePct)}%`, tone: "subtle" },
          ]}
        />
      </div>
    </section>
  );
}

