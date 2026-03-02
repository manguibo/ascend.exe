"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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

type CameraFocusControllerProps = {
  selectedRegionId: VisualRegionId | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
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
const MASK_URL = "/anatomy/ascend_muscle_id_clean.png";
const CYBER_SHELL_SCALE = 1.008;
const BASE_MODEL_BLUE = new THREE.Color("#4b8dff");
const STRESS_YELLOW = new THREE.Color("#ffe066");
const STRESS_ORANGE = new THREE.Color("#ff922e");
const STRESS_RED = new THREE.Color("#ff3b1f");
const STRESS_MIN_VISUAL = 0.14;

const HEX_TO_VISUAL_REGION: Record<string, VisualRegionId> = {
  "#ff0000": "CHEST",
  "#ff3600": "SHOULDERS",
  "#ff0036": "TRAPS",
  "#ff00ff": "LATS",
  "#ffff00": "BICEPS",
  "#36ff00": "TRICEPS",
  "#00ff00": "FOREARMS",
  "#00ff36": "ABS",
  "#ffffff": "FINGERS",
  "#00ffff": "QUADS",
  "#0000ff": "GLUTES",
  "#0036ff": "HAMSTRINGS",
  "#3600ff": "CALVES",
};
const MASK_BACKGROUND_MAX = 6;
const CAMERA_DEFAULT_POSITION = [0, 1.1, 6.2] as const;
const CAMERA_DEFAULT_TARGET = [0, 0.94, 0] as const;
const CAMERA_DAMPING = 5.2;

const CAMERA_MIN_FOCUS_Y = 0.94;
const CAMERA_MAX_FOCUS_Y = 2.28;
const CAMERA_MIN_FOCUS_TARGET_Y = 0.42;
const CAMERA_MAX_FOCUS_TARGET_Y = 1.82;

const CAMERA_FOCUS_BY_REGION: Record<VisualRegionId, { target: readonly [number, number, number]; distance: number }> = {
  FINGERS: { target: [0, 0.72, 0.42], distance: 2.7 },
  FOREARMS: { target: [0, 0.96, 0.28], distance: 2.8 },
  BICEPS: { target: [0, 1.24, 0.2], distance: 2.75 },
  TRICEPS: { target: [0, 1.22, -0.18], distance: 2.82 },
  SHOULDERS: { target: [0, 1.48, 0], distance: 2.7 },
  LATS: { target: [0, 1.2, -0.2], distance: 2.84 },
  TRAPS: { target: [0, 1.74, -0.08], distance: 2.76 },
  CHEST: { target: [0, 1.2, 0.2], distance: 2.76 },
  ABS: { target: [0, 0.94, 0.18], distance: 3.25 },
  GLUTES: { target: [0, 0.82, -0.08], distance: 3.36 },
  QUADS: { target: [0, 0.74, 0.12], distance: 3.54 },
  HAMSTRINGS: { target: [0, 0.72, -0.12], distance: 3.62 },
  CALVES: { target: [0, 0.6, 0], distance: 3.84 },
};

const VISUAL_REGION_TO_INDEX: Record<VisualRegionId, number> = Object.fromEntries(
  VISUAL_REGION_ORDER.map((regionId, index) => [regionId, index]),
) as Record<VisualRegionId, number>;

const textureSamplingCanvas = new WeakMap<THREE.Texture, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; width: number; height: number }>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatVisualRegionLabel(regionId: VisualRegionId): string {
  return regionId.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
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

function toHexColor(r: number, g: number, b: number): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
  const yUvToCanvas = Math.floor((1 - v) * sampling.height);
  const yRawCanvas = Math.floor(v * sampling.height);
  const uvToCanvasRgba = sampling.ctx.getImageData(x, yUvToCanvas, 1, 1).data;
  const rawCanvasRgba = sampling.ctx.getImageData(x, yRawCanvas, 1, 1).data;
  const uvToCanvasScore =
    ((uvToCanvasRgba[0] <= MASK_BACKGROUND_MAX && uvToCanvasRgba[1] <= MASK_BACKGROUND_MAX && uvToCanvasRgba[2] <= MASK_BACKGROUND_MAX) ? 0 : 2) +
    (uvToCanvasRgba[3] > 0 ? 1 : 0);
  const rawCanvasScore =
    ((rawCanvasRgba[0] <= MASK_BACKGROUND_MAX && rawCanvasRgba[1] <= MASK_BACKGROUND_MAX && rawCanvasRgba[2] <= MASK_BACKGROUND_MAX) ? 0 : 2) +
    (rawCanvasRgba[3] > 0 ? 1 : 0);
  const chosen = rawCanvasScore > uvToCanvasScore ? rawCanvasRgba : uvToCanvasRgba;
  const [r, g, b, a] = chosen;
  if (a <= 3) {
    return null;
  }

  const hex = toHexColor(r, g, b).toLowerCase();
  return HEX_TO_VISUAL_REGION[hex] ?? null;
}

