import { describe, expect, it } from "vitest";
import { defaultSessionLogInput } from "./session-state";
import { applySessionProfile, resetSessionInputToStandard } from "./profiles";

describe("applySessionProfile", () => {
  it("applies light profile factors", () => {
    const next = applySessionProfile(defaultSessionLogInput, "LIGHT");

    expect(next.baseRate).toBe(100);
    expect(next.intensityMultiplier).toBe(1.05);
    expect(next.durationMultiplier).toBe(0.9);
    expect(next.outcomeMultiplier).toBe(0.95);
    expect(next.consistencyMultiplier).toBe(1);
  });

  it("preserves non-profile fields", () => {
    const next = applySessionProfile(
      { ...defaultSessionLogInput, totalXpBeforeSession: 9999, inactiveDays: 3, recentDisciplineStates: [...defaultSessionLogInput.recentDisciplineStates] },
      "MAX",
    );

    expect(next.totalXpBeforeSession).toBe(9999);
    expect(next.inactiveDays).toBe(3);
    expect(next.recentDisciplineStates).toEqual(defaultSessionLogInput.recentDisciplineStates);
  });

  it("applies max profile with higher multipliers", () => {
    const next = applySessionProfile(defaultSessionLogInput, "MAX");

    expect(next.baseRate).toBeGreaterThan(defaultSessionLogInput.baseRate);
    expect(next.intensityMultiplier).toBeGreaterThan(defaultSessionLogInput.intensityMultiplier);
    expect(next.durationMultiplier).toBeGreaterThan(defaultSessionLogInput.durationMultiplier);
  });

  it("resets to standard profile while preserving mission context fields", () => {
    const current = {
      ...defaultSessionLogInput,
      primaryActivityCodename: "RUN BLOCK B",
      bodyTrainingProfile: "PULL",
      totalXpBeforeSession: 18000,
      levelStartXp: 15000,
      bodyWeightKg: 86,
      targetWeightKg: 79,
      dietAdherencePct: 41,
      fitnessBaselinePct: 52,
      recentDisciplineStates: ["COMPROMISED", "COMPROMISED", "STABLE", "STABLE", "STABLE", "DECLINING", "DECLINING"],
      intensityMultiplier: 1.9,
      durationMultiplier: 1.8,
      outcomeMultiplier: 0.4,
      consistencyMultiplier: 0.7,
    };

    const next = resetSessionInputToStandard(current);

    expect(next.baseRate).toBe(defaultSessionLogInput.baseRate);
    expect(next.intensityMultiplier).toBe(defaultSessionLogInput.intensityMultiplier);
    expect(next.durationMultiplier).toBe(defaultSessionLogInput.durationMultiplier);
    expect(next.outcomeMultiplier).toBe(defaultSessionLogInput.outcomeMultiplier);
    expect(next.consistencyMultiplier).toBe(defaultSessionLogInput.consistencyMultiplier);
    expect(next.primaryActivityCodename).toBe("RUN BLOCK B");
    expect(next.bodyTrainingProfile).toBe("PULL");
    expect(next.totalXpBeforeSession).toBe(18000);
    expect(next.levelStartXp).toBe(15000);
    expect(next.bodyWeightKg).toBe(86);
    expect(next.targetWeightKg).toBe(79);
    expect(next.dietAdherencePct).toBe(41);
    expect(next.fitnessBaselinePct).toBe(52);
    expect(next.recentDisciplineStates).toEqual(current.recentDisciplineStates);
  });
});
