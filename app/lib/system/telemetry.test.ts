import { describe, expect, it } from "vitest";
import { buildSystemSnapshotFromLogInput } from "./mock-data";
import { defaultSessionLogInput } from "./session-state";
import { getCompromisedDayCount, getDecayPressurePct, getDisciplineRiskPct, getNextActionAdvice, getRetentionPct, getRiskBand } from "./telemetry";

describe("telemetry", () => {
  it("counts compromised mission days", () => {
    expect(getCompromisedDayCount(["OPTIMAL", "COMPROMISED", "DECLINING", "COMPROMISED"])).toBe(2);
  });

  it("computes discipline risk percentage", () => {
    expect(getDisciplineRiskPct(["COMPROMISED", "COMPROMISED", "STABLE", "DECLINING"])).toBe(50);
    expect(getDisciplineRiskPct([])).toBe(0);
  });

  it("computes decay pressure percentage with clamping", () => {
    expect(getDecayPressurePct(1, 2)).toBe(0);
    expect(getDecayPressurePct(5, 2)).toBe(43);
    expect(getDecayPressurePct(20, 1)).toBe(100);
  });

  it("computes retention percentage with clamping", () => {
    expect(getRetentionPct(1000, 970)).toBe(97);
    expect(getRetentionPct(0, 0)).toBe(100);
    expect(getRetentionPct(100, 140)).toBe(100);
    expect(getRetentionPct(100, -5)).toBe(0);
  });

  it("returns log-session advice when decay pressure is high", () => {
    const snapshot = buildSystemSnapshotFromLogInput({ ...defaultSessionLogInput, inactiveDays: 10 });
    const advice = getNextActionAdvice(snapshot, 0, 70, 92);
    expect(advice.id).toBe("LOG_SESSION");
  });

  it("returns consistency advice when discipline risk is elevated", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      recentDisciplineStates: ["COMPROMISED", "COMPROMISED", "DECLINING", "DECLINING", "DECLINING", "DECLINING", "DECLINING"],
    });
    const advice = getNextActionAdvice(snapshot, 57, 10, 100);
    expect(advice.id).toBe("REBUILD_CONSISTENCY");
  });

  it("returns progression advice under stable conditions", () => {
    const snapshot = buildSystemSnapshotFromLogInput({
      ...defaultSessionLogInput,
      inactiveDays: 0,
      recentDisciplineStates: ["OPTIMAL", "STABLE", "STABLE", "STABLE", "STABLE", "STABLE", "OPTIMAL"],
    });
    const advice = getNextActionAdvice(snapshot, 0, 0, 100);
    expect(advice.id).toBe("PROGRESS");
  });

  it("maps percentages to risk bands", () => {
    expect(getRiskBand(-1)).toBe("LOW");
    expect(getRiskBand(0)).toBe("LOW");
    expect(getRiskBand(24)).toBe("LOW");
    expect(getRiskBand(25)).toBe("MODERATE");
    expect(getRiskBand(49)).toBe("MODERATE");
    expect(getRiskBand(50)).toBe("HIGH");
    expect(getRiskBand(74)).toBe("HIGH");
    expect(getRiskBand(75)).toBe("CRITICAL");
    expect(getRiskBand(100)).toBe("CRITICAL");
  });
});
