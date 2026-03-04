"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ActivityPicker } from "@/components/system/activity-picker";
import { getRankProgress } from "@/lib/ranks/progression";
import { activityCatalog, getActivityDefinition } from "@/lib/system/activity-catalog";
import { appendSessionHistoryEntry } from "@/lib/system/session-history";
import { getEffectiveHybridSegments, injuryRegionOptions, type HybridSessionSegment, type InjuryRegionId } from "@/lib/system/session-state";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { useUiPanelOpen } from "@/lib/system/use-ui-panel-open";

type ActivityQuestionnaireState = {
  activityId: string;
  durationMinutes: number;
  durationInput: string;
  intensityLevel: number;
  injuryRegionId: InjuryRegionId;
  injurySeverityLevel: number;
};

type ActivityLogResult = {
  sessionXp: number;
  rankId: string;
  nextRankId: string;
  bandProgressPct: number;
  xpToNextRank: number;
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

export function GlobalActivityOverlay() {
  const { input, setInput } = useSystemSnapshot();
  const { open, toggleOpen, setOpen } = useUiPanelOpen("global-activity-overlay", false);
  const [activityQuestionnaire, setActivityQuestionnaire] = useState<ActivityQuestionnaireState | null>(null);
  const [logResult, setLogResult] = useState<ActivityLogResult | null>(null);
  const [logNotice, setLogNotice] = useState<string>("");
  const selected = getActivityDefinition(input.activityId);
  const effectiveSegments = getEffectiveHybridSegments(input);
  const primarySegment = effectiveSegments[0];
  const secondarySegment = effectiveSegments[1] ?? null;

  const applyActivity = (activityId: string) => {
    const activity = getActivityDefinition(activityId);
    const durationMinutes = clamp(Math.round(input.durationMultiplier * 80 - 48), 10, 240);
    const intensityLevel = clamp(Math.round((input.intensityMultiplier - 0.75) / 0.14), 1, 10);
    setInput((prev) => ({
      ...prev,
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
      hybridSegments: [
        {
          activityId: activity.id,
          sharePct: prev.hybridMode && prev.hybridSegments.length > 1 ? prev.hybridSegments[0].sharePct : 100,
          intensityMultiplier: prev.intensityMultiplier,
          durationMultiplier: prev.durationMultiplier,
          outcomeMultiplier: prev.outcomeMultiplier,
          category: activity.profile === "CONDITIONING" ? "CONDITIONING" : "STRENGTH",
        },
        ...(prev.hybridMode && prev.hybridSegments.length > 1
          ? [
              {
                ...prev.hybridSegments[1],
                sharePct: Math.max(0, 100 - prev.hybridSegments[0].sharePct),
              },
            ]
          : []),
      ],
    }));
    setActivityQuestionnaire({
      activityId: activity.id,
      durationMinutes,
      durationInput: String(durationMinutes),
      intensityLevel,
      injuryRegionId: input.injuryRegionId,
      injurySeverityLevel: input.injurySeverityLevel,
    });
    setOpen(false);
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

  const closeQuestionnaire = () => setActivityQuestionnaire(null);

  const setHybridMode = (enabled: boolean) => {
    setInput((prev) => {
      if (!enabled) {
        return {
          ...prev,
          hybridMode: false,
          hybridSegments: [
            {
              activityId: prev.activityId,
              sharePct: 100,
              intensityMultiplier: prev.intensityMultiplier,
              durationMultiplier: prev.durationMultiplier,
              outcomeMultiplier: prev.outcomeMultiplier,
              category: getActivityDefinition(prev.activityId).profile === "CONDITIONING" ? "CONDITIONING" : "STRENGTH",
            },
          ],
        };
      }
      const existing = getEffectiveHybridSegments(prev);
      const primary = existing[0];
      const fallbackSecondary = activityCatalog.find((activity) => activity.id !== primary.activityId && activity.profile === "CONDITIONING") ?? activityCatalog[0];
      const secondary: HybridSessionSegment =
        existing[1] ??
        ({
          activityId: fallbackSecondary.id,
          sharePct: 45,
          intensityMultiplier: clamp(primary.intensityMultiplier * 0.92, 0.6, 3),
          durationMultiplier: clamp(primary.durationMultiplier * 0.95, 0.6, 3),
          outcomeMultiplier: primary.outcomeMultiplier,
          category: fallbackSecondary.profile === "CONDITIONING" ? "CONDITIONING" : "STRENGTH",
        } satisfies HybridSessionSegment);
      return {
        ...prev,
        hybridMode: true,
        hybridSegments: [
          { ...primary, sharePct: 55 },
          { ...secondary, sharePct: 45 },
        ],
      };
    });
  };

  const setSecondaryActivity = (activityId: string) => {
    setInput((prev) => {
      const primary = getEffectiveHybridSegments(prev)[0];
      const secondaryActivity = getActivityDefinition(activityId);
      return {
        ...prev,
        hybridMode: true,
        hybridSegments: [
          { ...primary, sharePct: clamp(primary.sharePct || 55, 10, 90) },
          {
            activityId: secondaryActivity.id,
            sharePct: Math.max(10, 100 - clamp(primary.sharePct || 55, 10, 90)),
            intensityMultiplier: clamp(primary.intensityMultiplier * 0.92, 0.6, 3),
            durationMultiplier: clamp(primary.durationMultiplier * 0.95, 0.6, 3),
            outcomeMultiplier: primary.outcomeMultiplier,
            category: secondaryActivity.profile === "CONDITIONING" ? "CONDITIONING" : "STRENGTH",
          },
        ],
      };
    });
  };

  const setPrimaryShare = (sharePct: number) => {
    setInput((prev) => {
      const segments = getEffectiveHybridSegments(prev);
      const primary = segments[0];
      const secondary = segments[1];
      if (!secondary) return prev;
      const clamped = clamp(sharePct, 10, 90);
      return {
        ...prev,
        hybridMode: true,
        hybridSegments: [
          { ...primary, sharePct: clamped },
          { ...secondary, sharePct: 100 - clamped },
        ],
      };
    });
  };

  const logCurrentEntry = (options?: { closeQuestionnaireAfter?: boolean; closeOverlayAfter?: boolean }) => {
    const entry = appendSessionHistoryEntry(input);
    if (!entry) {
      setLogNotice("ENTRY REJECTED");
      return;
    }
    const rankProgress = getRankProgress(entry.totalXp);
    setInput((prev) => ({
      ...prev,
      totalXpBeforeSession: entry.totalXp,
      inactiveDays: 0,
    }));
    setLogResult({
      sessionXp: entry.sessionXp,
      rankId: rankProgress.currentRank.id,
      nextRankId: rankProgress.nextRank?.id ?? rankProgress.currentRank.id,
      bandProgressPct: rankProgress.bandProgressPct,
      xpToNextRank: rankProgress.xpToNextRank,
    });
    if (options?.closeQuestionnaireAfter) {
      setActivityQuestionnaire(null);
    }
    if (options?.closeOverlayAfter) {
      setOpen(false);
    }
    setLogNotice("ENTRY STORED");
  };

  useEffect(() => {
    if (!activityQuestionnaire) {
      return;
    }
    const activity = getActivityDefinition(activityQuestionnaire.activityId);
    setInput((prev) => ({
      ...prev,
      ...(prev.hybridMode
        ? (() => {
            const segments = getEffectiveHybridSegments(prev);
            const primary = segments[0];
            const secondary = segments[1];
            const nextPrimary = {
              ...primary,
              activityId: activity.id,
              intensityMultiplier: intensityToMultiplier(activityQuestionnaire.intensityLevel),
              durationMultiplier: durationToMultiplier(activityQuestionnaire.durationMinutes),
              outcomeMultiplier: prev.outcomeMultiplier,
              category: activity.profile === "CONDITIONING" ? "CONDITIONING" : "STRENGTH",
            };
            const nextSecondary = secondary
              ? {
                  ...secondary,
                  intensityMultiplier: clamp(nextPrimary.intensityMultiplier * 0.92, 0.6, 3),
                  durationMultiplier: clamp(nextPrimary.durationMultiplier * 0.95, 0.6, 3),
                }
              : undefined;
            return {
              hybridSegments: [nextPrimary, ...(nextSecondary ? [nextSecondary] : [])],
            };
          })()
        : {}),
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
      durationMultiplier: durationToMultiplier(activityQuestionnaire.durationMinutes),
      intensityMultiplier: intensityToMultiplier(activityQuestionnaire.intensityLevel),
      injuryRegionId: activityQuestionnaire.injuryRegionId,
      injurySeverityLevel: activityQuestionnaire.injuryRegionId === "NONE" ? 0 : activityQuestionnaire.injurySeverityLevel,
    }));
  }, [activityQuestionnaire, setInput]);

  useEffect(() => {
    if (!logNotice) {
      return;
    }
    const timer = window.setTimeout(() => setLogNotice(""), 1800);
    return () => window.clearTimeout(timer);
  }, [logNotice]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 font-mono">
      {open ? (
        <section className="pointer-events-auto w-[min(92vw,340px)] border border-cyan-500/45 bg-black/92 p-3 shadow-[0_0_24px_rgba(0,229,255,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] tracking-[0.14em] text-cyan-200">ADD ACTIVITY</p>
            <button
              type="button"
              onClick={toggleOpen}
              className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
            >
              CLOSE
            </button>
          </div>
          <p className="mt-2 text-[10px] tracking-[0.13em] text-cyan-500/90">Current: {selected.label}</p>
          <div className="mt-3 border border-cyan-500/30 p-2">
            <p className="text-[10px] tracking-[0.14em] text-cyan-500">SESSION COMPOSITION</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setHybridMode(false)}
                className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${!input.hybridMode ? "border-cyan-300 text-cyan-100" : "border-cyan-500/35 text-cyan-300"}`}
              >
                SINGLE
              </button>
              <button
                type="button"
                onClick={() => setHybridMode(true)}
                className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${input.hybridMode ? "border-cyan-300 text-cyan-100" : "border-cyan-500/35 text-cyan-300"}`}
              >
                HYBRID
              </button>
            </div>
            {input.hybridMode ? (
              <div className="mt-2 grid gap-2">
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">Companion activity</span>
                  <select
                    value={secondarySegment?.activityId ?? ""}
                    onChange={(event) => setSecondaryActivity(event.target.value)}
                    className="border border-cyan-500/40 bg-black px-2 py-1.5 text-[11px] text-cyan-200 outline-none focus:border-cyan-300"
                  >
                    {activityCatalog
                      .filter((activity) => activity.id !== primarySegment.activityId)
                      .map((activity) => (
                        <option key={`secondary-${activity.id}`} value={activity.id} className="bg-black text-cyan-200">
                          {activity.label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">
                    Primary share ({primarySegment.sharePct}% / {100 - primarySegment.sharePct}%)
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={1}
                    value={primarySegment.sharePct}
                    onChange={(event) => setPrimaryShare(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none border border-cyan-500/40 bg-black accent-cyan-300"
                  />
                </label>
              </div>
            ) : null}
          </div>
          <ActivityPicker activities={activityCatalog} selectedActivityId={input.activityId} onSelect={applyActivity} className="mt-3" />
          <button
            type="button"
            onClick={() => logCurrentEntry({ closeOverlayAfter: true })}
            className="mt-3 w-full border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-[10px] tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-500/18"
          >
            LOG CURRENT ENTRY
          </button>
          {logNotice ? <p className="mt-2 text-[10px] tracking-[0.14em] text-cyan-300/90">{logNotice}</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="pointer-events-auto mt-2 border border-cyan-300/80 bg-black/90 px-3 py-2 text-xs tracking-[0.16em] text-cyan-100 shadow-[0_0_18px_rgba(0,229,255,0.18)] transition-colors hover:bg-cyan-500/10"
      >
        + ADD ACTIVITY
      </button>

      <AnimatePresence>
        {logResult ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-[75] grid place-items-center bg-black/82 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-md border border-cyan-500/45 bg-black p-4 font-mono"
            >
              <p className="text-[10px] tracking-[0.2em] text-cyan-500">ENTRY CONFIRMED</p>
              <p className="mt-2 text-sm text-cyan-100">XP +{logResult.sessionXp}</p>
              <p className="mt-1 text-[11px] text-cyan-300/90">
                Rank {logResult.rankId} | Next {logResult.nextRankId}
              </p>

              <div className="mt-3 border border-cyan-500/35 p-2">
                <div className="h-2 w-full border border-cyan-500/35 bg-black">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${logResult.bandProgressPct}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="h-full bg-cyan-300/85"
                  />
                </div>
                <p className="mt-1 text-[10px] tracking-[0.12em] text-cyan-300/90">{logResult.bandProgressPct}% TO NEXT RANK</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] tracking-[0.12em]">
                <p className="text-cyan-500">CURRENT RANK</p>
                <p className="text-right text-cyan-100">{logResult.rankId}</p>
                <p className="text-cyan-500">NEXT RANK</p>
                <p className="text-right text-cyan-100">{logResult.nextRankId}</p>
                <p className="text-cyan-500">XP EARNED</p>
                <p className="text-right text-cyan-100">+{logResult.sessionXp}</p>
                <p className="text-cyan-500">XP TO RANK UP</p>
                <p className="text-right text-cyan-100">{logResult.xpToNextRank}</p>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setLogResult(null)}
                  className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.section>
        ) : null}
        {activityQuestionnaire ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="w-full max-w-md border border-cyan-500/45 bg-black p-4 font-mono"
            >
              <p className="text-[10px] tracking-[0.2em] text-cyan-500">Activity details</p>
              <p className="mt-2 text-sm text-cyan-100">{getActivityDefinition(activityQuestionnaire.activityId).label}</p>
              <p className="mt-1 text-[10px] text-cyan-300/85">Set workout time and effort level.</p>

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
                  Effort ({activityQuestionnaire.intensityLevel}/10)
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
                <span className="text-[10px] tracking-[0.14em] text-cyan-500">Injury area (optional)</span>
                <select
                  value={activityQuestionnaire.injuryRegionId}
                  onChange={(event) => handleQuestionnaireUpdate({ injuryRegionId: event.target.value as InjuryRegionId })}
                  className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                >
                  {injuryRegionOptions.map((regionId) => (
                    <option key={`global-injury-option-${regionId}`} value={regionId} className="bg-black text-cyan-200">
                      {injuryRegionLabelById[regionId]}
                    </option>
                  ))}
                </select>
              </label>

              {activityQuestionnaire.injuryRegionId !== "NONE" ? (
                <label className="mt-3 grid gap-1">
                  <span className="text-[10px] tracking-[0.14em] text-cyan-500">
                    Injury level ({activityQuestionnaire.injurySeverityLevel}/10)
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
                  onClick={() => logCurrentEntry({ closeQuestionnaireAfter: true, closeOverlayAfter: true })}
                  className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  Log entry
                </button>
                <button
                  type="button"
                  onClick={closeQuestionnaire}
                  className="border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  Apply settings
                </button>
                <button
                  type="button"
                  onClick={closeQuestionnaire}
                  className="border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
