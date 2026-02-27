import type { AvatarMorphParams } from "./avatar-profile";

export type AvatarSurface = "FRONT" | "BACK";

export type AvatarRigSegment = {
  id: string;
  d: string;
  tone: "shell" | "core" | "limb";
  width: number;
};

export type AvatarRigGeometry = {
  shellPath: string;
  segments: readonly AvatarRigSegment[];
};

function roundedRectPath(cx: number, cy: number, halfWidth: number, halfHeight: number, radius: number): string {
  const left = cx - halfWidth;
  const right = cx + halfWidth;
  const top = cy - halfHeight;
  const bottom = cy + halfHeight;
  const r = Math.min(radius, halfWidth, halfHeight);

  return [
    `M ${left + r} ${top}`,
    `L ${right - r} ${top}`,
    `Q ${right} ${top} ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top}`,
    "Z",
  ].join(" ");
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return [
    `M ${cx - rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy}`,
    `A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function buildShellPath(morph: AvatarMorphParams): string {
  const cx = 450 + morph.postureLeanDeg * 0.8;
  const topY = 102;
  const neckY = 130;
  const shoulderY = 154;
  const chestY = 210;
  const waistY = 286;
  const hipY = 334;
  const kneeY = 434;
  const ankleY = 503;
  const shoulderHalf = 54 * morph.shoulderScale;
  const chestHalf = 46 * ((morph.shoulderScale + morph.waistScale) / 2);
  const waistHalf = 33 * morph.waistScale;
  const hipHalf = 41 * morph.hipScale;
  const kneeHalf = 22 * morph.legScale;
  const ankleHalf = 11 * morph.legScale;

  return [
    `M ${cx - 16} ${topY}`,
    `C ${cx - 16} ${neckY - 12}, ${cx + 16} ${neckY - 12}, ${cx + 16} ${topY}`,
    `C ${cx + 18} ${neckY + 8}, ${cx + shoulderHalf} ${shoulderY - 8}, ${cx + shoulderHalf} ${shoulderY + 8}`,
    `C ${cx + chestHalf} ${chestY - 6}, ${cx + waistHalf} ${waistY - 10}, ${cx + hipHalf} ${hipY}`,
    `C ${cx + hipHalf - 5} ${hipY + 38}, ${cx + kneeHalf} ${kneeY}, ${cx + ankleHalf} ${ankleY}`,
    `L ${cx - ankleHalf} ${ankleY}`,
    `C ${cx - kneeHalf} ${kneeY}, ${cx - hipHalf + 5} ${hipY + 38}, ${cx - hipHalf} ${hipY}`,
    `C ${cx - waistHalf} ${waistY - 10}, ${cx - chestHalf} ${chestY - 6}, ${cx - shoulderHalf} ${shoulderY + 8}`,
    `C ${cx - shoulderHalf} ${shoulderY - 8}, ${cx - 18} ${neckY + 8}, ${cx - 16} ${topY}`,
    "Z",
  ].join(" ");
}

export function buildAvatarRigGeometry(morph: AvatarMorphParams, surface: AvatarSurface): AvatarRigGeometry {
  const cx = 450 + morph.postureLeanDeg * 0.8;
  const skullY = 108;
  const shoulderY = 170;
  const chestY = 212;
  const waistY = 286;
  const hipY = 338;
  const thighY = 392;
  const shinY = 456;
  const armY = 246;
  const forearmY = 300;
  const skullRx = 18 * (0.92 + morph.torsoScale * 0.1);
  const skullRy = 24 * (0.9 + morph.torsoScale * 0.08);
  const shoulderHalf = 52 * morph.shoulderScale;
  const chestHalf = 41 * ((morph.shoulderScale + morph.waistScale) / 2);
  const waistHalf = 30 * morph.waistScale;
  const hipHalf = 37 * morph.hipScale;
  const thighHalf = 14 * morph.legScale;
  const shinHalf = 10 * morph.legScale;
  const upperArmHalf = 12 * morph.armScale;
  const forearmHalf = 10 * morph.armScale;
  const armOffset = shoulderHalf + 11;
  const segments: AvatarRigSegment[] = [];

  segments.push({ id: "SKULL", d: ellipsePath(cx, skullY, skullRx, skullRy), tone: "core", width: 1.2 });
  segments.push({
    id: "NECK",
    d: roundedRectPath(cx, 138, 7 * morph.torsoScale, 13 * morph.torsoScale, 4),
    tone: "core",
    width: 1.1,
  });
  segments.push({
    id: "RIBCAGE",
    d: roundedRectPath(cx, chestY, chestHalf, 34 * morph.torsoScale, 18),
    tone: "shell",
    width: 1.4,
  });
  segments.push({
    id: "WAIST",
    d: roundedRectPath(cx, waistY, waistHalf, 28 * morph.torsoScale, 16),
    tone: "shell",
    width: 1.2,
  });
  segments.push({
    id: "PELVIS",
    d: roundedRectPath(cx, hipY, hipHalf, 22 * morph.torsoScale, 13),
    tone: "shell",
    width: 1.3,
  });

  const leftUpperArmCx = cx - armOffset;
  const rightUpperArmCx = cx + armOffset;
  segments.push({ id: "L_UPPER_ARM", d: roundedRectPath(leftUpperArmCx, armY, upperArmHalf, 38 * morph.torsoScale, 10), tone: "limb", width: 1.1 });
  segments.push({ id: "R_UPPER_ARM", d: roundedRectPath(rightUpperArmCx, armY, upperArmHalf, 38 * morph.torsoScale, 10), tone: "limb", width: 1.1 });
  segments.push({ id: "L_FOREARM", d: roundedRectPath(leftUpperArmCx, forearmY, forearmHalf, 33 * morph.torsoScale, 9), tone: "limb", width: 1.1 });
  segments.push({ id: "R_FOREARM", d: roundedRectPath(rightUpperArmCx, forearmY, forearmHalf, 33 * morph.torsoScale, 9), tone: "limb", width: 1.1 });

  const leftLegCx = cx - 15 * morph.hipScale;
  const rightLegCx = cx + 15 * morph.hipScale;
  segments.push({ id: "L_THIGH", d: roundedRectPath(leftLegCx, thighY, thighHalf, 52 * morph.legScale, 11), tone: "limb", width: 1.2 });
  segments.push({ id: "R_THIGH", d: roundedRectPath(rightLegCx, thighY, thighHalf, 52 * morph.legScale, 11), tone: "limb", width: 1.2 });
  segments.push({ id: "L_SHIN", d: roundedRectPath(leftLegCx, shinY, shinHalf, 44 * morph.legScale, 9), tone: "limb", width: 1.1 });
  segments.push({ id: "R_SHIN", d: roundedRectPath(rightLegCx, shinY, shinHalf, 44 * morph.legScale, 9), tone: "limb", width: 1.1 });

  if (surface === "FRONT") {
    segments.push({
      id: "STERNUM_LINE",
      d: `M ${cx} 168 C ${cx + 1.5} 220 ${cx + 1.5} 278 ${cx} 336`,
      tone: "core",
      width: 0.9,
    });
  } else {
    segments.push({
      id: "SPINE_LINE",
      d: `M ${cx} 160 C ${cx + 1} 220 ${cx - 1} 278 ${cx} 342`,
      tone: "core",
      width: 0.9,
    });
    segments.push({
      id: "SCAPULA_LEFT",
      d: `M ${cx - 34} ${shoulderY} C ${cx - 58} ${shoulderY + 22} ${cx - 54} ${shoulderY + 52} ${cx - 34} ${shoulderY + 72}`,
      tone: "shell",
      width: 1,
    });
    segments.push({
      id: "SCAPULA_RIGHT",
      d: `M ${cx + 34} ${shoulderY} C ${cx + 58} ${shoulderY + 22} ${cx + 54} ${shoulderY + 52} ${cx + 34} ${shoulderY + 72}`,
      tone: "shell",
      width: 1,
    });
  }

  return { shellPath: buildShellPath(morph), segments };
}
