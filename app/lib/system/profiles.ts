import { defaultSessionLogInput, type SessionLogInput } from "./session-state";

export type SessionProfileId = "LIGHT" | "STANDARD" | "MAX";

export type SessionProfileDefinition = {
  id: SessionProfileId;
  label: string;
  baseRate: number;
  intensityMultiplier: number;
  durationMultiplier: number;
  outcomeMultiplier: number;
  consistencyMultiplier: number;
};

export const sessionProfiles: readonly SessionProfileDefinition[] = [
  {
    id: "LIGHT",
    label: "LIGHT DAY",
    baseRate: 100,
    intensityMultiplier: 1.05,
    durationMultiplier: 0.9,
    outcomeMultiplier: 0.95,
    consistencyMultiplier: 1,
  },
  {
    id: "STANDARD",
    label: "STANDARD DAY",
    baseRate: 120,
    intensityMultiplier: 1.3,
    durationMultiplier: 1.15,
    outcomeMultiplier: 0.85,
    consistencyMultiplier: 1.1,
  },
  {
    id: "MAX",
    label: "MAX DAY",
    baseRate: 145,
    intensityMultiplier: 1.45,
    durationMultiplier: 1.25,
    outcomeMultiplier: 1,
    consistencyMultiplier: 1.2,
  },
];

export function applySessionProfile(current: SessionLogInput, profileId: SessionProfileId): SessionLogInput {
  const profile = sessionProfiles.find((item) => item.id === profileId) ?? sessionProfiles[1];

  return {
    ...current,
    baseRate: profile.baseRate,
    intensityMultiplier: profile.intensityMultiplier,
    durationMultiplier: profile.durationMultiplier,
    outcomeMultiplier: profile.outcomeMultiplier,
    consistencyMultiplier: profile.consistencyMultiplier,
  };
}

export function resetSessionInputToStandard(current: SessionLogInput): SessionLogInput {
  return {
    ...defaultSessionLogInput,
    primaryActivityCodename: current.primaryActivityCodename,
    activityId: current.activityId,
    bodyTrainingProfile: current.bodyTrainingProfile,
    recentDisciplineStates: [...current.recentDisciplineStates],
    totalXpBeforeSession: current.totalXpBeforeSession,
    levelStartXp: current.levelStartXp,
    bodyWeightKg: current.bodyWeightKg,
    targetWeightKg: current.targetWeightKg,
    dietAdherencePct: current.dietAdherencePct,
    fitnessBaselinePct: current.fitnessBaselinePct,
  };
}
