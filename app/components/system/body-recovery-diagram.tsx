"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { BodyRecoveryView, BodyRegionInsight, BodyRegionSignal } from "@/lib/system/body-recovery";
import { deriveAvatarMorphParams } from "@/lib/system/avatar-profile";
import type { SessionLogInput } from "@/lib/system/session-state";
import { MicroMetricGrid } from "./micro-metric-grid";

type BodyRecoveryDiagramProps = {
  view: BodyRecoveryView;
  insights?: Record<string, BodyRegionInsight>;
  stressedRegionLevels?: Partial<Record<BodyRegionSignal["id"], number>>;
  activityCodename?: string;
  input: SessionLogInput;
};

type RecoveryRoute = {
  route: string;
  rationale: string;
  steps: readonly string[];
};

type VisualRegionId =
  | "FINGERS"
  | "FOREARMS"
  | "BICEPS"
  | "TRICEPS"
  | "SHOULDERS"
  | "LATS"
  | "TRAPS"
  | "CHEST"
  | "ABS"
  | "GLUTES"
  | "QUADS"
  | "HAMSTRINGS"
  | "CALVES";

type BaseRegionId = BodyRegionSignal["id"];

type VisualRegionSignal = Omit<BodyRegionSignal, "id" | "label"> & {
  id: VisualRegionId;
  label: string;
  baseId: BaseRegionId;
};

type AvatarModelProps = {
  modelUrl: string;
  morph: ReturnType<typeof deriveAvatarMorphParams>;
  selectedRegionId: VisualRegionId | null;
  hoveredRegionId: VisualRegionId | null;
  stressedRegionLevels: Partial<Record<BaseRegionId, number>>;
  regionById: Map<VisualRegionId, VisualRegionSignal>;
  onRegionHover: (regionId: VisualRegionId | null) => void;
  onRegionSelect: (regionId: VisualRegionId) => void;
};

type ExoskeletonFallbackProps = {
  morph: ReturnType<typeof deriveAvatarMorphParams>;
  selectedRegionId: VisualRegionId | null;
  hoveredRegionId: VisualRegionId | null;
  stressedRegionLevels: Partial<Record<BaseRegionId, number>>;
  regionById: Map<VisualRegionId, VisualRegionSignal>;
  onRegionHover: (regionId: VisualRegionId | null) => void;
  onRegionSelect: (regionId: VisualRegionId) => void;
};

const VISUAL_REGION_ORDER: readonly VisualRegionId[] = [
  "FINGERS",
  "FOREARMS",
  "BICEPS",
  "TRICEPS",
  "SHOULDERS",
  "LATS",
  "TRAPS",
  "CHEST",
  "ABS",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
];

const VISUAL_TO_BASE_REGION: Record<VisualRegionId, BaseRegionId> = {
  FINGERS: "ARMS",
  FOREARMS: "ARMS",
  BICEPS: "ARMS",
  TRICEPS: "ARMS",
  SHOULDERS: "SHOULDERS",
  LATS: "BACK",
  TRAPS: "BACK",
  CHEST: "CHEST",
  ABS: "CORE",
  GLUTES: "GLUTES",
  QUADS: "QUADS",
  HAMSTRINGS: "HAMSTRINGS",
  CALVES: "HAMSTRINGS",
};

const MODEL_URL = "/anatomy/human-avatar.glb";
const CYBER_SHELL_SCALE = 1.008;
const BASE_MODEL_BLUE = new THREE.Color("#4b8dff");
const STRESS_YELLOW = new THREE.Color("#ffe066");
const STRESS_ORANGE = new THREE.Color("#ff922e");
const STRESS_RED = new THREE.Color("#ff3b1f");
const STRESS_MIN_VISUAL = 0.14;

const VISUAL_REGION_MASK_ID: Record<VisualRegionId, number> = {
  CALVES: 15,
  QUADS: 35,
  HAMSTRINGS: 55,
  GLUTES: 75,
  FOREARMS: 95,
  BICEPS: 115,
  TRICEPS: 135,
  CHEST: 145,
  ABS: 160,
  SHOULDERS: 170,
  TRAPS: 200,
  LATS: 225,
  FINGERS: 240,
};
const MASK_BACKGROUND_MAX = 6;
const MASK_ID_TOLERANCE = 14;
const MASK_SAMPLE_OFFSETS: readonly [number, number][] = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const VISUAL_REGION_TO_INDEX: Record<VisualRegionId, number> = Object.fromEntries(
  VISUAL_REGION_ORDER.map((regionId, index) => [regionId, index]),
) as Record<VisualRegionId, number>;

