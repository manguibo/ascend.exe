import type { DisciplineState } from "./types";

export function getCompromisedDayCount(states: readonly DisciplineState[]): number {
  return states.filter((state) => state === "COMPROMISED").length;
}

export function getDisciplineRiskPct(states: readonly DisciplineState[]): number {
  if (states.length === 0) {
    return 0;
  }

  return Math.round((getCompromisedDayCount(states) / states.length) * 100);
}

export function getDecayPressurePct(inactiveDays: number, graceDays: number, pressureWindowDays = 7): number {
  const decayingDays = Math.max(0, inactiveDays - graceDays);
  if (decayingDays === 0) {
    return 0;
  }

  const normalized = Math.round((decayingDays / Math.max(1, pressureWindowDays)) * 100);
  return Math.max(0, Math.min(100, normalized));
}

export function getRetentionPct(preDecayTotalXp: number, postDecayTotalXp: number): number {
  if (preDecayTotalXp <= 0) {
    return 100;
  }

  const raw = Math.round((postDecayTotalXp / preDecayTotalXp) * 100);
  return Math.max(0, Math.min(100, raw));
}
