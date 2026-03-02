"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ActivityPicker } from "@/components/system/activity-picker";
import { BodyRecoveryDiagram } from "@/components/system/body-recovery-diagram";
import { PageHeader } from "@/components/system/page-header";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { MicroMetricGrid } from "@/components/system/micro-metric-grid";
import { SessionProfileButtons } from "@/components/system/session-profile-buttons";
import { SystemTelemetryPanel } from "@/components/system/system-telemetry-panel";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { XpFactorBars } from "@/components/system/xp-factor-bars";
import { XpRetentionBars } from "@/components/system/xp-retention-bars";
import { displayWeightToKg, getHeightUnitLabel, getWeightUnitLabel, heightCmToDisplay, heightDisplayToCm, kgToDisplayWeight } from "@/lib/system/units";
import { activityCatalog, getActivityDefinition } from "@/lib/system/activity-catalog";
import { buildBodyRecoveryView, buildBodyRegionInsights, getRecentStressLevels, type BodyRegionId } from "@/lib/system/body-recovery";
import { applySessionProfile, resetSessionInputToStandard, sessionProfiles } from "@/lib/system/profiles";
import { appendSessionHistoryEntry, clearSessionHistory } from "@/lib/system/session-history";
import { usePerformanceView } from "@/lib/system/use-performance-view";
import { useSessionHistory } from "@/lib/system/use-session-history";
import {
  bodyTrainingProfileOptions,
  bodySignalFields,
  cadenceOptions,
  disciplineStateOptions,
  injuryRegionOptions,
  sessionLogFields,
  type InjuryRegionId,
  type SessionLogInput,
} from "@/lib/system/session-state";
import type { DisciplineState } from "@/lib/system/types";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