const textureSamplingCanvas = new WeakMap<THREE.Texture, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number }>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStressTone(stressLevel: number): THREE.Color {
  const normalized = clamp(stressLevel, 0, 1);
  const color = new THREE.Color();
  if (normalized <= 0.5) {
    color.lerpColors(STRESS_YELLOW, STRESS_ORANGE, normalized / 0.5);
  } else {
    color.lerpColors(STRESS_ORANGE, STRESS_RED, (normalized - 0.5) / 0.5);
  }
  return color;
}

function getTextureSamplingContext(texture: THREE.Texture): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const existing = textureSamplingCanvas.get(texture);
  if (existing) {
    return existing;
  }

  const image = texture.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | OffscreenCanvas
    | undefined;
  if (!image) {
    return null;
  }

  const width = (image as { width: number }).width;
  const height = (image as { height: number }).height;
  if (!width || !height) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.drawImage(image as CanvasImageSource, 0, 0, width, height);
  const created = { canvas, ctx, width, height };
  textureSamplingCanvas.set(texture, created);
  return created;
}

function resolveRegionFromMaskId(sampledId: number): VisualRegionId | null {
  if (sampledId <= MASK_BACKGROUND_MAX) {
    return null;
  }

  let matchedRegion: VisualRegionId | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const regionId of VISUAL_REGION_ORDER) {
    const distance = Math.abs(sampledId - VISUAL_REGION_MASK_ID[regionId]);
    if (distance < closestDistance) {
      closestDistance = distance;
      matchedRegion = regionId;
    }
  }

  return closestDistance <= MASK_ID_TOLERANCE ? matchedRegion : null;
}

function sampleMaskRegionAtUv(texture: THREE.Texture, uv: THREE.Vector2): VisualRegionId | null {
  const sampling = getTextureSamplingContext(texture);
  if (!sampling) {
    return null;
  }

  const transformedUv = uv.clone();
  texture.transformUv(transformedUv);
  const u = clamp(transformedUv.x, 0, 0.999999);
  const v = clamp(transformedUv.y, 0, 0.999999);
  const x = Math.floor(u * sampling.width);
  const y = Math.floor((1 - v) * sampling.height);

  const votes = new Map<VisualRegionId, number>();
  MASK_SAMPLE_OFFSETS.forEach(([dx, dy]) => {
    const px = Math.max(0, Math.min(sampling.width - 1, x + dx));
    const py = Math.max(0, Math.min(sampling.height - 1, y + dy));
    const [r, , , a] = sampling.ctx.getImageData(px, py, 1, 1).data;
    if (a <= 3) {
      return;
    }

    const sampledRegion = resolveRegionFromMaskId(r);
    if (!sampledRegion) {
      return;
    }

    votes.set(sampledRegion, (votes.get(sampledRegion) ?? 0) + 1);
  });

  let winner: VisualRegionId | null = null;
  let winnerVotes = 0;
  votes.forEach((count, regionId) => {
    if (count > winnerVotes) {
      winnerVotes = count;
      winner = regionId;
    }
  });

  return winner;
}

function resolveRegionFromUvMaskCandidates(object: THREE.Object3D, uvCandidates: readonly (THREE.Vector2 | undefined)[]): VisualRegionId | null {
  if (uvCandidates.length === 0) {
    return null;
  }

  let node: THREE.Object3D | null = object;
  while (node) {
    const texture = node.userData?.maskTexture as THREE.Texture | undefined;
    if (texture) {
      for (const uv of uvCandidates) {
        if (!uv) continue;
        const sampledRegion = sampleMaskRegionAtUv(texture, uv);
        if (sampledRegion) {
          return sampledRegion;
        }
      }
      return null;
    }
    node = node.parent;
  }

  return null;
}

