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

  it("accepts valid activity id", () => {
    const result = sanitizeSessionLogInput({
      activityId: "SOCCER",
    });

    expect(result.activityId).toBe("SOCCER");
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

  it("clamps body signal percentages to 0-100", () => {
    const result = sanitizeSessionLogInput({
      dietAdherencePct: 140,
      fitnessBaselinePct: -20,
    });

    expect(result.dietAdherencePct).toBe(100);
    expect(result.fitnessBaselinePct).toBe(0);
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
      bodyWeightKg: 4,
      targetWeightKg: 999,
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
    expect(result.bodyWeightKg).toBe(20);
    expect(result.targetWeightKg).toBe(350);
  });
});
