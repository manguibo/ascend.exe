import type { BodyRecoveryView } from "./body-recovery";
import type { SessionLogInput } from "./session-state";

export type AvatarPhotoRatios = {
  shoulderToHeight: number;
  waistToHeight: number;
  hipToHeight: number;
  legToHeight: number;
  armToHeight: number;
  source: "PHOTO";
};

export type AvatarLandmarkId =
  | "HEAD_TOP"
  | "CHIN"
  | "LEFT_SHOULDER"
  | "RIGHT_SHOULDER"
  | "LEFT_WAIST"
  | "RIGHT_WAIST"
  | "LEFT_HIP"
  | "RIGHT_HIP"
  | "LEFT_ANKLE"
  | "RIGHT_ANKLE"
  | "LEFT_WRIST"
  | "RIGHT_WRIST";

export type AvatarLandmark = {
  id: AvatarLandmarkId;
  xPct: number;
  yPct: number;
};

export type AvatarMorphParams = {
  shoulderScale: number;
  waistScale: number;
  hipScale: number;
  armScale: number;
  legScale: number;
  torsoScale: number;
  postureLeanDeg: number;
  confidencePct: number;
};

export const AVATAR_PHOTO_CALIBRATION_STORAGE_KEY = "ascend.avatar.photo.calibration.v1";

