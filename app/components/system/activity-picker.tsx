"use client";

import { useMemo, useState } from "react";
import { getActivitySearchTerms, type ActivityDefinition } from "@/lib/system/activity-catalog";

type ActivityPickerProps = {
  activities: readonly ActivityDefinition[];
  selectedActivityId: string;
  onSelect: (activityId: string) => void;
  className?: string;
};

function clampIndex(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(max - 1, value));
}

export function ActivityPicker({ activities, selectedActivityId, onSelect, className }: ActivityPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sliderIndex, setSliderIndex] = useState(0);

  const normalizedQuery = searchQuery.trim().toUpperCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return activities;
    return activities.filter((activity) =>
      getActivitySearchTerms(activity).some((term) => term.toUpperCase().includes(normalizedQuery)),
    );
  }, [activities, normalizedQuery]);

  const suggestions = useMemo(() => {
    if (!normalizedQuery || filtered.length > 0) return [];
    const ranked = activities
      .map((activity) => {
        const terms = getActivitySearchTerms(activity).map((term) => term.toUpperCase());
        const startsWith = terms.some((term) => term.startsWith(normalizedQuery));
        const partial = terms.some((term) => term.includes(normalizedQuery.slice(0, Math.max(2, Math.floor(normalizedQuery.length / 2)))));
        const score = startsWith ? 3 : partial ? 1 : 0;
        return { activity, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.activity.label.localeCompare(b.activity.label))
      .slice(0, 6)
      .map((entry) => entry.activity);
    return ranked;
  }, [activities, filtered.length, normalizedQuery]);

  const selectedIndex = filtered.findIndex((activity) => activity.id === selectedActivityId);
  const resolvedIndex = clampIndex(selectedIndex >= 0 ? selectedIndex : sliderIndex, filtered.length);
  const active = filtered[resolvedIndex] ?? null;

  const canStep = filtered.length > 1;

  return (
    <section className={className}>
      <label className="grid gap-1">
        <span className="text-[10px] tracking-[0.14em] text-cyan-500/90">SEARCH ACTIVITY</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value.toUpperCase())}
          placeholder="Try: jogging, football, climbing"
          className="border border-cyan-500/40 bg-black px-3 py-2 text-xs tracking-[0.08em] text-cyan-200 outline-none transition-colors placeholder:text-cyan-700/70 focus:border-cyan-300"
        />
      </label>

      {filtered.length > 0 ? (
        <>
          <div className="mt-3 grid gap-2">
            <div className="flex items-center justify-between text-[10px] tracking-[0.13em] text-cyan-500/90">
              <span>RESULTS {filtered.length}</span>
              <span>
                ITEM {resolvedIndex + 1}/{filtered.length}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, filtered.length - 1)}
              step={1}
              value={resolvedIndex}
              onChange={(event) => setSliderIndex(Number(event.target.value))}
              className="w-full accent-cyan-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canStep}
                onClick={() => setSliderIndex((index) => clampIndex(index - 1, filtered.length))}
                className="border border-cyan-500/35 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors enabled:hover:bg-cyan-500/10 disabled:opacity-40"
              >
                PREVIOUS
              </button>
              <button
                type="button"
                disabled={!canStep}
                onClick={() => setSliderIndex((index) => clampIndex(index + 1, filtered.length))}
                className="border border-cyan-500/35 px-2 py-1 text-[10px] tracking-[0.14em] text-cyan-300 transition-colors enabled:hover:bg-cyan-500/10 disabled:opacity-40"
              >
                NEXT
              </button>
            </div>
          </div>

          {active ? (
            <div className="mt-3 border border-cyan-500/35 bg-cyan-500/[0.04] p-3">
              <p className="text-xs tracking-[0.14em] text-cyan-100">{active.label}</p>
              <p className="mt-1 text-[10px] tracking-[0.12em] text-cyan-500/90">Type: {active.profile}</p>
              <button
                type="button"
                onClick={() => onSelect(active.id)}
                className="mt-3 w-full border border-cyan-300/70 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.14em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
              >
                USE THIS ACTIVITY
              </button>
            </div>
          ) : null}

          <div className="mt-3 grid max-h-40 gap-2 overflow-auto border border-cyan-500/25 p-2">
            {filtered.slice(0, 16).map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => onSelect(activity.id)}
                className={`border px-2 py-1 text-left text-[10px] tracking-[0.12em] transition-colors ${
                  activity.id === selectedActivityId
                    ? "border-cyan-300/70 bg-cyan-500/12 text-cyan-100"
                    : "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                }`}
              >
                {activity.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3 border border-[#7a2f35]/65 bg-[#2a0f12]/60 p-3 text-[10px] tracking-[0.14em] text-[#ff9aa4]">
          <p>No matching activity found.</p>
          {suggestions.length > 0 ? (
            <div className="mt-2">
              <p className="text-cyan-300/90">Try one of these:</p>
              <div className="mt-2 grid gap-1">
                {suggestions.map((activity) => (
                  <button
                    key={`suggestion-${activity.id}`}
                    type="button"
                    onClick={() => onSelect(activity.id)}
                    className="border border-cyan-500/35 px-2 py-1 text-left text-[10px] tracking-[0.12em] text-cyan-200 transition-colors hover:bg-cyan-500/10"
                  >
                    {activity.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
