import { describe, expect, it } from "vitest";
import { sanitizeSessionLogInput } from "./session-state";

describe("sanitizeSessionLogInput", () => {
  it("normalizes primary activity codename", () => {
    const result = sanitizeSessionLogInput({
      primaryActivityCodename: "  morning strength cycle  ",
    });

    expect(result.primaryActivityCodename).toBe("MORNING STRENGTH CYCLE");
  });

  it("preserves valid 7-day discipline history", () => {
    const result = sanitizeSessionLogInput({
      recentDisciplineStates: ["OPTIMAL", "STABLE", "DECLINING", "COMPROMISED", "OPTIMAL", "STABLE", "DECLINING"],
    });

    expect(result.recentDisciplineStates).toEqual([
      "OPTIMAL",
      "STABLE",
      "DECLINING",
      "COMPROMISED",
      "OPTIMAL",
      "STABLE",
      "DECLINING",
    ]);
  });

  it("accepts valid cadence values", () => {
    const result = sanitizeSessionLogInput({
      expectedCadence: "WEEKLY",
    });

    expect(result.expectedCadence).toBe("WEEKLY");
  });

  it("accepts valid explicit body training profile", () => {
    const result = sanitizeSessionLogInput({
      bodyTrainingProfile: "PULL",
    });

    expect(result.bodyTrainingProfile).toBe("PULL");
  });

  it("accepts valid unit system", () => {
    const result = sanitizeSessionLogInput({
      unitSystem: "IMPERIAL",
    });

    expect(result.unitSystem).toBe("IMPERIAL");
  });

  it("accepts valid activity id", () => {
    const result = sanitizeSessionLogInput({
      activityId: "SOCCER",
    });

    expect(result.activityId).toBe("SOCCER");
  });

  it("accepts valid injury inputs", () => {
    const result = sanitizeSessionLogInput({
      injuryRegionId: "QUADS",
      injurySeverityLevel: 7,
    });

    expect(result.injuryRegionId).toBe("QUADS");
    expect(result.injurySeverityLevel).toBe(7);
  });

  it("fills missing or invalid discipline values with defaults", () => {
    const result = sanitizeSessionLogInput({
      recentDisciplineStates: ["COMPROMISED", "INVALID", 7],
    });

    expect(result.recentDisciplineStates).toEqual([
      "COMPROMISED",
      "STABLE",
      "STABLE",
      "DECLINING",
      "DECLINING",
      "DECLINING",
      "DECLINING",
    ]);
  });

  it("clamps fitness baseline to 0-100", () => {
    const result = sanitizeSessionLogInput({
      fitnessBaselinePct: 140,
    });

    expect(result.fitnessBaselinePct).toBe(100);
  });

  it("clamps numeric fields to safe ranges", () => {
    const result = sanitizeSessionLogInput({
      baseRate: -10,
      intensityMultiplier: 9,
      durationMultiplier: -2,
      outcomeMultiplier: 5,
      consistencyMultiplier: 8,
      totalXpBeforeSession: -400,
      inactiveDays: 999,
      decayRatePct: 73,
      levelStartXp: -1,
      heightCm: 77,
      bodyWeightKg: 4,
      targetWeightKg: 999,
      injurySeverityLevel: 99,
    });

    expect(result.baseRate).toBe(1);
    expect(result.intensityMultiplier).toBe(3);
    expect(result.durationMultiplier).toBe(0);
    expect(result.outcomeMultiplier).toBe(2);
    expect(result.consistencyMultiplier).toBe(3);
    expect(result.totalXpBeforeSession).toBe(0);
    expect(result.inactiveDays).toBe(365);
    expect(result.decayRatePct).toBe(20);
    expect(result.levelStartXp).toBe(0);
    expect(result.heightCm).toBe(120);
    expect(result.bodyWeightKg).toBe(20);
    expect(result.targetWeightKg).toBe(350);
    expect(result.injurySeverityLevel).toBe(10);
  });
});
