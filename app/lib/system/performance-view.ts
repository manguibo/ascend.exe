import { getDirectiveTierInfo, type DirectiveTier } from "../directives/tier";
import {
  assessDemotionStatus,
  evaluateProgressEvent,
  getRankProgress,
  resolveRank,
  type DemotionStatus,
  type ProgressEventState,
  type RankProgress,
  type RankDefinition,
} from "../ranks/progression";
import { getDecayPressurePct, getDisciplineRiskPct, getRetentionPct } from "./telemetry";
import type { SystemSnapshot } from "./types";

export type PerformanceView = {
  rankProgress: RankProgress;
  currentRank: RankDefinition;
  directiveTier: DirectiveTier;
  disciplineRiskPct: number;
  decayPressurePct: number;
  retentionPct: number;
  demotion: DemotionStatus;
  progressEvent: ProgressEventState;
};

export function buildPerformanceView(snapshot: SystemSnapshot): PerformanceView {
  const preDecayTotalXp = snapshot.xp.totalXpBeforeDecay;
  const rankProgress = getRankProgress(snapshot.xp.totalXp);
  const currentRank = rankProgress.currentRank;
  const directiveTier = getDirectiveTierInfo(snapshot.xp.totalXp);
  const protectedRank = resolveRank(preDecayTotalXp);
  const demotion = assessDemotionStatus(snapshot.xp.totalXp, protectedRank.minXp, snapshot.recentDisciplineStates);
  const progressEvent = evaluateProgressEvent(snapshot.xp.totalXp, preDecayTotalXp, demotion);
  const disciplineRiskPct = getDisciplineRiskPct(snapshot.recentDisciplineStates);
  const decayPressurePct = getDecayPressurePct(snapshot.xp.inactiveDays, snapshot.xp.graceDays);
  const retentionPct = getRetentionPct(snapshot.xp.totalXpBeforeDecay, snapshot.xp.totalXp);

  return {
    rankProgress,
    currentRank,
    directiveTier,
    disciplineRiskPct,
    decayPressurePct,
    retentionPct,
    demotion,
    progressEvent,
  };
}
