export type DirectiveTier = "TIER I" | "TIER II" | "TIER III" | "TIER IV";

export type DirectiveTierInfo = {
  tier: DirectiveTier;
  nextThreshold: number | null;
};

export function getDirectiveTierInfo(totalXp: number): DirectiveTierInfo {
  if (totalXp < 12000) {
    return { tier: "TIER I", nextThreshold: 12000 };
  }
  if (totalXp < 15000) {
    return { tier: "TIER II", nextThreshold: 15000 };
  }
  if (totalXp < 18000) {
    return { tier: "TIER III", nextThreshold: 18000 };
  }

  return { tier: "TIER IV", nextThreshold: null };
}
