import { describe, expect, it } from "vitest";
import { applyInactivityDecay, calculateDecayFloorXp, calculateSessionXp, getGraceDaysForCadence, shouldDemoteRank } from "./calculations";

describe("calculateSessionXp", () => {
  it("rounds the deterministic session xp formula", () => {
    const result = calculateSessionXp({
      baseRate: 120,
      intensityMultiplier: 1.3,
      durationMultiplier: 1.15,
      outcomeMultiplier: 0.85,
      consistencyMultiplier: 1.1,
    });

    expect(result).toBe(168);
  });
});

describe("calculateDecayFloorXp", () => {
  it("defaults to 85 percent of level floor", () => {
    expect(calculateDecayFloorXp(12000)).toBe(10200);
  });

  it("supports explicit floor percentages", () => {
    expect(calculateDecayFloorXp(12000, 0.9)).toBe(10800);
  });
});

describe("applyInactivityDecay", () => {
  it("does not decay within grace days", () => {
    const result = applyInactivityDecay({
      totalXp: 12458,
      inactiveDays: 1,
      graceDays: 1,
      decayRatePct: 2,
      levelStartXp: 12000,
    });

    expect(result).toBe(12458);
  });

  it("applies compound daily decay after grace days", () => {
    const result = applyInactivityDecay({
      totalXp: 12458,
      inactiveDays: 3,
      graceDays: 1,
      decayRatePct: 2,
      levelStartXp: 12000,
    });

    expect(result).toBe(11965);
  });

  it("never drops below the decay floor", () => {
    const result = applyInactivityDecay({
      totalXp: 10300,
      inactiveDays: 40,
      graceDays: 1,
      decayRatePct: 2,
      levelStartXp: 12000,
    });

    expect(result).toBe(10200);
  });
});

describe("shouldDemoteRank", () => {
  it("requires both xp breach and seven compromised days", () => {
    const result = shouldDemoteRank(
      11800,
      12000,
      ["COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    );

    expect(result).toBe(true);
  });

  it("returns false when xp is above threshold", () => {
    const result = shouldDemoteRank(
      12100,
      12000,
      ["COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    );

    expect(result).toBe(false);
  });

  it("returns false when compromised streak is interrupted", () => {
    const result = shouldDemoteRank(
      11800,
      12000,
      ["COMPROMISED", "COMPROMISED", "DECLINING", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    );

    expect(result).toBe(false);
  });
});

describe("getGraceDaysForCadence", () => {
  it("maps cadence to deterministic grace windows", () => {
    expect(getGraceDaysForCadence("DAILY")).toBe(1);
    expect(getGraceDaysForCadence("THREE_PER_WEEK")).toBe(2);
    expect(getGraceDaysForCadence("WEEKLY")).toBe(4);
  });
});
