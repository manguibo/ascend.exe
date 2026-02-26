import { describe, expect, it } from "vitest";
import { buildScaledDirectives } from "./scaling";

const activity = {
  codename: "STRENGTH BLOCK A",
  protocol: "PRIMARY ACTIVITY",
  nextDirective: "1900 HOURS EXECUTION WINDOW",
  complianceWindow: "04:12:26 REMAINING",
} as const;

describe("buildScaledDirectives", () => {
  it("builds recruit-level directives", () => {
    const directives = buildScaledDirectives(activity, "RECRUIT");
    expect(directives).toEqual([
      "PRIMARY ACTIVITY: STRENGTH BLOCK A",
      "NEXT DIRECTIVE: 1900 HOURS EXECUTION WINDOW",
      "LOADOUT: 02 TARGET BLOCKS // DAILY CHECK-IN",
    ]);
  });

  it("scales directives for higher ranks", () => {
    const directives = buildScaledDirectives(activity, "ASCENDANT");
    expect(directives).toEqual([
      "PRIMARY ACTIVITY: STRENGTH BLOCK A",
      "NEXT DIRECTIVE: 1730 HOURS EXECUTION WINDOW",
      "LOADOUT: 05 TARGET BLOCKS // CONTINUOUS TRACKING",
    ]);
  });
});
