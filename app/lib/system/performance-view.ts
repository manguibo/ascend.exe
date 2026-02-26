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
import {
  getDecayPressurePct,
  getDisciplineRiskPct,
  getNextActionAdvice,
  getRetentionPct,
  getRiskBand,
  type NextActionAdvice,
  type RiskBand,
} from "./telemetry";
import type { SystemSnapshot } from "./types";

export type PerformanceView = {
  rankProgress: RankProgress;
  currentRank: RankDefinition;
  directiveTier: DirectiveTier;
  disciplineRiskPct: number;
  disciplineRiskBand: RiskBand;
  decayPressurePct: number;
  decayPressureBand: RiskBand;
  retentionPct: number;
  retentionBand: RiskBand;
  demotion: DemotionStatus;
  progressEvent: ProgressEventState;
  nextAction: NextActionAdvice;
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
  const disciplineRiskBand = getRiskBand(disciplineRiskPct);
  const decayPressurePct = getDecayPressurePct(snapshot.xp.inactiveDays, snapshot.xp.graceDays);
  const decayPressureBand = getRiskBand(decayPressurePct);
  const retentionPct = getRetentionPct(snapshot.xp.totalXpBeforeDecay, snapshot.xp.totalXp);
  const retentionBand = getRiskBand(100 - retentionPct);
  const nextAction = getNextActionAdvice(snapshot, disciplineRiskPct, decayPressurePct, retentionPct);

  return {
    rankProgress,
    currentRank,
    directiveTier,
    disciplineRiskPct,
    disciplineRiskBand,
    decayPressurePct,
    decayPressureBand,
    retentionPct,
    retentionBand,
    demotion,
    progressEvent,
    nextAction,
  };
}