function hasMaskTextureInHierarchy(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (node.userData?.maskTexture) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function buildVisualStressArray(stressedRegionLevels: Partial<Record<BaseRegionId, number>>): number[] {
  return VISUAL_REGION_ORDER.map((regionId) => getVisualStressLevel(stressedRegionLevels, regionId));
}

function getVisualStressLevel(stressedRegionLevels: Partial<Record<BaseRegionId, number>>, regionId: VisualRegionId): number {
  return clamp(stressedRegionLevels[VISUAL_TO_BASE_REGION[regionId]] ?? 0, 0, 1);
}

function buildRecoveryRoute(region: VisualRegionSignal, activityCodename?: string): RecoveryRoute {
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

function inferRegionFromName(name: string): VisualRegionId | null {
  const key = name.toUpperCase();
  if (!key) return null;

  if (key.includes("FINGER") || key.includes("HAND")) return "FINGERS";
  if (key.includes("FOREARM")) return "FOREARMS";
  if (key.includes("BICEP")) return "BICEPS";
  if (key.includes("TRICEP")) return "TRICEPS";
  if (key.includes("SHOULDER") || key.includes("DELTOID") || key.includes("CLAVICLE")) return "SHOULDERS";
  if (key.includes("LAT")) return "LATS";
  if (key.includes("TRAP")) return "TRAPS";
  if (key.includes("CHEST") || key.includes("PECT") || key.includes("RIBCAGE")) return "CHEST";
  if (key.includes("ABS") || key.includes("ABDOMEN") || key.includes("OBLIQUE") || key.includes("TORSO")) return "ABS";
  if (key.includes("GLUTE") || key.includes("PELVIS") || key.includes("BUTT")) return "GLUTES";
  if (key.includes("QUAD") || key.includes("THIGH")) return "QUADS";
  if (key.includes("HAMSTRING")) return "HAMSTRINGS";
  if (key.includes("CALF") || key.includes("SHIN")) return "CALVES";
  return null;
}

function inferRegionFromPosition(position: THREE.Vector3): VisualRegionId {
  if (position.y > 1.42) return "TRAPS";
  if (position.y > 1.2) return "SHOULDERS";
  if (Math.abs(position.x) > 0.62 && position.y > 0.84) return position.z >= 0 ? "BICEPS" : "TRICEPS";
  if (Math.abs(position.x) > 0.62 && position.y > 0.48) return "FOREARMS";
  if (Math.abs(position.x) > 0.7 && position.y > 0.3) return "FINGERS";
  if (position.y > 0.9) return position.z >= 0 ? "CHEST" : "LATS";
  if (position.y > 0.38) return position.z >= 0 ? "ABS" : "GLUTES";
  if (position.y > -0.32) return position.z >= 0 ? "QUADS" : "HAMSTRINGS";
  return "CALVES";
}

function resolveRegionIdFromObject(object: THREE.Object3D): VisualRegionId | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const regionId = node.userData?.regionId as VisualRegionId | undefined;
    if (regionId) return regionId;
    node = node.parent;
  }
  return null;
}

function hasDynamicRegionRouting(object: THREE.Object3D): boolean {
  let node: THREE.Object3D | null = object;
  while (node) {
    if (Boolean(node.userData?.dynamicRegion)) return true;
    node = node.parent;
  }
  return false;
}

function inferRegionFromHitPoint(point: THREE.Vector3, object: THREE.Object3D): VisualRegionId | null {
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  if (size.y <= 0.001) return null;

  const normalize = (value: number, min: number, span: number) => (span <= 0.001 ? 0.5 : (value - min) / span);
  const nx = normalize(point.x, bounds.min.x, size.x);
  const ny = normalize(point.y, bounds.min.y, size.y);
  const nz = normalize(point.z, bounds.min.z, size.z);
  const xDist = Math.abs(nx - 0.5);
  const frontFacing = nz >= 0.5;

  if (xDist > 0.45 && ny > 0.42 && ny <= 0.56) return "FINGERS";
  if (xDist > 0.4 && ny > 0.56 && ny <= 0.68) return "FOREARMS";
  if (xDist > 0.34 && ny > 0.68 && ny <= 0.82) return frontFacing ? "BICEPS" : "TRICEPS";
  if (ny > 0.86 && xDist <= 0.18) return "TRAPS";
  if (ny > 0.8) return "SHOULDERS";
  if (ny > 0.64 && xDist <= 0.28) return frontFacing ? "CHEST" : "LATS";
  if (ny > 0.46 && xDist <= 0.24) return frontFacing ? "ABS" : ny > 0.56 ? "LATS" : "GLUTES";
  if (ny > 0.28 && xDist <= 0.22) return frontFacing ? "QUADS" : "HAMSTRINGS";
  return "CALVES";
}

