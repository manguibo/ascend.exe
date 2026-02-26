import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendSessionHistoryEntry, buildRegionTrends, buildSessionHistorySummary, clearSessionHistory, loadSessionHistoryEntries } from "./session-history";
import { defaultSessionLogInput } from "./session-state";

describe("session-history", () => {
  beforeEach(() => {
    clearSessionHistory();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("appends a session entry with computed fields", () => {
    const entry = appendSessionHistoryEntry(defaultSessionLogInput);

    expect(entry).not.toBeNull();
    const entries = loadSessionHistoryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.regionReadiness.CHEST).toBeTypeOf("number");
  });

  it("clears history entries", () => {
    appendSessionHistoryEntry(defaultSessionLogInput);
    clearSessionHistory();

    expect(loadSessionHistoryEntries()).toHaveLength(0);
  });

  it("generates deterministic sequential ids for same timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    const first = appendSessionHistoryEntry(defaultSessionLogInput);
    const second = appendSessionHistoryEntry(defaultSessionLogInput);

    expect(first?.id).toBe("2026-01-01T10:00:00.000Z-01");
    expect(second?.id).toBe("2026-01-01T10:00:00.000Z-02");
  });

  it("keeps only the latest 60 entries", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

    for (let index = 0; index < 65; index += 1) {
      vi.setSystemTime(new Date(2026, 0, 1, 10, 0, index));
      appendSessionHistoryEntry(defaultSessionLogInput);
    }

    const entries = loadSessionHistoryEntries();
    expect(entries).toHaveLength(60);
    expect(entries[0]?.id.endsWith("-01")).toBe(true);
  });

  it("builds summary metrics and trend", () => {
    const summaryEmpty = buildSessionHistorySummary([]);
    expect(summaryEmpty.entryCount).toBe(0);
    expect(summaryEmpty.disciplineTrend).toBe("STABLE");

    const entries = [
      {
        id: "a",
        timestampIso: "2026-01-01T00:00:00.000Z",
        totalXp: 1000,
        sessionXp: 100,
        discipline: "COMPROMISED",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { CHEST: 50 },
        developmentAvgPct: 48,
      },
      {
        id: "b",
        timestampIso: "2026-01-02T00:00:00.000Z",
        totalXp: 1130,
        sessionXp: 130,
        discipline: "DECLINING",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { CHEST: 54 },
        developmentAvgPct: 52,
      },
      {
        id: "c",
        timestampIso: "2026-01-03T00:00:00.000Z",
        totalXp: 1290,
        sessionXp: 160,
        discipline: "STABLE",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { CHEST: 58 },
        developmentAvgPct: 60,
      },
      {
        id: "d",
        timestampIso: "2026-01-04T00:00:00.000Z",
        totalXp: 1470,
        sessionXp: 180,
        discipline: "OPTIMAL",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { CHEST: 62 },
        developmentAvgPct: 66,
      },
    ];

    const summary = buildSessionHistorySummary(entries);
    expect(summary.entryCount).toBe(4);
    expect(summary.averageSessionXp).toBe(143);
    expect(summary.averageDevelopmentPct).toBe(57);
    expect(summary.latestTotalXp).toBe(1470);
    expect(summary.xpDeltaFromPrevious).toBe(180);
    expect(summary.disciplineTrend).toBe("IMPROVING");
  });

  it("builds region trends from latest and previous entries", () => {
    const entries = [
      {
        id: "a",
        timestampIso: "2026-01-01T00:00:00.000Z",
        totalXp: 1000,
        sessionXp: 100,
        discipline: "STABLE",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { ARMS: 60, CORE: 50, QUADS: 70 },
        developmentAvgPct: 55,
      },
      {
        id: "b",
        timestampIso: "2026-01-02T00:00:00.000Z",
        totalXp: 1120,
        sessionXp: 120,
        discipline: "STABLE",
        activityCodename: "RUNNING",
        profile: "CONDITIONING",
        regionReadiness: { ARMS: 64, CORE: 50, QUADS: 66 },
        developmentAvgPct: 57,
      },
    ];

    const trends = buildRegionTrends(entries);
    expect(trends).toHaveLength(3);
    expect(trends[0]?.regionId).toBe("ARMS");
    expect(trends[0]?.direction).toBe("IMPROVING");
    expect(trends[1]?.regionId).toBe("CORE");
    expect(trends[1]?.direction).toBe("STABLE");
    expect(trends[2]?.regionId).toBe("QUADS");
    expect(trends[2]?.direction).toBe("DECLINING");
  });
});
