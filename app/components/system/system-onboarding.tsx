"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createAccount, type AccountValidationError } from "@/lib/system/account-state";
import { ENTRY_CUTSCENE_COMPLETE_EVENT } from "@/components/system/system-entry-cutscene";
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

type StepId = "BOOT" | "BODY" | "GOAL" | "ACCOUNT";

const stepOrder: readonly StepId[] = ["BOOT", "BODY", "GOAL", "ACCOUNT"];

const goalOptions: readonly { id: OnboardingGoalId; label: string; detail: string }[] = [
  { id: "GENERAL_FITNESS", label: "GENERAL FITNESS", detail: "Build healthy habits and maintain baseline capacity." },
  { id: "FAT_LOSS", label: "FAT LOSS", detail: "Focus cadence and recovery for sustained weight reduction." },
  { id: "MUSCLE_GAIN", label: "MUSCLE GAIN", detail: "Prioritize progressive overload and recovery compliance." },
  { id: "ENDURANCE", label: "ENDURANCE", detail: "Increase work capacity and sustain longer sessions." },
  { id: "STRENGTH", label: "STRENGTH", detail: "Improve force production and load tolerance." },
  { id: "CONSISTENCY", label: "CONSISTENCY", detail: "Stabilize routine and reduce volatility." },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function errorMessage(error: AccountValidationError | undefined): string {
  if (error === "EMAIL_REQUIRED") return "EMAIL REQUIRED.";
  if (error === "EMAIL_INVALID") return "EMAIL FORMAT INVALID.";
  if (error === "EMAIL_EXISTS") return "EMAIL ALREADY REGISTERED.";
  if (error === "USERNAME_REQUIRED") return "USERNAME REQUIRED.";
  if (error === "USERNAME_EXISTS") return "USERNAME ALREADY REGISTERED.";
  if (error === "PASSWORD_REQUIRED") return "PASSWORD REQUIRED.";
  if (error === "PASSWORD_TOO_SHORT") return "PASSWORD MINIMUM IS 8 CHARACTERS.";
  return "ACCOUNT REGISTRATION FAILED.";
}

export function SystemOnboarding() {
  const { input, setInput } = useSystemSnapshot();
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [cutsceneReady, setCutsceneReady] = useState(false);
  const initialProfile = useMemo(() => loadOnboardingProfile(), []);
  const [heightCm, setHeightCm] = useState(input.heightCm);
  const [bodyWeightKg, setBodyWeightKg] = useState(input.bodyWeightKg);
  const [targetWeightKg, setTargetWeightKg] = useState(input.targetWeightKg);
  const [fitnessBaselinePct, setFitnessBaselinePct] = useState(input.fitnessBaselinePct);
  const [expectedCadence, setExpectedCadence] = useState(input.expectedCadence);
  const [goal, setGoal] = useState<OnboardingGoalId>(initialProfile?.goal ?? "GENERAL_FITNESS");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(initialProfile?.unitSystem ?? input.unitSystem);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const onboardingRequired = useSyncExternalStore(
    () => () => undefined,
    () => !isOnboardingComplete(),
    () => false,
  );
  const open = onboardingRequired && cutsceneReady;

  useEffect(() => {
    if (!onboardingRequired) return;

    const handleReady = () => setCutsceneReady(true);
    window.addEventListener(ENTRY_CUTSCENE_COMPLETE_EVENT, handleReady);
    return () => {
      window.removeEventListener(ENTRY_CUTSCENE_COMPLETE_EVENT, handleReady);
    };
  }, [onboardingRequired]);

  const currentStep = stepOrder[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / stepOrder.length) * 100);

  const canAdvance = useMemo(() => {
    if (currentStep === "BODY") {
      return heightCm > 0 && bodyWeightKg > 0 && targetWeightKg > 0;
    }
    if (currentStep === "ACCOUNT") {
      return email.trim().length > 0 && username.trim().length > 0 && password.length >= 8;
    }
    return true;
  }, [bodyWeightKg, currentStep, email, heightCm, password.length, targetWeightKg, username]);

  const completeOnboarding = () => {
    const accountResult = createAccount(email, username, password);
    if (!accountResult.ok) {
      setStatus(errorMessage(accountResult.error));
      return;
    }

    setInput((current) => ({
      ...current,
      heightCm: clamp(heightCm, 120, 230),
      bodyWeightKg: clamp(bodyWeightKg, 20, 350),
      targetWeightKg: clamp(targetWeightKg, 20, 350),
      fitnessBaselinePct: clamp(fitnessBaselinePct, 0, 100),
      expectedCadence,
      unitSystem,
    }));

    saveOnboardingProfile({
      version: 1,
      createdAtIso: new Date().toISOString(),
      goal,
      unitSystem,
      knownActivityIds: [],
      primaryActivityId: "",
    });
    markOnboardingComplete(true);
  };

  const nextStep = () => setStepIndex((current) => Math.min(stepOrder.length - 1, current + 1));
  const prevStep = () => setStepIndex((current) => Math.max(0, current - 1));

  return (
    <AnimatePresence>
      {open ? (
        <motion.div initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] bg-black/86 backdrop-blur-[1px]">
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <motion.section
              initial={false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-[min(96vw,760px)] overflow-hidden border border-cyan-500/55 bg-black/95 p-5 font-mono shadow-[0_0_26px_rgba(0,229,255,0.16)]"
            >
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(0,229,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-cyan-500">ASCEND.EXE INITIALIZATION</p>
                    <h2 className="mt-2 text-lg tracking-[0.08em] text-cyan-100">MANDATORY PROFILE SETUP</h2>
                  </div>
                </div>

                {status ? <p className="mt-3 border border-cyan-500/35 px-3 py-2 text-[11px] tracking-[0.14em] text-cyan-300/90">{status}</p> : null}

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
                  Step {stepIndex + 1}/{stepOrder.length} | {progressPct}% complete
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
                        <p className="text-sm text-cyan-200">Initialization requires full onboarding completion.</p>
                        <p className="text-xs text-cyan-300/85">Progression and squad competition are locked until setup is complete.</p>
                        <div className="grid gap-2 text-xs text-cyan-300/90">
                          <p className="border border-cyan-500/25 px-3 py-2">1. BODY SIGNALS</p>
                          <p className="border border-cyan-500/25 px-3 py-2">2. GOAL VECTOR</p>
                          <p className="border border-cyan-500/25 px-3 py-2">3. ACCOUNT REGISTRATION</p>
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
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">FITNESS LEVEL (0-100)</span>
                          <input
                            type="number"
                            step="1"
                            value={fitnessBaselinePct}
                            onChange={(event) => setFitnessBaselinePct(Number(event.target.value) || 0)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1 sm:col-span-2">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">WORKOUT GOAL</span>
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

                    {currentStep === "ACCOUNT" ? (
                      <div className="grid gap-3">
                        <p className="text-sm text-cyan-200">Final step. Register account to unlock app access.</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <p className="border border-cyan-500/25 px-3 py-2 text-xs text-cyan-300/90">HEIGHT {formatHeight(clamp(heightCm, 120, 230), unitSystem)}</p>
                          <p className="border border-cyan-500/25 px-3 py-2 text-xs text-cyan-300/90">WEIGHT {formatWeight(clamp(bodyWeightKg, 20, 350), unitSystem)}</p>
                        </div>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">EMAIL</span>
                          <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">USERNAME</span>
                          <input
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
                        <label className="grid gap-1">
                          <span className="text-[10px] tracking-[0.16em] text-cyan-500">PASSWORD (8+ CHARACTERS)</span>
                          <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none focus:border-cyan-300"
                          />
                        </label>
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

                  {currentStep !== "ACCOUNT" ? (
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
                      disabled={!canAdvance}
                      className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-35"
                    >
                      CREATE ACCOUNT AND ENTER
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
