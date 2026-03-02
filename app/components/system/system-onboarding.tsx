"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState, useSyncExternalStore } from "react";
import { activityCatalog, getActivityDefinition } from "@/lib/system/activity-catalog";
import { displayWeightToKg, formatHeight, formatWeight, getHeightUnitLabel, getWeightUnitLabel, heightCmToDisplay, heightDisplayToCm, kgToDisplayWeight } from "@/lib/system/units";
import {
  isOnboardingComplete,
  loadOnboardingProfile,
  markOnboardingComplete,
  saveOnboardingProfile,
  type OnboardingGoalId,
} from "@/lib/system/onboarding-state";
import { cadenceOptions, unitSystemOptions, type UnitSystem } from "@/lib/system/session-state";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

type StepId = "BOOT" | "BODY" | "GOAL" | "ACTIVITY" | "READY";

const stepOrder: readonly StepId[] = ["BOOT", "BODY", "GOAL", "ACTIVITY", "READY"];

const goalOptions: readonly { id: OnboardingGoalId; label: string; detail: string }[] = [
  { id: "GENERAL_FITNESS", label: "GENERAL FITNESS", detail: "Balanced performance and health improvements." },
  { id: "FAT_LOSS", label: "FAT LOSS", detail: "Prioritize consistency, calorie control, and conditioning." },
  { id: "MUSCLE_GAIN", label: "MUSCLE GAIN", detail: "Prioritize overload, nutrition, and recovery quality." },
  { id: "ENDURANCE", label: "ENDURANCE", detail: "Build sustainable capacity and work output over time." },
  { id: "STRENGTH", label: "STRENGTH", detail: "Focus on progressive intensity and structural recovery." },
  { id: "CONSISTENCY", label: "CONSISTENCY", detail: "Lock routine reliability before increasing complexity." },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function SystemOnboarding() {
  const { input, setInput } = useSystemSnapshot();
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const initialProfile = useMemo(() => loadOnboardingProfile(), []);
  const [heightCm, setHeightCm] = useState(input.heightCm);
  const [bodyWeightKg, setBodyWeightKg] = useState(input.bodyWeightKg);
  const [targetWeightKg, setTargetWeightKg] = useState(input.targetWeightKg);
  const [fitnessBaselinePct, setFitnessBaselinePct] = useState(input.fitnessBaselinePct);
  const [expectedCadence, setExpectedCadence] = useState(input.expectedCadence);
  const [goal, setGoal] = useState<OnboardingGoalId>(initialProfile?.goal ?? "GENERAL_FITNESS");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile?.unitSystem ?? input.unitSystem);
  const [search, setSearch] = useState("");
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    initialProfile?.knownActivityIds.length ? initialProfile.knownActivityIds : [input.activityId],
  );
  const [primaryActivityId, setPrimaryActivityId] = useState(initialProfile?.primaryActivityId || input.activityId);

  const open = useSyncExternalStore(
    () => () => undefined,
    () => !isOnboardingComplete() && !dismissed,
    () => false,
  );

  const currentStep = stepOrder[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / stepOrder.length) * 100);
  const filteredActivities = useMemo(() => {
    const query = search.trim().toUpperCase();
    if (!query) return activityCatalog;
    return activityCatalog.filter((activity) => activity.label.includes(query) || activity.id.includes(query) || activity.codename.includes(query));
  }, [search]);

  const canAdvance = useMemo(() => {
    if (currentStep === "BODY") {
      return heightCm > 0 && bodyWeightKg > 0 && targetWeightKg > 0;
    }
    if (currentStep === "ACTIVITY") {
      return selectedActivities.length > 0 && primaryActivityId.length > 0;
    }
    return true;
  }, [bodyWeightKg, currentStep, heightCm, primaryActivityId, selectedActivities.length, targetWeightKg]);

  const toggleActivity = (activityId: string) => {
    setSelectedActivities((current) => {
      if (current.includes(activityId)) {
        const next = current.filter((id) => id !== activityId);
        if (primaryActivityId === activityId) {
          setPrimaryActivityId(next[0] ?? "");
        }
        return next;
      }
      const next = [...current, activityId].slice(0, 10);
      if (!primaryActivityId) {
        setPrimaryActivityId(activityId);
      }
      return next;
    });
  };

  const completeOnboarding = () => {
    const primary = getActivityDefinition(primaryActivityId || selectedActivities[0] || input.activityId);
    setInput((current) => ({
      ...current,
      heightCm: clamp(heightCm, 120, 230),
      bodyWeightKg: clamp(bodyWeightKg, 20, 350),
      targetWeightKg: clamp(targetWeightKg, 20, 350),
      fitnessBaselinePct: clamp(fitnessBaselinePct, 0, 100),
      expectedCadence,
      unitSystem,
      activityId: primary.id,
      primaryActivityCodename: primary.codename,
      bodyTrainingProfile: primary.profile,
    }));

    saveOnboardingProfile({
      version: 1,
      createdAtIso: new Date().toISOString(),
      goal,
      unitSystem,
      knownActivityIds: selectedActivities,
      primaryActivityId: primary.id,
    });
    markOnboardingComplete(true);
    setDismissed(true);
  };

  const skipOnboarding = () => {
    markOnboardingComplete(true);
    setDismissed(true);
  };

  const nextStep = () => setStepIndex((current) => Math.min(stepOrder.length - 1, current + 1));
  const prevStep = () => setStepIndex((current) => Math.max(0, current - 1));

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-[1px]"
        >
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <motion.section
              initial={false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-[min(96vw,760px)] overflow-hidden border border-cyan-500/55 bg-black/95 p-5 font-mono shadow-[0_0_26px_rgba(0,229,255,0.16)]"
            >
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,229,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
                initial={false}
                animate={{ x: ["-130%", "400%"] }}
                transition={{ duration: 3.6, ease: "linear", repeat: Infinity, repeatDelay: 0.9 }}
              />

              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-cyan-500">ASCEND.EXE INITIALIZATION</p>
                    <h2 className="mt-2 text-lg tracking-[0.08em] text-cyan-100">POWERING NEW SYSTEM PROFILE</h2>
                  </div>
                  <button
                    type="button"
                    onClick={skipOnboarding}
                    className="border border-cyan-500/35 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                  >
                    SKIP
                  </button>
                </div>

                <div className="mt-3 h-1.5 border border-cyan-500/30 bg-black">
                  <motion.div
                    className="h-full bg-cyan-400/85"
                    initial={false}
                    animate={{ scaleX: progressPct / 100 }}
                    style={{ transformOrigin: "left center" }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-1 text-[10px] tracking-[0.13em] text-cyan-500/85">
                  STEP {stepIndex + 1}/{stepOrder.length} | {progressPct}% COMPLETE
                </p>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="mt-4 min-h-[250px]"
                  >
                    {currentStep === "BOOT" ? (
                      <div className="grid gap-3">
                        <p className="text-sm text-cyan-200">Welcome. This setup will configure your baseline profile and activity context.</p>
                        <p className="text-xs text-cyan-300/85">Your entries will initialize readiness, stress load, and recommended recovery routing.</p>
                        <div className="grid gap-2 text-xs text-cyan-300/90">
                          <p className="border border-cyan-500/25 px-3 py-2">1. BODY BASELINE</p>
                          <p className="border border-cyan-500/25 px-3 py-2">2. PRIMARY GOAL</p>
                          <p className="border border-cyan-500/25 px-3 py-2">3. CURRENT ACTIVITIES</p>
                          <p className="border border-cyan-500/25 px-3 py-2">4. SYSTEM STARTUP</p>
                        </div>
                      </div>
                    ) : null}

                    {currentStep === "BODY" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 sm:col-span-2">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">MEASUREMENT SYSTEM</span>
                          <select
                            value={unitSystem}
                            onChange={(event) => setUnitSystem(event.target.value as UnitSystem)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          >
                            {unitSystemOptions.map((option) => (
                              <option key={`onboarding-unit-${option}`} value={option} className="bg-black text-cyan-200">
                                {option === "METRIC" ? "Metric (cm / kg)" : "Imperial (in / lb)"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">HEIGHT ({getHeightUnitLabel(unitSystem).toUpperCase()})</span>
                          <input
                            type="number"
                            step={unitSystem === "IMPERIAL" ? "0.1" : "1"}
                            value={heightCmToDisplay(heightCm, unitSystem)}
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              if (!Number.isFinite(parsed)) return;
                              setHeightCm(clamp(heightDisplayToCm(parsed, unitSystem), 120, 230));
                            }}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">CURRENT WEIGHT ({getWeightUnitLabel(unitSystem).toUpperCase()})</span>
                          <input
                            type="number"
                            step="0.1"
                            value={kgToDisplayWeight(bodyWeightKg, unitSystem)}
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              if (!Number.isFinite(parsed)) return;
                              setBodyWeightKg(clamp(displayWeightToKg(parsed, unitSystem), 20, 350));
                            }}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">TARGET WEIGHT ({getWeightUnitLabel(unitSystem).toUpperCase()})</span>
                          <input
                            type="number"
                            step="0.1"
                            value={kgToDisplayWeight(targetWeightKg, unitSystem)}
                            onChange={(event) => {
                              const parsed = Number(event.target.value);
                              if (!Number.isFinite(parsed)) return;
                              setTargetWeightKg(clamp(displayWeightToKg(parsed, unitSystem), 20, 350));
                            }}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">FITNESS BASELINE (%)</span>
                          <input
                            type="number"
                            step="1"
                            value={fitnessBaselinePct}
                            onChange={(event) => setFitnessBaselinePct(Number(event.target.value) || 0)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1 sm:col-span-2">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">WORKOUT FREQUENCY</span>
                          <select
                            value={expectedCadence}
                            onChange={(event) => setExpectedCadence(event.target.value as (typeof cadenceOptions)[number])}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          >
                            {cadenceOptions.map((option) => (
                              <option key={option} value={option} className="bg-black text-cyan-200">
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}

                    {currentStep === "GOAL" ? (
                      <div className="grid gap-2">
                        {goalOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setGoal(option.id)}
                            className={`border px-3 py-2 text-left transition-colors ${
                              goal === option.id ? "border-cyan-300 bg-cyan-500/12 text-cyan-100" : "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                            }`}
                          >
                            <p className="text-xs tracking-[0.16em]">{option.label}</p>
                            <p className="mt-1 text-[11px] text-cyan-500/90">{option.detail}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {currentStep === "ACTIVITY" ? (
                      <div className="grid gap-3">
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">SEARCH ACTIVITIES</span>
                          <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value.toUpperCase())}
                            placeholder="TYPE: RUNNING, CLIMBING, SOCCER"
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none placeholder:text-cyan-700/70 focus:border-cyan-300"
                          />
                        </label>
                        <p className="text-[11px] text-cyan-300/90">Choose activities you already do. Then select one as your primary startup activity.</p>
                        <div className="grid max-h-56 gap-2 overflow-auto border border-cyan-500/25 p-2">
                          {filteredActivities.slice(0, 40).map((activity) => {
                            const selected = selectedActivities.includes(activity.id);
                            const primary = primaryActivityId === activity.id;
                            return (
                              <div key={activity.id} className="border border-cyan-500/25 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleActivity(activity.id)}
                                    className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${
                                      selected ? "border-cyan-300 text-cyan-100" : "border-cyan-500/35 text-cyan-300"
                                    }`}
                                  >
                                    {selected ? "SELECTED" : "SELECT"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!selected}
                                    onClick={() => setPrimaryActivityId(activity.id)}
                                    className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${
                                      primary ? "border-cyan-300 bg-cyan-500/10 text-cyan-100" : "border-cyan-500/35 text-cyan-300"
                                    } disabled:opacity-35`}
                                  >
                                    {primary ? "PRIMARY" : "SET PRIMARY"}
                                  </button>
                                </div>
                                <p className="mt-2 text-xs tracking-[0.14em] text-cyan-200">{activity.label}</p>
                                <p className="mt-1 text-[10px] tracking-[0.12em] text-cyan-500/90">PROFILE {activity.profile} | {activity.codename}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {currentStep === "READY" ? (
                      <div className="grid gap-2">
                        <p className="text-sm text-cyan-100">System profile ready.</p>
                        <p className="text-xs text-cyan-300/85">Review final startup configuration:</p>
                        <div className="grid gap-2 text-xs text-cyan-300/90 sm:grid-cols-2">
                          <p className="border border-cyan-500/25 px-3 py-2">HEIGHT {formatHeight(clamp(heightCm, 120, 230), unitSystem)}</p>
                          <p className="border border-cyan-500/25 px-3 py-2">WEIGHT {formatWeight(clamp(bodyWeightKg, 20, 350), unitSystem)}</p>
                          <p className="border border-cyan-500/25 px-3 py-2">TARGET {formatWeight(clamp(targetWeightKg, 20, 350), unitSystem)}</p>
                          <p className="border border-cyan-500/25 px-3 py-2">FITNESS {clamp(fitnessBaselinePct, 0, 100)}%</p>
                          <p className="border border-cyan-500/25 px-3 py-2">GOAL {goal.replaceAll("_", " ")}</p>
                          <p className="border border-cyan-500/25 px-3 py-2">FREQUENCY {expectedCadence}</p>
                          <p className="border border-cyan-500/25 px-3 py-2 sm:col-span-2">
                            PRIMARY ACTIVITY {getActivityDefinition(primaryActivityId || selectedActivities[0] || input.activityId).label}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={stepIndex === 0}
                    className="border border-cyan-500/35 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-35"
                  >
                    BACK
                  </button>

                  {currentStep !== "READY" ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canAdvance}
                      className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-35"
                    >
                      NEXT
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={completeOnboarding}
                      className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                    >
                      INITIALIZE SYSTEM
                    </button>
                  )}
                </div>
              </div>
            </motion.section>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