const baselineRatios = {
  shoulderToHeight: 0.235,
  waistToHeight: 0.175,
  hipToHeight: 0.205,
  legToHeight: 0.5,
  armToHeight: 0.33,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getLandmarkMap(landmarks: readonly AvatarLandmark[]): Partial<Record<AvatarLandmarkId, AvatarLandmark>> {
  return Object.fromEntries(landmarks.map((landmark) => [landmark.id, landmark])) as Partial<Record<AvatarLandmarkId, AvatarLandmark>>;
}

export function derivePhotoRatios(landmarks: readonly AvatarLandmark[]): AvatarPhotoRatios | null {
  const map = getLandmarkMap(landmarks);
  const required: AvatarLandmarkId[] = [
    "HEAD_TOP",
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    "LEFT_WAIST",
    "RIGHT_WAIST",
    "LEFT_HIP",
    "RIGHT_HIP",
    "LEFT_ANKLE",
    "RIGHT_ANKLE",
    "LEFT_WRIST",
    "RIGHT_WRIST",
  ];
  if (required.some((key) => !map[key])) return null;

  const headTop = map.HEAD_TOP!;
  const leftShoulder = map.LEFT_SHOULDER!;
  const rightShoulder = map.RIGHT_SHOULDER!;
  const leftWaist = map.LEFT_WAIST!;
  const rightWaist = map.RIGHT_WAIST!;
  const leftHip = map.LEFT_HIP!;
  const rightHip = map.RIGHT_HIP!;
  const leftAnkle = map.LEFT_ANKLE!;
  const rightAnkle = map.RIGHT_ANKLE!;
  const leftWrist = map.LEFT_WRIST!;
  const rightWrist = map.RIGHT_WRIST!;

  const shoulderWidth = Math.abs(rightShoulder.xPct - leftShoulder.xPct);
  const waistWidth = Math.abs(rightWaist.xPct - leftWaist.xPct);
  const hipWidth = Math.abs(rightHip.xPct - leftHip.xPct);
  const ankleY = (leftAnkle.yPct + rightAnkle.yPct) / 2;
  const hipY = (leftHip.yPct + rightHip.yPct) / 2;
  const shoulderY = (leftShoulder.yPct + rightShoulder.yPct) / 2;
  const wristY = (leftWrist.yPct + rightWrist.yPct) / 2;
  const fullHeight = Math.max(0.2, ankleY - headTop.yPct);
  const legHeight = Math.max(0.08, ankleY - hipY);
  const armHeight = Math.max(0.06, wristY - shoulderY);

  return {
    shoulderToHeight: clamp(shoulderWidth / fullHeight, 0.1, 0.45),
    waistToHeight: clamp(waistWidth / fullHeight, 0.09, 0.35),
    hipToHeight: clamp(hipWidth / fullHeight, 0.11, 0.4),
    legToHeight: clamp(legHeight / fullHeight, 0.3, 0.65),
    armToHeight: clamp(armHeight / fullHeight, 0.18, 0.55),
    source: "PHOTO",
  };
}

export function deriveAvatarMorphParams(
  input: SessionLogInput,
  view: BodyRecoveryView,
  photoRatios?: AvatarPhotoRatios | null,
): AvatarMorphParams {
  const heightM = input.heightCm / 100;
  const bmi = input.bodyWeightKg / Math.max(1.1, heightM * heightM);
  const fitness = clamp(input.fitnessBaselinePct / 100, 0, 1);
  const averageLoad = view.regions.reduce((sum, region) => sum + region.loadPct, 0) / Math.max(1, view.regions.length);
  const averageReadiness = view.regions.reduce((sum, region) => sum + region.readinessPct, 0) / Math.max(1, view.regions.length);
  const shoulderToHeight = photoRatios?.shoulderToHeight ?? baselineRatios.shoulderToHeight;
  const waistToHeight = photoRatios?.waistToHeight ?? baselineRatios.waistToHeight;
  const hipToHeight = photoRatios?.hipToHeight ?? baselineRatios.hipToHeight;
  const legToHeight = photoRatios?.legToHeight ?? baselineRatios.legToHeight;
  const armToHeight = photoRatios?.armToHeight ?? baselineRatios.armToHeight;
  const bmiBand = clamp((bmi - 21) / 12, -0.6, 0.9);

  const shoulderScale = clamp(0.88 + (shoulderToHeight / baselineRatios.shoulderToHeight - 1) * 0.75 + fitness * 0.08 + bmiBand * 0.06, 0.78, 1.26);
  const waistScale = clamp(0.88 + (waistToHeight / baselineRatios.waistToHeight - 1) * 0.85 + bmiBand * 0.16 - fitness * 0.08, 0.7, 1.34);
  const hipScale = clamp(0.9 + (hipToHeight / baselineRatios.hipToHeight - 1) * 0.8 + bmiBand * 0.1, 0.76, 1.34);
  const armScale = clamp(0.86 + (armToHeight / baselineRatios.armToHeight - 1) * 0.7 + averageLoad / 700 + fitness * 0.08, 0.72, 1.3);
  const legScale = clamp(0.86 + (legToHeight / baselineRatios.legToHeight - 1) * 0.8 + averageLoad / 680 + fitness * 0.06, 0.75, 1.3);
  const torsoScale = clamp(0.9 + (input.heightCm - 176) / 420 + (1 - fitness) * 0.05, 0.84, 1.16);
  const postureLeanDeg = clamp((55 - averageReadiness) / 9, -3, 7);
  const confidencePct = clamp(
    54 +
      averageReadiness * 0.25 +
      fitness * 18 +
      (photoRatios ? 8 : 0) -
      Math.max(0, input.inactiveDays - 2) * 2.5,
    10,
    98,
  );

  return { shoulderScale, waistScale, hipScale, armScale, legScale, torsoScale, postureLeanDeg, confidencePct };
}

export function loadAvatarPhotoRatios(): AvatarPhotoRatios | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AVATAR_PHOTO_CALIBRATION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AvatarPhotoRatios>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      shoulderToHeight: clamp(Number(parsed.shoulderToHeight), 0.1, 0.45),
      waistToHeight: clamp(Number(parsed.waistToHeight), 0.09, 0.35),
      hipToHeight: clamp(Number(parsed.hipToHeight), 0.11, 0.4),
      legToHeight: clamp(Number(parsed.legToHeight), 0.3, 0.65),
      armToHeight: clamp(Number(parsed.armToHeight), 0.18, 0.55),
      source: "PHOTO",
    };
  } catch {
    return null;
  }
}

export function saveAvatarPhotoRatios(ratios: AvatarPhotoRatios): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AVATAR_PHOTO_CALIBRATION_STORAGE_KEY, JSON.stringify(ratios));
}

export function clearAvatarPhotoRatios(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AVATAR_PHOTO_CALIBRATION_STORAGE_KEY);
}
