"use client";

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import { Color, Group, LinearFilter, Mesh, MeshStandardMaterial, Texture, Vector2 } from "three";
import type { GLTF } from "three-stdlib";

type MuscleEntry = {
  id: number;
  name: string;
};

const MODEL_URL = "/anatomy/human-avatar.glb";
const DEFAULT_MODEL_COLOR = new Color("#8ec5ff");
const ID_TO_MUSCLE: MuscleEntry[] = [
  { id: 15, name: "calves" },
  { id: 35, name: "quads" },
  { id: 55, name: "hamstrings" },
  { id: 75, name: "glutes" },
  { id: 95, name: "forearms" },
  { id: 115, name: "biceps" },
  { id: 135, name: "triceps" },
  { id: 145, name: "chest" },
  { id: 160, name: "core" },
  { id: 170, name: "shoulders" },
  { id: 200, name: "traps" },
  { id: 225, name: "lats" },
  { id: 240, name: "fingers" },
];

type DebugGltf = GLTF & {
  scene: Group;
};

type SampleResult = {
  sampledId: number;
  resolvedName: string;
};

function resolveMuscleName(sampledId: number): string {
  const exact = ID_TO_MUSCLE.find((entry) => entry.id === sampledId);
  if (exact) {
    return exact.name;
  }

  let nearest = ID_TO_MUSCLE[0];
  for (const entry of ID_TO_MUSCLE) {
    if (Math.abs(entry.id - sampledId) < Math.abs(nearest.id - sampledId)) {
      nearest = entry;
    }
  }

  if (Math.abs(nearest.id - sampledId) <= 8) {
    return `${nearest.name} (nearest ${nearest.id})`;
  }

  return "unknown";
}

function readMaskIdFromTexture(texture: Texture, uv: Vector2): number | null {
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

  const samplingCanvas = document.createElement("canvas");
  samplingCanvas.width = width;
  samplingCanvas.height = height;
  const ctx = samplingCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.drawImage(image as CanvasImageSource, 0, 0, width, height);

  const transformedUv = uv.clone();
  texture.transformUv(transformedUv);

  const u = Math.min(0.999999, Math.max(0, transformedUv.x));
  const v = Math.min(0.999999, Math.max(0, transformedUv.y));
  const pixelX = Math.floor(u * width);
  const pixelY = Math.floor((1 - v) * height);
  const [red] = ctx.getImageData(pixelX, pixelY, 1, 1).data;

  return red;
}

function AvatarModel({
  onSample,
}: {
  onSample: (result: SampleResult) => void;
}) {
  const gltf = useGLTF(MODEL_URL) as DebugGltf;
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const reusableUv = useRef(new Vector2());

  useMemo(() => {
    clonedScene.traverse((obj) => {
      if (!(obj instanceof Mesh)) {
        return;
      }

      const material = obj.material;
      const applyColor = (mat: unknown) => {
        if (!(mat instanceof MeshStandardMaterial)) {
          return;
        }
        mat.color = DEFAULT_MODEL_COLOR.clone();
        if (mat.map) {
          mat.map.minFilter = LinearFilter;
          mat.map.magFilter = LinearFilter;
          mat.map.needsUpdate = true;
        }
      };

      if (Array.isArray(material)) {
        material.forEach(applyColor);
      } else {
        applyColor(material);
      }
    });
  }, [clonedScene]);

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const hitObject = event.object;
    if (!(hitObject instanceof Mesh)) {
      return;
    }

    const hitUv = event.uv;
    if (!hitUv) {
      console.warn("No UV hit available on click.");
      return;
    }

    reusableUv.current.copy(hitUv);
    const material = hitObject.material;
    const materialList = Array.isArray(material) ? material : [material];

    for (const mat of materialList) {
      if (!(mat instanceof MeshStandardMaterial) || !mat.map) {
        continue;
      }

      const sampledId = readMaskIdFromTexture(mat.map, reusableUv.current);
      if (sampledId === null) {
        continue;
      }

      const resolvedName = resolveMuscleName(sampledId);
      console.log("[model-debug] muscle sample", { id: sampledId, muscle: resolvedName });
      onSample({ sampledId, resolvedName });
      return;
    }

    console.warn("Clicked mesh has no baseColor map to sample.");
  };

  return <primitive object={clonedScene} onPointerDown={handlePointerDown} />;
}

export default function ModelDebugPage() {
  const [lastSample, setLastSample] = useState<SampleResult | null>(null);

  return (
    <main className="min-h-screen bg-[#050a14] text-cyan-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold tracking-wide">Model Debug: Muscle ID Picker</h1>
        <p className="text-sm text-cyan-200/80">
          Click on the model to sample the baseColor texture mask at hit UV and print the ID mapping in the console.
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
          {lastSample ? `ID ${lastSample.sampledId} -> ${lastSample.resolvedName}` : "none yet"}
        </p>
      </section>
    </main>
  );
}

useGLTF.preload(MODEL_URL);
