import { describe, expect, it } from "vitest";
import { getDirectiveTierInfo } from "./tier";

describe("getDirectiveTierInfo", () => {
  it("returns tier i below 12000 xp", () => {
    expect(getDirectiveTierInfo(11999)).toEqual({ tier: "TIER I", nextThreshold: 12000 });
  });

  it("returns tier ii in the operator band", () => {
    expect(getDirectiveTierInfo(12000)).toEqual({ tier: "TIER II", nextThreshold: 15000 });
  });

  it("returns tier iii in the vanguard band", () => {
    expect(getDirectiveTierInfo(15000)).toEqual({ tier: "TIER III", nextThreshold: 18000 });
  });

  it("returns tier iv at ascendant band", () => {
    expect(getDirectiveTierInfo(18000)).toEqual({ tier: "TIER IV", nextThreshold: null });
  });
});
