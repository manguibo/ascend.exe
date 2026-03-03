"use client";

import { useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { MicroMetricGrid } from "@/components/system/micro-metric-grid";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { getActivityDefinition } from "@/lib/system/activity-catalog";
import { buildRegionTrends, buildSessionHistorySummary, appendSessionHistoryEntry, clearSessionHistory } from "@/lib/system/session-history";
import { useSessionHistory } from "@/lib/system/use-session-history";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";

const activityTypeFilterOptions = ["ALL", "STRENGTH", "CONDITIONING", "HYBRID"] as const;
const dateRangeOptions = ["7D", "30D", "90D", "ALL"] as const;
const regionFocusOptions = ["ALL", "CHEST", "BACK", "SHOULDERS", "ARMS", "CORE", "GLUTES", "QUADS", "HAMSTRINGS"] as const;

type ActivityTypeFilter = (typeof activityTypeFilterOptions)[number];
type DateRangeFilter = (typeof dateRangeOptions)[number];
type RegionFocusFilter = (typeof regionFocusOptions)[number];

function formatTimestamp(timestampIso: string): string {
  const parsed = Date.parse(timestampIso);
  if (!Number.isFinite(parsed)) {
    return "UNKNOWN";
  }
  return new Date(parsed).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveActivityLabel(entry: { activityLabel?: string; activityId?: string; activityCodename: string }): string {
  if (entry.activityLabel && entry.activityLabel.trim().length > 0) {
    return entry.activityLabel;
  }
  if (entry.activityId && entry.activityId.trim().length > 0) {
    return getActivityDefinition(entry.activityId).label;
  }
  return entry.activityCodename;
}

function resolveEntryActivityType(entry: {
  activityType?: string;
  segments?: readonly { category: "STRENGTH" | "CONDITIONING" }[];
  activityId?: string;
}): Exclude<ActivityTypeFilter, "ALL"> {
  if (entry.activityType === "STRENGTH" || entry.activityType === "CONDITIONING" || entry.activityType === "HYBRID") {
    return entry.activityType;
  }
  const categories = new Set((entry.segments ?? []).map((segment) => segment.category));
  if (categories.has("STRENGTH") && categories.has("CONDITIONING")) return "HYBRID";
  if (categories.has("CONDITIONING")) return "CONDITIONING";
  if (categories.has("STRENGTH")) return "STRENGTH";
  if (entry.activityId && getActivityDefinition(entry.activityId).profile === "CONDITIONING") return "CONDITIONING";
  return "STRENGTH";
}

function getDateRangeCutoff(range: DateRangeFilter): number | null {
  if (range === "ALL") return null;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "7D") return now - dayMs * 7;
  if (range === "30D") return now - dayMs * 30;
  return now - dayMs * 90;
}

export default function LogPage() {
  const { input, setInput } = useSystemSnapshot();
  const { entries } = useSessionHistory();
  const [statusLine, setStatusLine] = useState<string>("");
  const [activityTypeFilter, setActivityTypeFilter] = useState<ActivityTypeFilter>("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("30D");
  const [regionFocusFilter, setRegionFocusFilter] = useState<RegionFocusFilter>("ALL");

  const filteredEntries = useMemo(() => {
    const cutoff = getDateRangeCutoff(dateRangeFilter);
    return entries.filter((entry) => {
      const timestamp = Date.parse(entry.timestampIso);
      if (cutoff !== null && Number.isFinite(timestamp) && timestamp < cutoff) {
        return false;
      }
      if (activityTypeFilter !== "ALL" && resolveEntryActivityType(entry) !== activityTypeFilter) {
        return false;
      }
      if (regionFocusFilter !== "ALL") {
        const regionStress = entry.regionStress?.[regionFocusFilter] ?? 0;
        if (regionStress <= 0) {
          return false;
        }
      }
      return true;
    });
  }, [activityTypeFilter, dateRangeFilter, entries, regionFocusFilter]);

  const summary = useMemo(() => buildSessionHistorySummary(filteredEntries), [filteredEntries]);
  const regionTrends = useMemo(() => buildRegionTrends(filteredEntries).slice(0, 6), [filteredEntries]);
  const latestFirstEntries = useMemo(() => [...filteredEntries].reverse(), [filteredEntries]);
  const topActivities = useMemo(() => {
    const bucket = new Map<string, { count: number; xp: number }>();
    filteredEntries.forEach((entry) => {
      const label = resolveActivityLabel(entry);
      const current = bucket.get(label) ?? { count: 0, xp: 0 };
      bucket.set(label, {
        count: current.count + 1,
        xp: current.xp + entry.sessionXp,
      });
    });
    return [...bucket.entries()]
      .map(([label, values]) => ({ label, ...values }))
      .sort((a, b) => b.count - a.count || b.xp - a.xp)
      .slice(0, 5);
  }, [filteredEntries]);
  const regionDrilldown = useMemo(() => {
    if (regionFocusFilter === "ALL") return [];
    return latestFirstEntries
      .map((entry) => ({
        id: entry.id,
        timestampIso: entry.timestampIso,
        activityLabel: resolveActivityLabel(entry),
        stressPct: Math.round((entry.regionStress?.[regionFocusFilter] ?? 0) * 100),
        readiness: entry.regionReadiness?.[regionFocusFilter] ?? 0,
      }))
      .filter((entry) => entry.stressPct > 0)
      .slice(0, 8);
  }, [latestFirstEntries, regionFocusFilter]);

  const handleLogCurrentEntry = () => {
    const entry = appendSessionHistoryEntry(input);
    if (!entry) {
      setStatusLine("ENTRY REJECTED");
      return;
    }
    setInput((prev) => ({
      ...prev,
      totalXpBeforeSession: entry.totalXp,
      inactiveDays: 0,
    }));
    setStatusLine("ENTRY STORED");
  };

  const handleClearHistory = () => {
    clearSessionHistory();
    setStatusLine("HISTORY CLEARED");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ACTIVITY HISTORY"
          title="Activity History"
          description="Review stored activity entries and cumulative stress records."
          statusLine="Entry store is persistent"
        />

        {statusLine ? <p className="border border-cyan-500/35 px-3 py-2 font-mono text-xs tracking-[0.14em] text-cyan-300/90">{statusLine}</p> : null}

        <TacticalReveal delay={0.04}>
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="grid gap-4">
              <CollapsiblePanel panelId="history-entries" title={`Stored entries (${entries.length})`} className="font-mono">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleLogCurrentEntry}
                    className="border border-cyan-300/75 bg-cyan-500/10 px-3 py-2 text-xs tracking-[0.16em] text-cyan-100 transition-colors hover:bg-cyan-500/20"
                  >
                    LOG CURRENT ENTRY
                  </button>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="border border-[#7a2f35]/70 px-3 py-2 text-xs tracking-[0.16em] text-[#ff9aa4] transition-colors hover:bg-[#7a2f35]/20"
                  >
                    CLEAR HISTORY
                  </button>
                </div>
                <div className="mb-3 grid gap-2 sm:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-[10px] tracking-[0.14em] text-cyan-500">Type</span>
                    <select
                      value={activityTypeFilter}
                      onChange={(event) => setActivityTypeFilter(event.target.value as ActivityTypeFilter)}
                      className="border border-cyan-500/40 bg-black px-2 py-1.5 text-[11px] text-cyan-200 outline-none focus:border-cyan-300"
                    >
                      {activityTypeFilterOptions.map((option) => (
                        <option key={`type-filter-${option}`} value={option} className="bg-black text-cyan-200">
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] tracking-[0.14em] text-cyan-500">Date range</span>
                    <select
                      value={dateRangeFilter}
                      onChange={(event) => setDateRangeFilter(event.target.value as DateRangeFilter)}
                      className="border border-cyan-500/40 bg-black px-2 py-1.5 text-[11px] text-cyan-200 outline-none focus:border-cyan-300"
                    >
                      {dateRangeOptions.map((option) => (
                        <option key={`date-filter-${option}`} value={option} className="bg-black text-cyan-200">
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] tracking-[0.14em] text-cyan-500">Region focus</span>
                    <select
                      value={regionFocusFilter}
                      onChange={(event) => setRegionFocusFilter(event.target.value as RegionFocusFilter)}
                      className="border border-cyan-500/40 bg-black px-2 py-1.5 text-[11px] text-cyan-200 outline-none focus:border-cyan-300"
                    >
                      {regionFocusOptions.map((option) => (
                        <option key={`region-filter-${option}`} value={option} className="bg-black text-cyan-200">
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {latestFirstEntries.length === 0 ? (
                  <p className="border border-cyan-500/25 px-3 py-3 text-xs text-cyan-300/85">
                    No entries matched the current filters.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {latestFirstEntries.map((entry) => {
                      const activityLabel = resolveActivityLabel(entry);
                      return (
                        <article key={entry.id} className="border border-cyan-500/30 px-3 py-3">
                          <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">{formatTimestamp(entry.timestampIso)}</p>
                          <p className="mt-1 text-xs tracking-[0.14em] text-cyan-100">{activityLabel}</p>
                          <p className="mt-1 text-[11px] text-cyan-300/90">
                            Session XP {entry.sessionXp} | Total XP {entry.totalXp} | Discipline {entry.discipline} | Type {resolveEntryActivityType(entry)}
                          </p>
                          <p className="mt-1 text-[11px] text-cyan-300/80">
                            Duration {entry.durationMinutes ?? "-"}m | Intensity {entry.intensityLevel ?? "-"}/10 | Profile {entry.profile}
                          </p>
                          {entry.segments && entry.segments.length > 1 ? (
                            <p className="mt-1 text-[11px] text-cyan-300/75">
                              Composition: {entry.segments.map((segment) => `${segment.activityLabel} ${segment.sharePct}%`).join(" | ")}
                            </p>
                          ) : null}
                          {regionFocusFilter !== "ALL" ? (
                            <p className="mt-1 text-[11px] text-cyan-300/75">
                              {regionFocusFilter}: load {Math.round((entry.regionStress?.[regionFocusFilter] ?? 0) * 100)}% | readiness{" "}
                              {entry.regionReadiness?.[regionFocusFilter] ?? 0}%
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
              </CollapsiblePanel>
            </section>

            <aside className="grid gap-4 font-mono">
              <CollapsiblePanel panelId="history-summary" title="History summary">
                <MicroMetricGrid
                  columns={2}
                  items={[
                    { label: "ENTRY COUNT", value: String(summary.entryCount) },
                    { label: "AVG SESSION XP", value: String(summary.averageSessionXp) },
                    { label: "AVG DEVELOPMENT", value: `${summary.averageDevelopmentPct}%` },
                    { label: "LATEST TOTAL XP", value: String(summary.latestTotalXp) },
                    { label: "XP DELTA", value: `${summary.xpDeltaFromPrevious >= 0 ? "+" : ""}${summary.xpDeltaFromPrevious}` },
                    { label: "DISCIPLINE TREND", value: summary.disciplineTrend, tone: summary.disciplineTrend === "DECLINING" ? "red" : "subtle" },
                  ]}
                />
              </CollapsiblePanel>

              <CollapsiblePanel panelId="history-regions" title="Latest region trends" defaultOpen={false}>
                {regionTrends.length === 0 ? (
                  <p className="text-xs text-cyan-300/85">Insufficient entries for trend output.</p>
                ) : (
                  <div className="grid gap-1">
                    {regionTrends.map((trend) => (
                      <p key={`trend-${trend.regionId}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                        {trend.regionId} | readiness {trend.latestReadinessPct}% | delta {trend.deltaPct >= 0 ? "+" : ""}
                        {trend.deltaPct}% | {trend.direction}
                      </p>
                    ))}
                  </div>
                )}
              </CollapsiblePanel>
              <CollapsiblePanel panelId="history-drilldown" title="Activity drilldown" defaultOpen={false}>
                {topActivities.length === 0 ? (
                  <p className="text-xs text-cyan-300/85">No activities for current filter scope.</p>
                ) : (
                  <div className="grid gap-1">
                    {topActivities.map((entry) => (
                      <p key={`top-activity-${entry.label}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                        {entry.label} | entries {entry.count} | total session xp {entry.xp}
                      </p>
                    ))}
                  </div>
                )}
              </CollapsiblePanel>
              <CollapsiblePanel panelId="history-region-drilldown" title="Region drilldown" defaultOpen={false}>
                {regionFocusFilter === "ALL" ? (
                  <p className="text-xs text-cyan-300/85">Select a region focus filter to inspect per-entry stress contribution.</p>
                ) : regionDrilldown.length === 0 ? (
                  <p className="text-xs text-cyan-300/85">No matching stress entries for {regionFocusFilter}.</p>
                ) : (
                  <div className="grid gap-1">
                    {regionDrilldown.map((entry) => (
                      <p key={`region-drilldown-${entry.id}`} className="border border-cyan-500/25 px-2 py-1 text-[11px] text-cyan-300/90">
                        {formatTimestamp(entry.timestampIso)} | {entry.activityLabel} | stress {entry.stressPct}% | readiness {entry.readiness}%
                      </p>
                    ))}
                  </div>
                )}
              </CollapsiblePanel>
            </aside>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}