function resolveRegionFromUvMaskCandidates(maskTexture: THREE.Texture, uvCandidates: readonly (THREE.Vector2 | undefined)[]): VisualRegionId | null {
  if (uvCandidates.length === 0) {
    return null;
  }

  for (const uv of uvCandidates) {
    if (!uv) continue;
    const sampledRegion = sampleMaskRegionAtUv(maskTexture, uv);
    if (sampledRegion) {
      return sampledRegion;
    }
  }

  return null;
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

function resolveRegionIdFromObject(object: THREE.Object3D): VisualRegionId | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const regionId = node.userData?.regionId as VisualRegionId | undefined;
    if (regionId) return regionId;
    node = node.parent;
  }
  return null;
}

function CameraFocusController({ selectedRegionId, controlsRef }: CameraFocusControllerProps) {
  const { camera } = useThree();
  const targetPositionRef = useRef(new THREE.Vector3(...CAMERA_DEFAULT_POSITION));
  const targetLookAtRef = useRef(new THREE.Vector3(...CAMERA_DEFAULT_TARGET));
  const focusActiveRef = useRef(false);
  const focusDirectionRef = useRef(new THREE.Vector3(0, 0, 1));

  useEffect(() => {
    if (!selectedRegionId) {
      focusActiveRef.current = false;
      targetPositionRef.current.set(...CAMERA_DEFAULT_POSITION);
      targetLookAtRef.current.set(...CAMERA_DEFAULT_TARGET);
      camera.position.set(...CAMERA_DEFAULT_POSITION);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(...CAMERA_DEFAULT_TARGET);
        controls.update();
      } else {
        camera.lookAt(targetLookAtRef.current);
      }
      return;
    }
    focusActiveRef.current = true;
    const focus = CAMERA_FOCUS_BY_REGION[selectedRegionId];
    const controls = controlsRef.current;
    const orbitTarget = controls ? controls.target : targetLookAtRef.current;
    focusDirectionRef.current.copy(camera.position).sub(orbitTarget);
    if (focusDirectionRef.current.lengthSq() < 0.0001) {
      focusDirectionRef.current.set(0, 0, 1);
    } else {
      focusDirectionRef.current.normalize();
    }
    focusDirectionRef.current.y = clamp(focusDirectionRef.current.y, -0.14, 0.32);
    focusDirectionRef.current.normalize();
    const nextTarget = focus.target;
    const nextPosition = new THREE.Vector3(...nextTarget).addScaledVector(focusDirectionRef.current, focus.distance);
    const clampedTargetY = clamp(nextTarget[1], CAMERA_MIN_FOCUS_TARGET_Y, CAMERA_MAX_FOCUS_TARGET_Y);
    targetLookAtRef.current.set(nextTarget[0], clampedTargetY, nextTarget[2]);
    nextPosition.y = clamp(nextPosition.y, CAMERA_MIN_FOCUS_Y, CAMERA_MAX_FOCUS_Y);
    targetPositionRef.current.copy(nextPosition);
  }, [camera, controlsRef, selectedRegionId]);

  useFrame((_, delta) => {
    if (!focusActiveRef.current) {
      return;
    }
    const smoothing = 1 - Math.exp(-delta * CAMERA_DAMPING);
    camera.position.lerp(targetPositionRef.current, smoothing);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerp(targetLookAtRef.current, smoothing);
      controls.update();
      return;
    }
    camera.lookAt(targetLookAtRef.current);
  });

  return null;
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

      float colorDistance(vec3 a, vec3 b) {
        vec3 d = a - b;
        return dot(d, d);
      }

      float resolveRegionIndex(vec3 color) {
        if (color.r <= 0.02 && color.g <= 0.02 && color.b <= 0.02) return -1.0;

        float bestIdx = -1.0;
        float bestDist = 9999.0;

        float d0 = colorDistance(color, vec3(1.0, 1.0, 1.0)); // FINGERS #ffffff
        if (d0 < bestDist) { bestDist = d0; bestIdx = 0.0; }
        float d1 = colorDistance(color, vec3(0.0, 1.0, 0.0)); // FOREARMS #00ff00
        if (d1 < bestDist) { bestDist = d1; bestIdx = 1.0; }
        float d2 = colorDistance(color, vec3(1.0, 1.0, 0.0)); // BICEPS #ffff00
        if (d2 < bestDist) { bestDist = d2; bestIdx = 2.0; }
        float d3 = colorDistance(color, vec3(0.2118, 1.0, 0.0)); // TRICEPS #36ff00
        if (d3 < bestDist) { bestDist = d3; bestIdx = 3.0; }
        float d4 = colorDistance(color, vec3(1.0, 0.2118, 0.0)); // SHOULDERS #ff3600
        if (d4 < bestDist) { bestDist = d4; bestIdx = 4.0; }
        float d5 = colorDistance(color, vec3(1.0, 0.0, 1.0)); // LATS #ff00ff
        if (d5 < bestDist) { bestDist = d5; bestIdx = 5.0; }
        float d6 = colorDistance(color, vec3(1.0, 0.0, 0.2118)); // TRAPS #ff0036
        if (d6 < bestDist) { bestDist = d6; bestIdx = 6.0; }
        float d7 = colorDistance(color, vec3(1.0, 0.0, 0.0)); // CHEST #ff0000
        if (d7 < bestDist) { bestDist = d7; bestIdx = 7.0; }
        float d8 = colorDistance(color, vec3(0.0, 1.0, 0.2118)); // ABS #00ff36
        if (d8 < bestDist) { bestDist = d8; bestIdx = 8.0; }
        float d9 = colorDistance(color, vec3(0.0, 0.0, 1.0)); // GLUTES #0000ff
        if (d9 < bestDist) { bestDist = d9; bestIdx = 9.0; }
        float d10 = colorDistance(color, vec3(0.0, 1.0, 1.0)); // QUADS #00ffff
        if (d10 < bestDist) { bestDist = d10; bestIdx = 10.0; }
        float d11 = colorDistance(color, vec3(0.0, 0.2118, 1.0)); // HAMSTRINGS #0036ff
        if (d11 < bestDist) { bestDist = d11; bestIdx = 11.0; }
        float d12 = colorDistance(color, vec3(0.2118, 0.0, 1.0)); // CALVES #3600ff
        if (d12 < bestDist) { bestDist = d12; bestIdx = 12.0; }

        if (bestDist > 0.09) return -1.0;
        return bestIdx;
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
        vec3 maskColor = texture2D(uMaskMap, vUv).rgb;
        float idx = resolveRegionIndex(maskColor);
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
  const idMaskTexture = useLoader(THREE.TextureLoader, MASK_URL);
  const samplingTexture = useMemo(() => {
    const texture = idMaskTexture.clone();
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [idMaskTexture]);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const meshNodes = useMemo(() => {
    const nodes: THREE.Mesh[] = [];
    cloned.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        nodes.push(node as THREE.Mesh);
      }
    });
    return nodes;
  }, [cloned]);
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
    meshNodes.forEach((mesh) => {
      const regionId: VisualRegionId = "ABS";
      mesh.userData.regionId = regionId;
      mesh.userData.dynamicRegion = true;

      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((item) => item.clone());
      } else if (mesh.material) {
        mesh.material = mesh.material.clone();
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

        if (!mesh.children.some((child) => child.userData?.overlayKind === "mask-heat")) {
          const heatOverlay = new THREE.Mesh(mesh.geometry, createMaskHeatMaterial(samplingTexture));
          heatOverlay.scale.setScalar(CYBER_SHELL_SCALE + 0.0018);
          heatOverlay.renderOrder = 4;
          heatOverlay.userData.overlayPart = true;
          heatOverlay.userData.overlayKind = "mask-heat";
          heatOverlay.userData.dynamicRegion = true;
          mesh.add(heatOverlay);
        }
      }
    });
  }, [meshNodes, samplingTexture]);

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
  });

  const stressUniformArray = useMemo(
    () => buildVisualStressArray(stressedRegionLevels),
    [stressedRegionLevels],
  );

  useEffect(() => {
    meshNodes.forEach((mesh) => {
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
            heatShader.uniforms.uStressLevels.value = stressUniformArray;
            heatShader.uniforms.uSelectedIndex.value = selectedRegionId ? VISUAL_REGION_TO_INDEX[selectedRegionId] : -1;
            heatShader.uniforms.uHoveredIndex.value = hoveredRegionId ? VISUAL_REGION_TO_INDEX[hoveredRegionId] : -1;
          }
        }
      });
    });
  }, [hoveredRegionId, meshNodes, regionById, selectedRegionId, stressUniformArray, stressedRegionLevels]);

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.object.userData?.overlayKind === "edges") {
      return;
    }
    const uvCandidates = [
      event.uv,
      ...event.intersections.map((intersection) => intersection.uv),
    ];
    const maskRegion = resolveRegionFromUvMaskCandidates(samplingTexture, uvCandidates);
    onRegionHover(maskRegion);
  };

  const onPointerOut = () => onRegionHover(null);

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.object.userData?.overlayKind === "edges") {
      return;
    }
    const uvCandidates = [
      event.uv,
      ...event.intersections.map((intersection) => intersection.uv),
    ];
    const maskRegion = resolveRegionFromUvMaskCandidates(samplingTexture, uvCandidates);
    if (maskRegion) onRegionSelect(maskRegion);
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
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

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
  const recoveryRecommendations = useMemo(() => {
    return VISUAL_REGION_ORDER.map((visualId) => {
      const stress = getVisualStressLevel(effectiveStressLevels, visualId);
      const region = regionById.get(visualId);
      const etaDays = insights[VISUAL_TO_BASE_REGION[visualId]]?.etaDays ?? null;
      const fallbackEtaDays = Math.max(1, Math.ceil(stress * 3));
      const resolvedEtaDays = etaDays ?? fallbackEtaDays;
      const requiresRest = stress >= STRESS_MIN_VISUAL && (region?.status === "RECOVER" || (region?.loadPct ?? 0) >= 70);
      return {
        visualId,
        stress,
        stressPct: Math.round(stress * 100),
        etaDays: resolvedEtaDays,
        etaHours: Math.max(12, resolvedEtaDays * 24),
        requiresRest,
      };
    })
      .filter((entry) => entry.requiresRest)
      .sort((a, b) => b.stress - a.stress);
  }, [effectiveStressLevels, insights, regionById]);
  const stressLeaderboard = useMemo(() => {
    return VISUAL_REGION_ORDER.map((regionId) => {
      const stress = getVisualStressLevel(effectiveStressLevels, regionId);
      return {
        regionId,
        stress,
        stressPct: Math.round(stress * 100),
      };
    })
      .sort((a, b) => b.stress - a.stress)
      .slice(0, 5);
  }, [effectiveStressLevels]);

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
          <Canvas
            camera={{ position: [...CAMERA_DEFAULT_POSITION], fov: 30 }}
            dpr={[1, 1.6]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
          >
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

            <CameraFocusController selectedRegionId={selectedRegionId} controlsRef={controlsRef} />
            <OrbitControls ref={controlsRef} enablePan={false} minDistance={2.8} maxDistance={8.8} target={[...CAMERA_DEFAULT_TARGET]} />
          </Canvas>
          {recoveryRecommendations.length > 0 ? (
            <div className="pointer-events-none absolute left-4 top-4 z-20 w-[min(42vw,320px)]">
              <div className="pointer-events-auto border border-[#ff922e]/75 bg-black/92 px-3 py-2 font-mono shadow-[0_0_18px_rgba(255,146,46,0.25)]">
                <p className="text-[10px] tracking-[0.16em] text-[#ffb45f]">RECOVERY DIRECTIVE</p>
                <p className="mt-1 text-[10px] tracking-[0.14em] text-[#ffd4a3]/85">
                  {recoveryRecommendations.length} MUSCLE GROUP{recoveryRecommendations.length === 1 ? "" : "S"} REQUIRE REST
                </p>
                <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto pr-1">
                  {recoveryRecommendations.map((entry) => (
                    <p key={`recovery-${entry.visualId}`} className="border border-[#ff922e]/35 px-2 py-1 text-[11px] text-[#ffd4a3]">
                      {formatVisualRegionLabel(entry.visualId)} | ETA {entry.etaHours}H ({entry.etaDays}D) | STRESS {entry.stressPct}%
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute left-4 top-4 z-20">
              <p className="border border-cyan-500/45 bg-black/80 px-3 py-2 text-[10px] tracking-[0.14em] text-cyan-300">
                RECOVERY DIRECTIVE: NO IMMEDIATE MUSCLE REST ALERTS.
              </p>
            </div>
          )}
          <div className="pointer-events-none absolute right-4 top-4 z-20 w-[min(38vw,290px)]">
            <div className="border border-cyan-500/50 bg-black/86 px-3 py-2 font-mono shadow-[0_0_16px_rgba(73,221,255,0.18)]">
              <p className="text-[10px] tracking-[0.16em] text-cyan-400">FOCUS TELEMETRY</p>
              <p className="mt-1 text-[11px] text-cyan-200/95">
                TARGET {selectedRegionId ? formatVisualRegionLabel(selectedRegionId) : "NONE"}
              </p>
              <p className="mt-1 text-[10px] tracking-[0.12em] text-cyan-300/80">
                {selectedRegionId ? "CAMERA LOCK ACTIVE" : "SELECT A REGION TO ENGAGE CAMERA LOCK"}
              </p>
              <div className="mt-2 grid gap-1">
                {stressLeaderboard.map((entry, index) => (
                  <p key={`focus-${entry.regionId}`} className="border border-cyan-500/25 px-2 py-1 text-[10px] text-cyan-200/90">
                    {index + 1}. {formatVisualRegionLabel(entry.regionId)} | LOAD {entry.stressPct}%
                  </p>
                ))}
              </div>
            </div>
          </div>
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
