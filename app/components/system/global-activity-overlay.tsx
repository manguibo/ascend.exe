"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ActivityPicker } from "@/components/system/activity-picker";
import { activityCatalog, getActivityDefinition } from "@/lib/system/activity-catalog";
import { injuryRegionOptions, type InjuryRegionId } from "@/lib/system/session-state";
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
  const selected = getActivityDefinition(input.activityId);

  const applyActivity = (activityId: string) => {
    const activity = getActivityDefinition(activityId);
    const durationMinutes = clamp(Math.round(input.durationMultiplier * 80 - 48), 10, 240);
    const intensityLevel = clamp(Math.round((input.intensityMultiplier - 0.75) / 0.14), 1, 10);
    setInput((prev) => ({
      ...prev,
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
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

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 font-mono">
      {open ? (
        <section className="pointer-events-auto w-[min(92vw,340px)] border border-cyan-500/45 bg-black/92 p-3 shadow-[0_0_24px_rgba(0,229,255,0.12)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] tracking-[0.14em] text-cyan-200">CHANGE ACTIVITY</p>
            <button
              type="button"
              onClick={toggleOpen}
              className="border border-cyan-500/40 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
            >
              CLOSE
            </button>
          </div>
          <p className="mt-2 text-[10px] tracking-[0.13em] text-cyan-500/90">Current: {selected.label}</p>
          <ActivityPicker activities={activityCatalog} selectedActivityId={input.activityId} onSelect={applyActivity} className="mt-3" />
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="pointer-events-auto mt-2 border border-cyan-300/80 bg-black/90 px-3 py-2 text-xs tracking-[0.16em] text-cyan-100 shadow-[0_0_18px_rgba(0,229,255,0.18)] transition-colors hover:bg-cyan-500/10"
      >
        + CHANGE ACTIVITY
      </button>

      <AnimatePresence>
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
