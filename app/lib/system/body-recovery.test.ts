import { describe, expect, it } from "vitest";
import { buildBodyRecoveryView, buildBodyRegionInsights, getAverageReadinessPct, getLowestReadinessRegion } from "./body-recovery";
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
      fitnessBaselinePct: 28,
      bodyWeightKg: 94,
      targetWeightKg: 80,
    });

    expect(view.regions.some((region) => region.status === "RECOVER")).toBe(true);
    expect(view.development.status).toBe("DEGRADED");
  });

  it("improves development status with higher fitness signal", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      fitnessBaselinePct: 88,
      bodyWeightKg: 80.5,
      targetWeightKg: 80,
      inactiveDays: 1,
      recentDisciplineStates: ["OPTIMAL", "OPTIMAL", "OPTIMAL", "STABLE", "STABLE", "OPTIMAL", "OPTIMAL"],
    });

    expect(view.development.compositionPct).toBeGreaterThanOrEqual(70);
    expect(view.development.status).toBe("ADVANCING");
  });

  it("returns lowest readiness region and average readiness helpers", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      inactiveDays: 7,
      fitnessBaselinePct: 42,
      recentDisciplineStates: ["DECLINING", "DECLINING", "DECLINING", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    });

    const lowest = getLowestReadinessRegion(view);
    const average = getAverageReadinessPct(view);

    expect(lowest).not.toBeNull();
    expect(average).toBeGreaterThanOrEqual(0);
    expect(average).toBeLessThanOrEqual(100);
    expect(lowest?.readinessPct).toBeLessThanOrEqual(average);
  });

  it("keeps non-severe recovery ETAs in a realistic range", () => {
    const view = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      activityId: "ROCK_CLIMBING",
      intensityMultiplier: 1.18,
      durationMultiplier: 1.12,
      consistencyMultiplier: 1.06,
      inactiveDays: 1,
      fitnessBaselinePct: 72,
      recentDisciplineStates: ["OPTIMAL", "STABLE", "STABLE", "OPTIMAL", "STABLE", "OPTIMAL", "STABLE"],
    });

    const history = [
      {
        id: "h-1",
        timestampIso: "2026-01-01T00:00:00.000Z",
        totalXp: 1000,
        sessionXp: 100,
        discipline: "STABLE",
        activityCodename: "CLIMB",
        profile: "PULL",
        regionReadiness: Object.fromEntries(view.regions.map((region) => [region.id, Math.max(0, region.readinessPct - 2)])),
        developmentAvgPct: 60,
      },
      {
        id: "h-2",
        timestampIso: "2026-01-02T00:00:00.000Z",
        totalXp: 1120,
        sessionXp: 120,
        discipline: "OPTIMAL",
        activityCodename: "CLIMB",
        profile: "PULL",
        regionReadiness: Object.fromEntries(view.regions.map((region) => [region.id, Math.max(0, region.readinessPct - 1)])),
        developmentAvgPct: 62,
      },
    ];

    const insights = buildBodyRegionInsights(view, history);
    Object.values(insights).forEach((insight) => {
      expect(insight.etaDays).not.toBeNull();
      expect(insight.etaDays ?? 0).toBeLessThanOrEqual(4);
    });
  });

  it("extends recovery ETA for an injured target region", () => {
    const baseView = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      injuryRegionId: "NONE",
      injurySeverityLevel: 0,
      activityId: "ROCK_CLIMBING",
    });
    const injuredView = buildBodyRecoveryView({
      ...defaultSessionLogInput,
      injuryRegionId: "ARMS",
      injurySeverityLevel: 8,
      activityId: "ROCK_CLIMBING",
    });

    const history = [
      {
        id: "h-1",
        timestampIso: "2026-01-01T00:00:00.000Z",
        totalXp: 1000,
        sessionXp: 100,
        discipline: "STABLE",
        activityCodename: "CLIMB",
        profile: "PULL",
        regionReadiness: { ARMS: 58, BACK: 57, CORE: 60, CHEST: 60, SHOULDERS: 59, GLUTES: 61, QUADS: 61, HAMSTRINGS: 61 },
        developmentAvgPct: 60,
      },
      {
        id: "h-2",
        timestampIso: "2026-01-02T00:00:00.000Z",
        totalXp: 1100,
        sessionXp: 100,
        discipline: "STABLE",
        activityCodename: "CLIMB",
        profile: "PULL",
        regionReadiness: { ARMS: 57, BACK: 56, CORE: 59, CHEST: 59, SHOULDERS: 58, GLUTES: 60, QUADS: 60, HAMSTRINGS: 60 },
        developmentAvgPct: 60,
      },
    ];

    const baseInsights = buildBodyRegionInsights(baseView, history);
    const injuredInsights = buildBodyRegionInsights(injuredView, history);

    expect((injuredInsights.ARMS.etaDays ?? 0)).toBeGreaterThan(baseInsights.ARMS.etaDays ?? 0);
  });
});
