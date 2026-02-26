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
});
