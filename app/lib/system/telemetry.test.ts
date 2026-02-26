import { describe, expect, it } from "vitest";
import { getCompromisedDayCount, getDecayPressurePct, getDisciplineRiskPct, getRetentionPct } from "./telemetry";

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
});
