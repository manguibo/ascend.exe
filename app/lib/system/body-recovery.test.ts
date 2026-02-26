import { describe, expect, it } from "vitest";
import { buildBodyRecoveryView } from "./body-recovery";
import { defaultSessionLogInput } from "./session-state";

describe("buildBodyRecoveryView", () => {
  it("derives lower profile from activity codename keywords", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      primaryActivityCodename: "LOWER LEG STRENGTH BLOCK",
    });

    expect(view.profile).toBe("LOWER");
    const quads = view.regions.find((region) => region.id === "QUADS");
    const chest = view.regions.find((region) => region.id === "CHEST");
    expect(quads?.loadPct).toBeGreaterThan(chest?.loadPct ?? 0);
  });

  it("uses explicit training profile when provided", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      primaryActivityCodename: "UPPER BODY MIX",
      bodyTrainingProfile: "LOWER",
    });

    expect(view.profile).toBe("LOWER");
    const quads = view.regions.find((region) => region.id === "QUADS");
    expect(quads?.loadPct).toBeGreaterThanOrEqual(80);
  });

  it("changes region load profile based on selected activity", () => {
    const climbing = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      activityId: "ROCK_CLIMBING",
      bodyTrainingProfile: "AUTO",
    });
    const soccer = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      activityId: "SOCCER",
      bodyTrainingProfile: "AUTO",
    });

    const climbArms = climbing.regions.find((region) => region.id === "ARMS")?.loadPct ?? 0;
    const soccerArms = soccer.regions.find((region) => region.id === "ARMS")?.loadPct ?? 0;
    const climbQuads = climbing.regions.find((region) => region.id === "QUADS")?.loadPct ?? 0;
    const soccerQuads = soccer.regions.find((region) => region.id === "QUADS")?.loadPct ?? 0;

    expect(climbArms).toBeGreaterThan(soccerArms);
    expect(soccerQuads).toBeGreaterThan(climbQuads);
  });

  it("reduces readiness and development under poor recovery conditions", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      recentDisciplineStates: ["COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
      inactiveDays: 8,
      dietAdherencePct: 30,
      fitnessBaselinePct: 28,
      bodyWeightKg: 94,
      targetWeightKg: 80,
    });

    expect(view.regions.some((region) => region.status === "RECOVER")).toBe(true);
    expect(view.development.status).toBe("DEGRADED");
  });

  it("improves development status with higher diet and fitness signals", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      dietAdherencePct: 92,
      fitnessBaselinePct: 88,
      bodyWeightKg: 80.5,
      targetWeightKg: 80,
      inactiveDays: 1,
      recentDisciplineStates: ["OPTIMAL", "OPTIMAL", "OPTIMAL", "STABLE", "STABLE", "OPTIMAL", "OPTIMAL"],
    });

    expect(view.development.compositionPct).toBeGreaterThanOrEqual(70);
    expect(view.development.status).toBe("ADVANCING");
  });
});
