import { describe, expect, it } from "vitest";
import { buildBodyRecoveryView } from "./body-recovery";
import { deriveAvatarMorphParams, derivePhotoRatios, type AvatarLandmark } from "./avatar-profile";
import { defaultSessionLogInput } from "./session-state";

describe("avatar-profile", () => {
  it("derives photo ratios from landmarks", () => {
    const landmarks: AvatarLandmark[] = [
      { id: "HEAD_TOP", xPct: 0.5, yPct: 0.05 },
      { id: "CHIN", xPct: 0.5, yPct: 0.15 },
      { id: "LEFT_SHOULDER", xPct: 0.36, yPct: 0.2 },
      { id: "RIGHT_SHOULDER", xPct: 0.64, yPct: 0.2 },
      { id: "LEFT_WAIST", xPct: 0.41, yPct: 0.42 },
      { id: "RIGHT_WAIST", xPct: 0.59, yPct: 0.42 },
      { id: "LEFT_HIP", xPct: 0.4, yPct: 0.52 },
      { id: "RIGHT_HIP", xPct: 0.6, yPct: 0.52 },
      { id: "LEFT_ANKLE", xPct: 0.45, yPct: 0.92 },
      { id: "RIGHT_ANKLE", xPct: 0.55, yPct: 0.92 },
      { id: "LEFT_WRIST", xPct: 0.3, yPct: 0.56 },
      { id: "RIGHT_WRIST", xPct: 0.7, yPct: 0.56 },
    ];

    const ratios = derivePhotoRatios(landmarks);

    expect(ratios).not.toBeNull();
    expect(ratios?.shoulderToHeight).toBeGreaterThan(0.2);
    expect(ratios?.legToHeight).toBeGreaterThan(0.4);
  });

  it("adjusts morph confidence when photo ratios are provided", () => {
    const view = buildBodyRecoveryView(defaultSessionLogInput);
    const base = deriveAvatarMorphParams(defaultSessionLogInput, view, null);
    const withPhoto = deriveAvatarMorphParams(defaultSessionLogInput, view, {
      shoulderToHeight: 0.25,
      waistToHeight: 0.17,
      hipToHeight: 0.21,
      legToHeight: 0.51,
      armToHeight: 0.34,
      source: "PHOTO",
    });

    expect(withPhoto.confidencePct).toBeGreaterThanOrEqual(base.confidencePct);
  });
});