type ActivityQuestionnaireState = {
  activityId: string;
  durationMinutes: number;
  durationInput: string;
  intensityLevel: number;
  injuryRegionId: InjuryRegionId;
  injurySeverityLevel: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function durationToMultiplier(minutes: number): number {
  return clamp(0.6 + minutes / 80, 0.6, 3);
}

function intensityToMultiplier(level: number): number {
  return clamp(0.75 + level * 0.14, 0.6, 3);
}

const injuryRegionLabelById: Record<InjuryRegionId, string> = {
  NONE: "No injury",
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  CORE: "Core",
  GLUTES: "Glutes",
  QUADS: "Quads",
  HAMSTRINGS: "Hamstrings",
};

function buildLiveStressLevels(view: ReturnType<typeof buildBodyRecoveryView>): Partial<Record<BodyRegionId, number>> {
  return Object.fromEntries(
    view.regions.map((region) => {
      const load = clamp(region.loadPct / 100, 0, 1);
      const readinessPenalty = clamp((100 - region.readinessPct) / 100, 0, 1);
      const score = clamp(load * 0.6 + readinessPenalty * 0.4, 0, 1);
      return [region.id, score];
    }),
  );
}

export default function LogPage() {
  const { input, setInput, snapshot } = useSystemSnapshot();
  const { entries: sessionHistory } = useSessionHistory();
  const [activityPickerOpen, setActivityPickerOpen] = useState(false);
  const [activityQuestionnaire, setActivityQuestionnaire] = useState<ActivityQuestionnaireState | null>(null);
  const { rankProgress, currentRank, directiveTier, disciplineRiskPct, decayPressurePct, retentionPct } = usePerformanceView(snapshot);
  const selectedActivity = getActivityDefinition(input.activityId);
  const bodyRecoveryView = buildBodyRecoveryView(input);
  const bodyInsights = buildBodyRegionInsights(bodyRecoveryView, sessionHistory);
  const historyStressLevels = getRecentStressLevels(sessionHistory, 3);
  const liveStressLevels = buildLiveStressLevels(bodyRecoveryView);
  const mergedStressLevels = {
    ...historyStressLevels,
    ...Object.fromEntries(
      Object.entries(liveStressLevels).map(([regionId, score]) => [
        regionId,
        clamp(Math.max(score ?? 0, historyStressLevels[regionId as keyof typeof historyStressLevels] ?? 0), 0, 1),
      ]),
    ),
  };

  const handleChange = (field: keyof SessionLogInput, rawValue: string) => {
    const parsed = Number(rawValue);
    const value = Number.isFinite(parsed) ? parsed : 0;
    setInput((prev) => ({ ...prev, [field]: value }));
  };

  const handleBodySignalChange = (field: "heightCm" | "bodyWeightKg" | "targetWeightKg" | "fitnessBaselinePct", rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setInput((prev) => {
      if (field === "fitnessBaselinePct") {
        return { ...prev, fitnessBaselinePct: clamp(parsed, 0, 100) };
      }
      if (field === "heightCm") {
        return { ...prev, heightCm: clamp(heightDisplayToCm(parsed, prev.unitSystem), 120, 230) };
      }
      const metricWeight = displayWeightToKg(parsed, prev.unitSystem);
      if (field === "bodyWeightKg") {
        return { ...prev, bodyWeightKg: clamp(metricWeight, 20, 350) };
      }
      return { ...prev, targetWeightKg: clamp(metricWeight, 20, 350) };
    });
  };

  const handleDisciplineChange = (index: number, state: DisciplineState) => {
    setInput((prev) => {
      const next = [...prev.recentDisciplineStates];
      next[index] = state;
      return { ...prev, recentDisciplineStates: next };
    });
  };

  const handleResetStandard = () => {
    setInput((prev) => resetSessionInputToStandard(prev));
  };

  const handleCodenameChange = (rawValue: string) => {
    const normalized = rawValue.toUpperCase().slice(0, 48);
    setInput((prev) => ({ ...prev, primaryActivityCodename: normalized }));
  };

  const handleApplyActivity = (activityId: string) => {
    const activity = getActivityDefinition(activityId);
    const durationMinutes = clamp(Math.round(input.durationMultiplier * 80 - 48), 10, 240);
    const intensityLevel = clamp(Math.round((input.intensityMultiplier - 0.75) / 0.14), 1, 10);
    setInput((prev) => ({
      ...prev,
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
    }));
    setActivityPickerOpen(false);
    setActivityQuestionnaire({
      activityId: activity.id,
      durationMinutes,
      durationInput: String(durationMinutes),
      intensityLevel,
      injuryRegionId: input.injuryRegionId,
      injurySeverityLevel: input.injurySeverityLevel,
    });
  };

  const handleQuestionnaireUpdate = (patch: Partial<ActivityQuestionnaireState>) => {
    setActivityQuestionnaire((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (next.injuryRegionId === "NONE") {
        next.injurySeverityLevel = 0;
      } else if (next.injurySeverityLevel < 1) {
        next.injurySeverityLevel = 1;
      }
      return next;
    });
  };

  const handleQuestionnaireClose = () => {
    setActivityQuestionnaire(null);
  };

  useEffect(() => {
    if (!activityQuestionnaire) {
      return;
    }
    const activity = getActivityDefinition(activityQuestionnaire.activityId);
    setInput((prev) => ({
      ...prev,
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
      durationMultiplier: durationToMultiplier(activityQuestionnaire.durationMinutes),
      intensityMultiplier: intensityToMultiplier(activityQuestionnaire.intensityLevel),
      injuryRegionId: activityQuestionnaire.injuryRegionId,
      injurySeverityLevel: activityQuestionnaire.injuryRegionId === "NONE" ? 0 : activityQuestionnaire.injurySeverityLevel,
    }));
  }, [activityQuestionnaire, setInput]);

  const handleCommitHistory = () => {
    appendSessionHistoryEntry(input);
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ASCEND // Workout Log"
          title="Log a Workout"
          description="Enter your session details and watch recovery insights update in real time."
          statusLine="Auto-save status: active"
        />

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-4">
            <CollapsiblePanel panelId="log-primary-activity" title="Primary activity">
              <div className="font-mono">
                <label className="grid gap-1">
                  <span className="text-xs tracking-[0.16em] text-cyan-500">Activity name</span>
                  <input
                    type="text"
                    maxLength={48}
                    value={input.primaryActivityCodename}
                    onChange={(event) => handleCodenameChange(event.target.value)}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-sm tracking-[0.08em] text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-xs tracking-[0.14em] text-cyan-300/85">Selected activity: {selectedActivity.label}</p>
                  <button
                    type="button"
                    onClick={() => setActivityPickerOpen((open) => !open)}
                    className="border border-cyan-500/40 px-2 py-1 text-xs tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                  >
                    + Choose activity
                  </button>
                </div>
                {activityPickerOpen ? (
                  <ActivityPicker
                    activities={activityCatalog}
                    selectedActivityId={input.activityId}
                    onSelect={handleApplyActivity}
                    className="mt-3 border border-cyan-500/35 p-3"
                  />
                ) : null}
                <label className="mt-3 grid gap-1">
                  <span className="text-xs tracking-[0.16em] text-cyan-500">Workout frequency</span>
                  <select
                    value={input.expectedCadence}
                    onChange={(event) => setInput((prev) => ({ ...prev, expectedCadence: event.target.value as SessionLogInput["expectedCadence"] }))}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-sm tracking-[0.08em] text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    {cadenceOptions.map((option) => (
                      <option key={option} value={option} className="bg-black text-cyan-200">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 grid gap-1">
                  <span className="text-xs tracking-[0.16em] text-cyan-500">Training profile</span>
                  <select
                    value={input.bodyTrainingProfile}
                    onChange={(event) =>
                      setInput((prev) => ({ ...prev, bodyTrainingProfile: event.target.value as SessionLogInput["bodyTrainingProfile"] }))
                    }
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-sm tracking-[0.08em] text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    {bodyTrainingProfileOptions.map((option) => (
                      <option key={option} value={option} className="bg-black text-cyan-200">
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-cyan-300/80">This activity name will be used across your overview and plans.</p>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-session-parameters" title="Session details">
              <form className="grid gap-3 font-mono">
                {sessionLogFields.map((field) => (
                  <label key={field.key} className="grid gap-1">
                    <span className="text-xs tracking-[0.16em] text-cyan-500">{field.label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={field.step ?? "0.01"}
                      value={input[field.key]}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                      className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                    />
                  </label>
                ))}
              </form>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-body-signal-inputs" title="Body stats" defaultOpen={false}>
              <form className="grid gap-3 font-mono">
                {bodySignalFields.map((field) => (
                  <label key={field.key} className="grid gap-1">
                    <span className="text-xs tracking-[0.16em] text-cyan-500">
                      {field.key === "heightCm"
                        ? `HEIGHT (${getHeightUnitLabel(input.unitSystem).toUpperCase()})`
                        : field.key === "bodyWeightKg"
                          ? `BODY WEIGHT (${getWeightUnitLabel(input.unitSystem).toUpperCase()})`
                          : field.key === "targetWeightKg"
                            ? `TARGET WEIGHT (${getWeightUnitLabel(input.unitSystem).toUpperCase()})`
                            : field.label}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={field.key === "heightCm" ? (input.unitSystem === "IMPERIAL" ? "0.1" : "1") : field.step ?? "0.1"}
                      value={
                        field.key === "heightCm"
                          ? heightCmToDisplay(input.heightCm, input.unitSystem)
                          : field.key === "bodyWeightKg"
                            ? kgToDisplayWeight(input.bodyWeightKg, input.unitSystem)
                            : field.key === "targetWeightKg"
                              ? kgToDisplayWeight(input.targetWeightKg, input.unitSystem)
                              : input[field.key]
                      }
                      onChange={(event) => handleBodySignalChange(field.key, event.target.value)}
                      className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                    />
                  </label>
                ))}
              </form>
              <p className="mt-3 text-xs text-cyan-300/80">Fitness baseline is 0-100. Your body map and readiness update from these values.</p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-discipline-history" title="Consistency history" defaultOpen={false}>
              <div className="font-mono">
                <p className="text-xs text-cyan-300/85">Set the last 7 days. Day 7 is today.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {input.recentDisciplineStates.map((state, index) => (
                    <label key={`discipline-day-${index + 1}`} className="grid gap-1">
                      <span className="text-xs tracking-[0.16em] text-cyan-500">DAY {index + 1}</span>
                      <select
                        value={state}
                        onChange={(event) => handleDisciplineChange(index, event.target.value as DisciplineState)}
                        className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                      >
                        {disciplineStateOptions.map((option) => (
                          <option key={option} value={option} className="bg-black text-cyan-200">
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-profile-presets" title="Quick presets" defaultOpen={false}>
              <div className="font-mono">
                <SessionProfileButtons
                  className="grid gap-2 sm:grid-cols-3"
                  profiles={sessionProfiles}
                  onApply={(profileId) => setInput((current) => applySessionProfile(current, profileId))}
                />
                <button
                  type="button"
                  onClick={handleResetStandard}
                  className="mt-3 border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.15em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Reset to standard
                </button>
              </div>
            </CollapsiblePanel>
          </div>

          <aside className="grid gap-4 font-mono">
            <CollapsiblePanel panelId="log-session-output" title="Session result">
              <p className="text-3xl text-cyan-200">{snapshot.xp.sessionXp} XP</p>
              <p className="mt-2 text-xs text-cyan-300/80" title="Session XP = round(BaseRate x Intensity x Duration x Outcome x Consistency)">
                Based on effort, duration, outcome, and consistency.
              </p>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-total-xp-projection" title="Total XP projection">
              <MicroMetricGrid
                columns={2}
                items={[
                  { label: "PRE-DECAY TOTAL", value: `${snapshot.xp.totalXpBeforeDecay} XP` },
                  { label: "POST-DECAY TOTAL", value: `${snapshot.xp.totalXp} XP` },
                  { label: "DECAY DELTA", value: `-${snapshot.xp.decayDeltaXp} XP`, tone: "red" },
                  { label: "GRACE", value: `${snapshot.xp.graceDays} DAY(S)`, tone: "subtle" },
                  { label: "FREQUENCY", value: snapshot.xp.expectedCadence, tone: "subtle" },
                  { label: "DECAY FLOOR", value: `${snapshot.xp.decayFloorXp} XP` },
                ]}
              />
              <div className="mt-3 border border-cyan-500/30 p-3">
                <XpFactorBars factors={snapshot.xp.factors} />
              </div>
              <div className="mt-3">
                <XpRetentionBars
                  preDecayTotalXp={snapshot.xp.totalXpBeforeDecay}
                  postDecayTotalXp={snapshot.xp.totalXp}
                  decayDeltaXp={snapshot.xp.decayDeltaXp}
                  retentionPct={retentionPct}
                />
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-rank-projection" title="Rank preview" defaultOpen={false}>
              <p className="text-xl text-cyan-200">{currentRank.id}</p>
              <p className="mt-2 text-xs text-cyan-300/85">RANK FLOOR: {currentRank.minXp} XP</p>
              <p className="mt-2 text-xs text-cyan-300/85">PLAN LEVEL: {directiveTier.tier}</p>
              <p className="mt-2 text-xs text-cyan-500/90">
                {rankProgress.nextRank ? `Next: ${rankProgress.nextRank.id} at ${rankProgress.nextRank.minXp} XP.` : "Highest rank reached."}
              </p>
              <p className="mt-2 text-xs text-cyan-500/90">XP TO NEXT: {rankProgress.xpToNextRank}</p>
              <p className="mt-1 text-xs text-cyan-500/90">BAND PROGRESS: {rankProgress.bandProgressPct}%</p>
            </CollapsiblePanel>

            <SystemTelemetryPanel
              primaryLabel="Rank progress"
              primaryValuePct={rankProgress.bandProgressPct}
              primaryHint="Progress in your current rank band"
              disciplineRiskPct={disciplineRiskPct}
              decayPressurePct={decayPressurePct}
              disciplineStates={snapshot.recentDisciplineStates}
            />

            <CollapsiblePanel panelId="log-body-stress-preview" title="Live body stress map">
              <BodyRecoveryDiagram
                view={bodyRecoveryView}
                insights={bodyInsights}
                stressedRegionLevels={mergedStressLevels}
                activityCodename={snapshot.activity.codename}
                input={input}
              />
            </CollapsiblePanel>

            <CollapsiblePanel panelId="log-system-note" title="Notes" defaultOpen={false}>
              <p className="text-xs text-cyan-300/85">Primary activity: {snapshot.activity.codename}</p>
              <p className="mt-3 text-xs text-cyan-300/85">
                Failed sessions do not remove XP. Lower outcomes reduce XP gain. Consistency improves through regular activity.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCommitHistory}
                  className="border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.15em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Save session snapshot
                </button>
                <button
                  type="button"
                  onClick={() => clearSessionHistory()}
                  className="border border-[#7a2f35]/70 px-3 py-2 text-xs tracking-[0.15em] text-[#ff9aa4] transition-colors hover:bg-[#7a2f35]/20"
                >
                  Clear history
                </button>
              </div>
            </CollapsiblePanel>
          </aside>
          </section>
        </TacticalReveal>
      </section>

      <AnimatePresence>
        {activityQuestionnaire ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-md border border-cyan-500/45 bg-black p-4 font-mono"
            >
              <p className="text-[10px] tracking-[0.2em] text-cyan-500">Activity setup</p>
              <p className="mt-2 text-sm text-cyan-100">{getActivityDefinition(activityQuestionnaire.activityId).label}</p>
              <p className="mt-1 text-[10px] text-cyan-300/85">Set duration and intensity. The body map updates in real time.</p>

              <label className="mt-4 grid gap-1">
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">Duration (minutes)</span>
                <input
                  type="number"
                  min={10}
                  max={240}
                  step={1}
                  value={activityQuestionnaire.durationInput}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === "") {
                      handleQuestionnaireUpdate({ durationInput: raw });
                      return;
                    }
                    const parsed = Number(raw);
                    if (!Number.isFinite(parsed)) {
                      return;
                    }
                    handleQuestionnaireUpdate({
                      durationInput: raw,
                      durationMinutes: clamp(parsed, 10, 240),
                    });
                  }}
                  className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                />
              </label>

              <label className="mt-3 grid gap-1">
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">
                  Intensity ({activityQuestionnaire.intensityLevel}/10)
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={activityQuestionnaire.intensityLevel}
                  onChange={(event) => handleQuestionnaireUpdate({ intensityLevel: clamp(Number(event.target.value) || 0, 1, 10) })}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full border border-cyan-500/40 bg-black accent-cyan-300"
                />
              </label>

              <label className="mt-3 grid gap-1">
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">Injury focus (optional)</span>
                <select
                  value={activityQuestionnaire.injuryRegionId}
                  onChange={(event) => handleQuestionnaireUpdate({ injuryRegionId: event.target.value as InjuryRegionId })}
                  className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                >
                  {injuryRegionOptions.map((regionId) => (
                    <option key={`injury-option-${regionId}`} value={regionId} className="bg-black text-cyan-200">
                      {injuryRegionLabelById[regionId]}
                    </option>
                  ))}
                </select>
              </label>

              {activityQuestionnaire.injuryRegionId !== "NONE" ? (
                <label className="mt-3 grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">
                    Injury severity ({activityQuestionnaire.injurySeverityLevel}/10)
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={activityQuestionnaire.injurySeverityLevel}
                    onChange={(event) => handleQuestionnaireUpdate({ injurySeverityLevel: clamp(Number(event.target.value) || 0, 1, 10) })}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full border border-[#ff922e]/55 bg-black accent-[#ffb45f]"
                  />
                </label>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleQuestionnaireClose}
                  className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  Apply settings
                </button>
                <button
                  type="button"
                  onClick={handleQuestionnaireClose}
                  className="border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
