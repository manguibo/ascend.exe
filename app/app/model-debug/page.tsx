"use client";

import { Canvas, type ThreeEvent, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ClampToEdgeWrapping,
  Color,
  Group,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  NoColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";
import type { GLTF } from "three-stdlib";

const MODEL_URL = "/models/human-avatar.glb";
const MASK_URL = "/anatomy/ascend_muscle_id_clean.png";
const DEFAULT_MODEL_COLOR = new Color("#8ec5ff");

const HEX_TO_MUSCLE_NAME: Record<string, string> = {
  // Fill in with your actual mapping.
};

type DebugGltf = GLTF & {
  scene: Group;
};

type LastSample = {
  meshName: string;
  uv: { u: number; v: number };
  x: number;
  y: number;
  hex: string;
  muscleName: string | null;
};

type CanvasSampler = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toHexColor(r: number, g: number, b: number): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function createCanvasSampler(texture: Texture): CanvasSampler | null {
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
  return { ctx, width, height };
}

function AvatarModel({
  onSample,
}: {
  onSample: (sample: LastSample) => void;
}) {
  const gltf = useGLTF(MODEL_URL) as DebugGltf;
  const idMaskTexture = useLoader(TextureLoader, MASK_URL);
  const samplingTexture = useMemo(() => {
    const texture = idMaskTexture.clone();
    texture.colorSpace = NoColorSpace;
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [idMaskTexture]);
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const samplerRef = useRef<CanvasSampler | null>(null);
  const reusableUv = useRef(new Vector2());

  useEffect(() => {
    samplerRef.current = createCanvasSampler(samplingTexture);
  }, [samplingTexture]);

  useMemo(() => {
    clonedScene.traverse((obj) => {
      if (!(obj instanceof Mesh)) {
        return;
      }

      const applyColor = (mat: unknown) => {
        if (!(mat instanceof MeshStandardMaterial)) {
          return;
        }
        mat.color = DEFAULT_MODEL_COLOR.clone();
        mat.transparent = false;
        if (mat.map) {
          mat.map.minFilter = LinearFilter;
          mat.map.magFilter = LinearFilter;
          mat.map.needsUpdate = true;
        }
      };

      if (Array.isArray(obj.material)) {
        obj.material.forEach(applyColor);
      } else {
        applyColor(obj.material);
      }
    });
  }, [clonedScene]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const sampler = samplerRef.current;
    if (!sampler) {
      console.warn("[model-debug] ID mask sampler not ready.");
      return;
    }

    const hit = event.intersections.find((intersection) => intersection.uv && intersection.object instanceof Mesh);
    if (!hit?.uv) {
      console.warn("[model-debug] No mesh UV available at click.");
      return;
    }

    reusableUv.current.copy(hit.uv);
    samplingTexture.transformUv(reusableUv.current);

    const u = clamp(reusableUv.current.x, 0, 0.999999);
    const v = clamp(reusableUv.current.y, 0, 0.999999);
    const x = Math.floor(u * sampler.width);
    const y = Math.floor((1 - v) * sampler.height);
    const [r, g, b] = sampler.ctx.getImageData(x, y, 1, 1).data;
    const hex = toHexColor(r, g, b);
    const muscleName = HEX_TO_MUSCLE_NAME[hex.toLowerCase()] ?? null;
    const meshName = hit.object.name || "(unnamed-mesh)";

    console.log("[model-debug] sample", {
      meshName,
      uv: { u, v },
      x,
      y,
      hex,
      muscleName,
    });

    onSample({
      meshName,
      uv: { u, v },
      x,
      y,
      hex,
      muscleName,
    });
  };

  return <primitive object={clonedScene} onPointerDown={handlePointerDown} />;
}

export default function ModelDebugPage() {
  const [lastSample, setLastSample] = useState<LastSample | null>(null);

  return (
    <main className="min-h-screen bg-[#050a14] text-cyan-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold tracking-wide">Model Debug: UV ID Mask Picker</h1>
        <p className="text-sm text-cyan-200/80">
          Click the avatar to sample `ascend_muscle_id_clean.png` by UV and log mesh name, UV, pixel coords, and hex color.
        </p>
        <div className="h-[72vh] w-full overflow-hidden rounded-md border border-cyan-400/30 bg-black">
          <Canvas camera={{ position: [0, 1.3, 2.2], fov: 45 }}>
            <color attach="background" args={["#02060f"]} />
            <ambientLight intensity={0.65} />
            <directionalLight position={[4, 6, 3]} intensity={1.1} />
            <directionalLight position={[-3, 4, -2]} intensity={0.45} />
            <Suspense fallback={null}>
              <AvatarModel onSample={setLastSample} />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
        </div>
        <p className="text-sm text-cyan-200/90">
          Last sample:{" "}
          {lastSample
            ? `${lastSample.meshName} | UV(${lastSample.uv.u.toFixed(4)}, ${lastSample.uv.v.toFixed(4)}) | px(${lastSample.x}, ${lastSample.y}) | ${lastSample.hex}`
            : "none yet"}
        </p>
      </section>
    </main>
  );
}

useGLTF.preload(MODEL_URL);
