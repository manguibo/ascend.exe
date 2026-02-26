import type { RankId } from "../ranks/progression";
import type { ActivitySnapshot } from "../system/types";

type DirectiveScaleProfile = {
  executionWindow: string;
  targetBlocks: string;
  complianceCadence: string;
};

const scaleByRank: Record<RankId, DirectiveScaleProfile> = {
  RECRUIT: {
    executionWindow: "1900 HOURS",
    targetBlocks: "02",
    complianceCadence: "DAILY CHECK-IN",
  },
  OPERATOR: {
    executionWindow: "1830 HOURS",
    targetBlocks: "03",
    complianceCadence: "STRICT DAILY CHECK-IN",
  },
  VANGUARD: {
    executionWindow: "1800 HOURS",
    targetBlocks: "04",
    complianceCadence: "DOUBLE CHECK-IN",
  },
  ASCENDANT: {
    executionWindow: "1730 HOURS",
    targetBlocks: "05",
    complianceCadence: "CONTINUOUS TRACKING",
  },
};

export function buildScaledDirectives(activity: ActivitySnapshot, rank: RankId): string[] {
  const profile = scaleByRank[rank];

  return [
    `${activity.protocol}: ${activity.codename}`,
    `NEXT DIRECTIVE: ${profile.executionWindow} EXECUTION WINDOW`,
    `LOADOUT: ${profile.targetBlocks} TARGET BLOCKS // ${profile.complianceCadence}`,
  ];
}
