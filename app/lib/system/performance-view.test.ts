import { describe, expect, it } from "vitest";
import { buildSystemSnapshotFromLogInput } from "./mock-data";
import { defaultSessionLogInput } from "./session-state";
import { buildPerformanceView } from "./performance-view";

describe("buildPerformanceView", () => {
  it("derives rank, directive tier, and risk metrics", () => {
    const snapshot = buildSystemSnapshotFromLogInput(defaultSessionLogInput);
    const view = buildPerformanceView(snapshot);

    expect(view.currentRank.id).toBe("OPERATOR");
    expect(view.directiveTier.tier).toBe("TIER II");
    expect(view.disciplineRiskPct).toBeGreaterThanOrEqual(0);
    expect(view.decayPressurePct).toBeGreaterThanOrEqual(0);
    expect(view.retentionPct).toBeGreaterThanOrEqual(0);
  });

  it("reports demotion risk when both conditions are met", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      totalXpBeforeSession: 13000,
      baseRate: 20,
      intensityMultiplier: 1,
      durationMultiplier: 1,
      outcomeMultiplier: 1,
      consistencyMultiplier: 1,
      inactiveDays: 30,
      recentDisciplineStates: ["COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    });
    const view = buildPerformanceView(snapshot);

    expect(view.demotion.shouldDemote).toBe(true);
    expect(view.progressEvent).toBe("DEMOTION RISK");
  });

  it("returns stable progression signal when no promotion or demotion flags", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      totalXpBeforeSession: 13000,
      baseRate: 50,
      intensityMultiplier: 1,
      durationMultiplier: 1,
      outcomeMultiplier: 1,
      consistencyMultiplier: 1,
      inactiveDays: 0,
      recentDisciplineStates: ["STABLE", "STABLE", "STABLE", "STABLE", "STABLE", "STABLE", "STABLE"],
    });
    const view = buildPerformanceView(snapshot);

    expect(view.progressEvent).toBe("RANK STABLE");
  });
});
