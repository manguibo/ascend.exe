"use client";

import { ActivityPicker } from "@/components/system/activity-picker";
import { activityCatalog, getActivityDefinition } from "@/lib/system/activity-catalog";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { useUiPanelOpen } from "@/lib/system/use-ui-panel-open";

export function GlobalActivityOverlay() {
  const { input, setInput } = useSystemSnapshot();
  const { open, toggleOpen, setOpen } = useUiPanelOpen("global-activity-overlay", false);
  const selected = getActivityDefinition(input.activityId);

  const applyActivity = (activityId: string) => {
    const activity = getActivityDefinition(activityId);
    setInput((prev) => ({
      ...prev,
      activityId: activity.id,
      primaryActivityCodename: activity.codename,
      bodyTrainingProfile: activity.profile,
    }));
    setOpen(false);
  };

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
          <p className="mt-2 text-[10px] tracking-[0.13em] text-cyan-500/90">CURRENT: {selected.label}</p>
          <ActivityPicker activities={activityCatalog} selectedActivityId={input.activityId} onSelect={applyActivity} className="mt-3" />
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggleOpen}
        className="pointer-events-auto mt-2 border border-cyan-300/80 bg-black/90 px-3 py-2 text-xs tracking-[0.16em] text-cyan-100 shadow-[0_0_18px_rgba(0,229,255,0.18)] transition-colors hover:bg-cyan-500/10"
      >
        + ADD ACTIVITY
      </button>
    </div>
  );
}
