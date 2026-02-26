import { describe, expect, it } from "vitest";
import { assessDemotionStatus, countCompromisedStreak, evaluateProgressEvent, getNextRank, getRankProgress, resolveRank } from "./progression";

describe("resolveRank", () => {
  it("returns RECRUIT below 12000 xp", () => {
    expect(resolveRank(11999).id).toBe("RECRUIT");
  });

  it("returns OPERATOR at threshold", () => {
    expect(resolveRank(12000).id).toBe("OPERATOR");
  });

  it("returns highest matching rank", () => {
    expect(resolveRank(18000).id).toBe("ASCENDANT");
  });
});

describe("getNextRank", () => {
  it("returns next rank when available", () => {
    expect(getNextRank(12000)?.id).toBe("VANGUARD");
  });

  it("returns null at max rank", () => {
    expect(getNextRank(18000)).toBeNull();
  });
});

describe("getRankProgress", () => {
  it("returns xp to next rank and band progress within the current rank span", () => {
    const progress = getRankProgress(13000);
    expect(progress.currentRank.id).toBe("OPERATOR");
    expect(progress.nextRank?.id).toBe("VANGUARD");
    expect(progress.xpToNextRank).toBe(2000);
    expect(progress.bandProgressPct).toBe(33);
  });

  it("returns full progress and zero remaining xp at max rank", () => {
    const progress = getRankProgress(19000);
    expect(progress.currentRank.id).toBe("ASCENDANT");
    expect(progress.nextRank).toBeNull();
    expect(progress.xpToNextRank).toBe(0);
    expect(progress.bandProgressPct).toBe(100);
  });
});

describe("countCompromisedStreak", () => {
  it("counts trailing compromised sequence only", () => {
    const streak = countCompromisedStreak(["COMPROMISED", "DECLINING", "COMPROMISED", "COMPROMISED"]);
    expect(streak).toBe(2);
  });
});

describe("assessDemotionStatus", () => {
  it("demotes when xp is below threshold and 7 compromised days are present", () => {
    const status = assessDemotionStatus(
      11900,
      12000,
      ["COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    );

    expect(status.shouldDemote).toBe(true);
    expect(status.compromisedStreak).toBe(7);
  });

  it("does not demote without compromised streak", () => {
    const status = assessDemotionStatus(
      11900,
      12000,
      ["COMPROMISED", "COMPROMISED", "DECLINING", "COMPROMISED", "COMPROMISED", "COMPROMISED", "COMPROMISED"],
    );

    expect(status.shouldDemote).toBe(false);
    expect(status.compromisedStreak).toBe(4);
  });
});

describe("evaluateProgressEvent", () => {
  it("returns demotion risk when demotion check is triggered", () => {
    const event = evaluateProgressEvent(11900, 11950, {
      shouldDemote: true,
      compromisedStreak: 7,
      requiredCompromisedDays: 7,
    });
    expect(event).toBe("DEMOTION RISK");
  });

  it("returns promotion ready when pre-decay xp crosses the next rank", () => {
    const event = evaluateProgressEvent(14980, 15020, {
      shouldDemote: false,
      compromisedStreak: 0,
      requiredCompromisedDays: 7,
    });
    expect(event).toBe("PROMOTION READY");
  });

  it("returns promotion proximity when close to next threshold", () => {
    const event = evaluateProgressEvent(14760, 14760, {
      shouldDemote: false,
      compromisedStreak: 0,
      requiredCompromisedDays: 7,
    });
    expect(event).toBe("PROMOTION PROXIMITY");
  });

  it("returns rank stable otherwise", () => {
    const event = evaluateProgressEvent(13000, 13000, {
      shouldDemote: false,
      compromisedStreak: 0,
      requiredCompromisedDays: 7,
    });
    expect(event).toBe("RANK STABLE");
  });
});
