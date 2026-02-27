import { describe, expect, it } from "vitest";
import { buildAvatarRigGeometry } from "./avatar-rig";
import { buildBodyRecoveryView } from "./body-recovery";
import { deriveAvatarMorphParams } from "./avatar-profile";
import { defaultSessionLogInput } from "./session-state";

describe("avatar-rig", () => {
  it("builds rig geometry with shell and multiple segments", () => {
    const view = buildBodyRecoveryView(defaultSessionLogInput);
    const morph = deriveAvatarMorphParams(defaultSessionLogInput, view, null);
    const rig = buildAvatarRigGeometry(morph, "FRONT");

    expect(rig.shellPath.length).toBeGreaterThan(30);
    expect(rig.segments.length).toBeGreaterThanOrEqual(12);
    expect(rig.segments.some((segment) => segment.id === "SKULL")).toBe(true);
  });

  it("changes shell output for different morph profiles", () => {
    const leanInput = { ...defaultSessionLogInput, heightCm: 191, bodyWeightKg: 70, targetWeightKg: 74, fitnessBaselinePct: 76 };
    const heavyInput = { ...defaultSessionLogInput, heightCm: 161, bodyWeightKg: 119, targetWeightKg: 88, fitnessBaselinePct: 42 };
    const leanMorph = deriveAvatarMorphParams(leanInput, buildBodyRecoveryView(leanInput), null);
    const heavyMorph = deriveAvatarMorphParams(heavyInput, buildBodyRecoveryView(heavyInput), null);
    const leanRig = buildAvatarRigGeometry(leanMorph, "FRONT");
    const heavyRig = buildAvatarRigGeometry(heavyMorph, "FRONT");

    expect(leanRig.shellPath).not.toBe(heavyRig.shellPath);
  });
});