function createMaskHeatMaterial(maskTexture: THREE.Texture): THREE.ShaderMaterial {
  const stressLevels = buildVisualStressArray({});
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uMaskMap: { value: maskTexture },
      uStressLevels: { value: stressLevels },
      uSelectedIndex: { value: -1 },
      uHoveredIndex: { value: -1 },
      uBaseColor: { value: BASE_MODEL_BLUE.clone() },
      uStressMinVisual: { value: STRESS_MIN_VISUAL },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMaskMap;
      uniform float uStressLevels[13];
      uniform float uSelectedIndex;
      uniform float uHoveredIndex;
      uniform vec3 uBaseColor;
      uniform float uStressMinVisual;
      varying vec2 vUv;
      varying vec3 vNormalW;

      float resolveRegionIndex(float maskId) {
        if (maskId <= 6.0) return -1.0;
        if (abs(maskId - 240.0) <= 14.0) return 0.0;   // FINGERS
        if (abs(maskId - 95.0) <= 14.0) return 1.0;    // FOREARMS
        if (abs(maskId - 115.0) <= 14.0) return 2.0;   // BICEPS
        if (abs(maskId - 135.0) <= 14.0) return 3.0;   // TRICEPS
        if (abs(maskId - 170.0) <= 14.0) return 4.0;   // SHOULDERS
        if (abs(maskId - 225.0) <= 14.0) return 5.0;   // LATS
        if (abs(maskId - 200.0) <= 14.0) return 6.0;   // TRAPS
        if (abs(maskId - 145.0) <= 14.0) return 7.0;   // CHEST
        if (abs(maskId - 160.0) <= 14.0) return 8.0;   // ABS
        if (abs(maskId - 75.0) <= 14.0) return 9.0;    // GLUTES
        if (abs(maskId - 35.0) <= 14.0) return 10.0;   // QUADS
        if (abs(maskId - 55.0) <= 14.0) return 11.0;   // HAMSTRINGS
        if (abs(maskId - 15.0) <= 14.0) return 12.0;   // CALVES
        return -1.0;
      }

      float getStressByIndex(float idx) {
        if (idx < 0.0) return 0.0;
        if (idx < 0.5) return uStressLevels[0];
        if (idx < 1.5) return uStressLevels[1];
        if (idx < 2.5) return uStressLevels[2];
        if (idx < 3.5) return uStressLevels[3];
        if (idx < 4.5) return uStressLevels[4];
        if (idx < 5.5) return uStressLevels[5];
        if (idx < 6.5) return uStressLevels[6];
        if (idx < 7.5) return uStressLevels[7];
        if (idx < 8.5) return uStressLevels[8];
        if (idx < 9.5) return uStressLevels[9];
        if (idx < 10.5) return uStressLevels[10];
        if (idx < 11.5) return uStressLevels[11];
        return uStressLevels[12];
      }

      vec3 getStressTone(float stress) {
        vec3 yellow = vec3(1.0, 0.878, 0.4);
        vec3 orange = vec3(1.0, 0.573, 0.18);
        vec3 red = vec3(1.0, 0.231, 0.122);
        float clamped = clamp(stress, 0.0, 1.0);
        if (clamped <= 0.5) {
          return mix(yellow, orange, clamped / 0.5);
        }
        return mix(orange, red, (clamped - 0.5) / 0.5);
      }

      void main() {
        float maskId = texture2D(uMaskMap, vUv).r * 255.0;
        float idx = resolveRegionIndex(maskId);
        float stress = getStressByIndex(idx);
        bool selected = idx >= 0.0 && abs(idx - uSelectedIndex) < 0.5;
        bool hovered = idx >= 0.0 && abs(idx - uHoveredIndex) < 0.5;
        bool stressed = stress >= uStressMinVisual;
        vec3 tone = stressed ? getStressTone(stress) : uBaseColor;
        float heatMix = stressed ? clamp(stress * 0.82, 0.0, 0.9) : 0.0;
        vec3 color = mix(uBaseColor, tone, heatMix);

        if (hovered) {
          color = mix(color, vec3(0.65, 0.92, 1.0), 0.32);
        }
        if (selected) {
          color = mix(color, vec3(1.0, 0.98, 0.86), 0.4);
        }

        float lighting = 0.5 + 0.5 * max(dot(vNormalW, normalize(vec3(0.22, 0.82, 0.42))), 0.0);
        float alpha = selected ? 0.84 : hovered ? 0.78 : stressed ? 0.7 : 0.62;
        gl_FragColor = vec4(color * lighting, alpha);
      }
    `,
  });
}

function AvatarModel({
  modelUrl,
  morph,
  selectedRegionId,
  hoveredRegionId,
  stressedRegionLevels,
  regionById,
  onRegionHover,
  onRegionSelect,
}: AvatarModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const modelFit = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(cloned);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const safeHeight = Math.max(size.y, 0.001);
    const targetHeight = 2.6;
    const scale = clamp(targetHeight / safeHeight, 0.01, 12);
    const offset = new THREE.Vector3(-center.x, -center.y + 0.94, -center.z);
    return { scale, offset };
  }, [cloned]);

  useEffect(() => {
    const meshNodes: THREE.Mesh[] = [];

    cloned.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      meshNodes.push(node as THREE.Mesh);
    });

    const useDynamicRouting = meshNodes.length <= 1;

    meshNodes.forEach((mesh) => {
      const nameRegion = inferRegionFromName(mesh.name);
      const fallbackRegion = inferRegionFromPosition(mesh.position);
      const regionId = useDynamicRouting ? fallbackRegion : nameRegion ?? fallbackRegion;
      mesh.userData.regionId = regionId;
      mesh.userData.dynamicRegion = useDynamicRouting;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((item) => item.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
      }

      const activeMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const maskTexture = activeMaterial instanceof THREE.MeshStandardMaterial ? activeMaterial.map : null;
      if (maskTexture) {
        maskTexture.needsUpdate = true;
        mesh.userData.maskTexture = maskTexture;
      }

      const hasOverlay = mesh.children.some((child) => child.userData?.overlayPart === true);
      if (!hasOverlay) {
        const shellMaterial = new THREE.MeshStandardMaterial({
          color: "#070d12",
          transparent: true,
          opacity: 0.38,
          metalness: 0.92,
          roughness: 0.18,
          emissive: "#0c1a24",
          emissiveIntensity: 0.85,
          depthWrite: false,
        });
        const shell = new THREE.Mesh(mesh.geometry.clone(), shellMaterial);
        shell.scale.setScalar(CYBER_SHELL_SCALE);
        shell.renderOrder = 2;
        shell.userData.overlayPart = true;
        shell.userData.overlayKind = "shell";
        shell.userData.regionId = regionId;
        mesh.add(shell);

        const edgeMaterial = new THREE.LineBasicMaterial({ color: "#49ddff", transparent: true, opacity: 0.52, depthWrite: false });
        const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 37), edgeMaterial);
        edgeLines.scale.setScalar(CYBER_SHELL_SCALE + 0.0007);
        edgeLines.renderOrder = 3;
        edgeLines.userData.overlayPart = true;
        edgeLines.userData.overlayKind = "edges";
        edgeLines.userData.regionId = regionId;
        edgeLines.raycast = () => null;
        mesh.add(edgeLines);

        if (maskTexture && !mesh.children.some((child) => child.userData?.overlayKind === "mask-heat")) {
          const heatOverlay = new THREE.Mesh(mesh.geometry, createMaskHeatMaterial(maskTexture));
          heatOverlay.scale.setScalar(CYBER_SHELL_SCALE + 0.0018);
          heatOverlay.renderOrder = 4;
          heatOverlay.userData.overlayPart = true;
          heatOverlay.userData.overlayKind = "mask-heat";
          heatOverlay.userData.maskTexture = maskTexture;
          heatOverlay.userData.dynamicRegion = true;
          mesh.add(heatOverlay);
        }

        if (maskTexture) {
          shell.userData.maskTexture = maskTexture;
          shell.userData.dynamicRegion = true;
        }
      }
    });
  }, [cloned]);

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;

    const t = state.clock.getElapsedTime();
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
      const regionId = mesh.userData.regionId as VisualRegionId | undefined;
      if (!regionId) return;
      const region = regionById.get(regionId);
      if (!region) return;
      const isDynamicMesh = Boolean(mesh.userData.dynamicRegion);

      const selected = selectedRegionId === regionId;
      const hovered = hoveredRegionId === regionId;
      const stressLevel = getVisualStressLevel(stressedRegionLevels, regionId);
      const isStressed = stressLevel >= STRESS_MIN_VISUAL;
      const activeTone = isStressed ? getStressTone(stressLevel) : BASE_MODEL_BLUE;

      const baseTone = isDynamicMesh ? BASE_MODEL_BLUE : activeTone;
      material.color.copy(baseTone.clone().multiplyScalar(0.34));
      material.transparent = true;
      material.opacity = isDynamicMesh ? 0.38 : selected ? 0.78 : hovered ? 0.66 : isStressed ? 0.58 : 0.5;
      material.emissive.copy(selected ? activeTone : baseTone.clone().multiplyScalar(hovered ? 0.74 : 0.42));
      material.emissiveIntensity = isDynamicMesh ? 0.38 : selected ? 1.8 + stressLevel * 0.6 : hovered ? 1.2 + stressLevel * 0.4 : 0.76 + stressLevel * 0.32;
      material.roughness = 0.28;
      material.metalness = 0.84;

      mesh.children.forEach((child) => {
        if (child.userData?.overlayPart !== true) return;
        if (child.userData?.overlayKind === "shell") {
          const shellMat = (child as THREE.Mesh).material;
          const shellStd = Array.isArray(shellMat) ? shellMat[0] : shellMat;
          if (shellStd instanceof THREE.MeshStandardMaterial) {
            shellStd.color.copy(activeTone.clone().multiplyScalar(0.2));
            shellStd.opacity = selected ? 0.68 : hovered ? 0.58 : isStressed ? 0.56 : 0.48;
            shellStd.emissive.copy(selected ? activeTone : activeTone.clone().multiplyScalar(hovered ? 0.78 : 0.5));
            shellStd.emissiveIntensity = selected ? 2.05 + stressLevel * 0.65 : hovered ? 1.38 + stressLevel * 0.45 : 0.94 + stressLevel * 0.35;
          }
        }
        if (child.userData?.overlayKind === "edges") {
          const edgeMat = (child as THREE.LineSegments).material;
          const edgeLine = Array.isArray(edgeMat) ? edgeMat[0] : edgeMat;
          if (edgeLine instanceof THREE.LineBasicMaterial) {
            edgeLine.color.copy(activeTone);
            edgeLine.opacity = selected ? 0.98 : hovered ? 0.8 : 0.58 + stressLevel * 0.24;
          }
        }
        if (child.userData?.overlayKind === "mask-heat") {
          const heatMesh = child as THREE.Mesh;
          const heatMaterial = heatMesh.material;
          const heatShader = Array.isArray(heatMaterial) ? heatMaterial[0] : heatMaterial;
          if (heatShader instanceof THREE.ShaderMaterial) {
            heatShader.uniforms.uStressLevels.value = buildVisualStressArray(stressedRegionLevels);
            heatShader.uniforms.uSelectedIndex.value = selectedRegionId ? VISUAL_REGION_TO_INDEX[selectedRegionId] : -1;
            heatShader.uniforms.uHoveredIndex.value = hoveredRegionId ? VISUAL_REGION_TO_INDEX[hoveredRegionId] : -1;
          }
        }
      });
    });
  });

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.object.userData?.overlayKind === "edges") {
      return;
    }
    const hasMaskTexture = hasMaskTextureInHierarchy(event.object);
    const uvCandidates = [
      event.uv,
      ...event.intersections.map((intersection) => intersection.uv),
    ];
    const maskRegion = resolveRegionFromUvMaskCandidates(event.object, uvCandidates);
    if (hasMaskTexture) {
      onRegionHover(maskRegion);
      return;
    }
    const staticRegion = resolveRegionIdFromObject(event.object);
    const dynamicRegion = hasDynamicRegionRouting(event.object) ? inferRegionFromHitPoint(event.point, event.object) : null;
    onRegionHover(maskRegion ?? dynamicRegion ?? staticRegion);
  };

  const onPointerOut = () => onRegionHover(null);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.object.userData?.overlayKind === "edges") {
      return;
    }
    const hasMaskTexture = hasMaskTextureInHierarchy(event.object);
    const uvCandidates = [
      event.uv,
      ...event.intersections.map((intersection) => intersection.uv),
    ];
    const maskRegion = resolveRegionFromUvMaskCandidates(event.object, uvCandidates);
    if (hasMaskTexture) {
      if (maskRegion) onRegionSelect(maskRegion);
      return;
    }
    const staticRegion = resolveRegionIdFromObject(event.object);
    const dynamicRegion = hasDynamicRegionRouting(event.object) ? inferRegionFromHitPoint(event.point, event.object) : null;
    const regionId = maskRegion ?? dynamicRegion ?? staticRegion;
    if (regionId) onRegionSelect(regionId);
  };

  return (
    <group ref={rootRef} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onPointerDown={onPointerDown}>
      <group position={modelFit.offset.toArray()} scale={[modelFit.scale, modelFit.scale, modelFit.scale]}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

function ExoskeletonFallback({
  morph,
  selectedRegionId,
  hoveredRegionId,
  stressedRegionLevels,
  regionById,
  onRegionHover,
  onRegionSelect,
}: ExoskeletonFallbackProps) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;
    const t = state.clock.getElapsedTime();

    root.rotation.x = Math.sin(t * 0.65) * 0.015;
    root.position.y = Math.sin(t * 1.1) * 0.02;
    root.scale.set(
      0.84 + (morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 0.12,
      0.9 + morph.torsoScale * 0.08 + morph.legScale * 0.2,
      0.86 + morph.hipScale * 0.08,
    );

    root.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      const regionId = mesh.userData.regionId as VisualRegionId | undefined;
      if (!regionId) return;
      if (!regionById.has(regionId)) return;

      const stressLevel = getVisualStressLevel(stressedRegionLevels, regionId);
      const isStressed = stressLevel >= STRESS_MIN_VISUAL;
      const color = isStressed ? getStressTone(stressLevel) : BASE_MODEL_BLUE;
      const selected = selectedRegionId === regionId;
      const hovered = hoveredRegionId === regionId;
      material.color.copy(color.clone().multiplyScalar(0.3));
      material.emissive.copy(selected ? color : color.clone().multiplyScalar(hovered ? 0.55 : 0.35));
      material.emissiveIntensity = selected ? 2.1 + stressLevel * 0.5 : hovered ? 1.35 + stressLevel * 0.35 : 0.78 + stressLevel * 0.28;
      material.metalness = 0.82;
      material.roughness = 0.25;
      material.transparent = true;
      material.opacity = selected ? 0.88 : isStressed ? 0.8 : 0.74;
    });
  });

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onRegionHover(resolveRegionIdFromObject(event.object));
  };

  const onPointerOut = () => onRegionHover(null);

  const onPointerDown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const regionId = resolveRegionIdFromObject(event.object);
    if (regionId) onRegionSelect(regionId);
  };

  return (
    <group ref={rootRef} onPointerMove={onPointerMove} onPointerOut={onPointerOut} onPointerDown={onPointerDown}>
      <mesh position={[-0.88, 0.62, 0.28]} scale={[0.12, 0.22, 0.12]} userData={{ regionId: "FINGERS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0.88, 0.62, 0.28]} scale={[0.12, 0.22, 0.12]} userData={{ regionId: "FINGERS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[-0.74, 0.92, 0.16]} scale={[0.16, 0.44, 0.16]} userData={{ regionId: "FOREARMS" }}>
        <capsuleGeometry args={[0.3, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0.74, 0.92, 0.16]} scale={[0.16, 0.44, 0.16]} userData={{ regionId: "FOREARMS" }}>
        <capsuleGeometry args={[0.3, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[-0.62, 1.24, 0.2]} scale={[0.2, 0.46, 0.18]} userData={{ regionId: "BICEPS" }}>
        <capsuleGeometry args={[0.34, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0.62, 1.24, 0.2]} scale={[0.2, 0.46, 0.18]} userData={{ regionId: "BICEPS" }}>
        <capsuleGeometry args={[0.34, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[-0.62, 1.24, -0.2]} scale={[0.2, 0.46, 0.18]} userData={{ regionId: "TRICEPS" }}>
        <capsuleGeometry args={[0.34, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0.62, 1.24, -0.2]} scale={[0.2, 0.46, 0.18]} userData={{ regionId: "TRICEPS" }}>
        <capsuleGeometry args={[0.34, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0, 1.48, 0]} scale={[1.18, 0.32, 0.44]} userData={{ regionId: "SHOULDERS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 1.74, -0.08]} scale={[0.52, 0.2, 0.28]} userData={{ regionId: "TRAPS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0, 1.2, -0.18]} scale={[0.96, 0.62, 0.24]} userData={{ regionId: "LATS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 1.2, 0.18]} scale={[0.96, 0.6, 0.24]} userData={{ regionId: "CHEST" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 0.8, 0.18]} scale={[0.66, 0.5, 0.24]} userData={{ regionId: "ABS" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>

      <mesh position={[0, 0.36, -0.08]} scale={[0.78, 0.38, 0.28]} userData={{ regionId: "GLUTES" }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, -0.46, 0.12]} scale={[0.68, 1.14, 0.22]} userData={{ regionId: "QUADS" }}>
        <capsuleGeometry args={[0.36, 1.2, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, -0.46, -0.12]} scale={[0.68, 1.14, 0.22]} userData={{ regionId: "HAMSTRINGS" }}>
        <capsuleGeometry args={[0.36, 1.2, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, -1.46, 0]} scale={[0.5, 0.74, 0.2]} userData={{ regionId: "CALVES" }}>
        <capsuleGeometry args={[0.3, 0.9, 8, 12]} />
        <meshStandardMaterial />
      </mesh>
    </group>
  );
}

export function BodyRecoveryDiagram({ view, insights = {}, stressedRegionLevels = {}, activityCodename, input }: BodyRecoveryDiagramProps) {
  const [selectedRegionId, setSelectedRegionId] = useState<VisualRegionId | null>(null);
  const [hoveredRegionId, setHoveredRegionId] = useState<VisualRegionId | null>(null);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);

  const baseRegionById = useMemo(() => new Map(view.regions.map((region) => [region.id, region])), [view.regions]);
  const regionById = useMemo(() => {
    const fallback = {
      readinessPct: 65,
      loadPct: 45,
      recoveryPct: 62,
      status: "MONITOR" as BodyRegionSignal["status"],
    };

    return new Map<VisualRegionId, VisualRegionSignal>(
      VISUAL_REGION_ORDER.map((regionId) => {
        const baseId = VISUAL_TO_BASE_REGION[regionId];
        const base = baseRegionById.get(baseId);
        return [
          regionId,
          {
            id: regionId,
            label: regionId,
            baseId,
            readinessPct: base?.readinessPct ?? fallback.readinessPct,
            loadPct: base?.loadPct ?? fallback.loadPct,
            recoveryPct: base?.recoveryPct ?? fallback.recoveryPct,
            status: base?.status ?? fallback.status,
          },
        ];
      }),
    );
  }, [baseRegionById]);
  const effectiveStressLevels = useMemo(() => {
    if (Object.keys(stressedRegionLevels).length > 0) {
      return stressedRegionLevels;
    }

    return Object.fromEntries(
      view.regions.map((region) => {
        const loadScore = clamp(region.loadPct / 100, 0, 1);
        const readinessPenalty = clamp((100 - region.readinessPct) / 100, 0, 1);
        const stress = clamp(loadScore * 0.65 + readinessPenalty * 0.35, 0, 1);
        return [region.id, Number(stress.toFixed(3))];
      }),
    ) as Partial<Record<BaseRegionId, number>>;
  }, [stressedRegionLevels, view.regions]);

  const morph = useMemo(() => deriveAvatarMorphParams(input, view, null), [input, view]);
  const selectedRegion = selectedRegionId ? regionById.get(selectedRegionId) ?? null : null;
  const selectedInsight = selectedRegionId ? insights[VISUAL_TO_BASE_REGION[selectedRegionId]] : undefined;
  const selectedRoute = selectedRegion ? buildRecoveryRoute(selectedRegion, activityCodename) : null;
  const widthSignal = Math.round((morph.shoulderScale * 0.34 + morph.waistScale * 0.33 + morph.hipScale * 0.33) * 100);
  const heightSignal = Math.round(clamp(84 + (input.heightCm - 160) * 0.52 + (morph.legScale - 1) * 18, 80, 152));
  const recoveryRecommendation = useMemo(() => {
    const ranked = VISUAL_REGION_ORDER.map((visualId) => ({
      visualId,
      stress: getVisualStressLevel(effectiveStressLevels, visualId),
      etaDays: insights[VISUAL_TO_BASE_REGION[visualId]]?.etaDays ?? null,
    }))
      .sort((a, b) => b.stress - a.stress);
    const top = ranked[0];
    if (!top || top.stress < STRESS_MIN_VISUAL) {
      return null;
    }
    const etaDays = top.etaDays ?? Math.max(1, Math.ceil(top.stress * 3));
    const etaHours = Math.max(12, etaDays * 24);
    return {
      visualId: top.visualId,
      etaDays,
      etaHours,
      stressPct: Math.round(top.stress * 100),
    };
  }, [effectiveStressLevels, insights]);

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
        <h2 className="text-xs tracking-[0.22em] text-cyan-500">3D EXOSKELETON INTERFACE</h2>
        {selectedRegionId ? (
          <button
            type="button"
            onClick={() => setSelectedRegionId(null)}
            className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300"
          >
            RESET SELECTION
          </button>
        ) : null}
      </div>

      <div className="mt-4 border border-cyan-500/30 p-2">
        <div className="relative h-[560px] w-full overflow-hidden border border-cyan-500/20">
          <Canvas camera={{ position: [0, 1.08, 5.6], fov: 30 }} gl={{ antialias: true }}>
            <color attach="background" args={["#02070c"]} />
            <fog attach="fog" args={["#02070c", 4.8, 10]} />
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
                  selectedRegionId={selectedRegionId}
                  hoveredRegionId={hoveredRegionId}
                  stressedRegionLevels={effectiveStressLevels}
                  regionById={regionById}
                  onRegionHover={setHoveredRegionId}
                  onRegionSelect={(regionId) => setSelectedRegionId((current) => (current === regionId ? null : regionId))}
                />
              ) : (
                <ExoskeletonFallback
                  morph={morph}
                  selectedRegionId={selectedRegionId}
                  hoveredRegionId={hoveredRegionId}
                  stressedRegionLevels={effectiveStressLevels}
                  regionById={regionById}
                  onRegionHover={setHoveredRegionId}
                  onRegionSelect={(regionId) => setSelectedRegionId((current) => (current === regionId ? null : regionId))}
                />
              )}
            </Suspense>

            <OrbitControls enablePan={false} minDistance={3.8} maxDistance={8.8} target={[0, 0.94, 0]} />
          </Canvas>
          {recoveryRecommendation ? (
            <div className="pointer-events-none absolute left-1/2 top-6 z-20 w-[min(88vw,280px)] -translate-x-1/2">
              <div className="border border-[#ff922e]/75 bg-black/92 px-3 py-2 text-center font-mono shadow-[0_0_18px_rgba(255,146,46,0.25)]">
                <p className="text-[10px] tracking-[0.16em] text-[#ffb45f]">RECOVERY DIRECTIVE</p>
                <p className="mt-1 text-xs text-[#ffd4a3]">
                  {recoveryRecommendation.visualId} | ETA {recoveryRecommendation.etaHours}H ({recoveryRecommendation.etaDays}D)
                </p>
                <p className="mt-1 text-[10px] text-[#ffb45f]/85">STRESS LEVEL {recoveryRecommendation.stressPct}%</p>
              </div>
              <div className="mx-auto h-0 w-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#ff922e]/75" />
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-500/85">DRAG TO ROTATE 360 | CLICK MUSCLE GROUP TO SELECT</p>
        {modelAvailable === false ? (
          <p className="mt-2 border border-cyan-500/30 px-2 py-1 text-[10px] tracking-[0.12em] text-cyan-300/90">
            EXOSKELETON PROXY ACTIVE. PLACE `human-avatar.glb` IN `app/public/anatomy/` TO OVERRIDE WITH CUSTOM 3D MODEL.
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
