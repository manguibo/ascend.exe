"use client";

import { useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/system/collapsible-panel";
import { PageHeader } from "@/components/system/page-header";
import { TacticalReveal } from "@/components/system/tactical-reveal";
import { defaultActivityDefinition, getActivityDefinition } from "@/lib/system/activity-catalog";
import { clearOnboardingProfile, markOnboardingComplete } from "@/lib/system/onboarding-state";
import { resetSessionInputToStandard } from "@/lib/system/profiles";
import { clearSessionHistory } from "@/lib/system/session-history";
import { unitSystemOptions, type UnitSystem } from "@/lib/system/session-state";
import { useSystemSnapshot } from "@/lib/system/use-system-snapshot";
import { useUiRailDensity } from "@/lib/system/use-ui-rail-density";

export default function SettingsPage() {
  const { input, setInput } = useSystemSnapshot();
  const { density, setDensity } = useUiRailDensity();
  const [message, setMessage] = useState<string>("");
  const currentActivity = useMemo(() => getActivityDefinition(input.activityId), [input.activityId]);

  const applyMessage = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => {
      setMessage((current) => (current === nextMessage ? "" : current));
    }, 2400);
  };

  const handleResetCurrentActivity = () => {
    setInput((current) => ({
      ...current,
      activityId: defaultActivityDefinition.id,
      primaryActivityCodename: defaultActivityDefinition.codename,
      bodyTrainingProfile: "AUTO",
      injuryRegionId: "NONE",
      injurySeverityLevel: 0,
    }));
    applyMessage("Current activity reset to default.");
  };

  const handleResetInputs = () => {
    setInput((current) => resetSessionInputToStandard(current));
    applyMessage("Session inputs reset to standard values.");
  };

  const handleClearHistory = () => {
    const ok = window.confirm("Clear all saved session history?");
    if (!ok) return;
    clearSessionHistory();
    applyMessage("Session history cleared.");
  };

  const handleRestartOnboarding = () => {
    const ok = window.confirm("Restart onboarding on next load?");
    if (!ok) return;
    clearOnboardingProfile();
    markOnboardingComplete(false);
    applyMessage("Onboarding will appear again after refresh.");
  };

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-cyan-300 sm:px-10 lg:px-16">
      <section className="mx-auto grid w-full max-w-6xl gap-6">
        <PageHeader
          node="ASCEND // Settings"
          title="Preferences and Controls"
          description="Adjust how data is displayed and manage your app state."
          statusLine="Changes apply immediately"
        />

        {message ? (
          <div className="border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 font-mono text-xs tracking-[0.08em] text-cyan-200">
            {message}
          </div>
        ) : null}

        <TacticalReveal delay={0.04}>
          <section className="grid gap-4 lg:grid-cols-2">
            <CollapsiblePanel panelId="settings-display" title="Display settings" className="font-mono">
              <div className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs tracking-[0.14em] text-cyan-500">Measurement system</span>
                  <select
                    value={input.unitSystem}
                    onChange={(event) => setInput((current) => ({ ...current, unitSystem: event.target.value as UnitSystem }))}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    {unitSystemOptions.map((option) => (
                      <option key={`settings-unit-${option}`} value={option} className="bg-black text-cyan-200">
                        {option === "METRIC" ? "Metric (cm / kg)" : "Imperial (in / lb)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs tracking-[0.14em] text-cyan-500">Layout density</span>
                  <select
                    value={density}
                    onChange={(event) => setDensity(event.target.value as "FULL" | "COMPACT")}
                    className="border border-cyan-500/40 bg-black px-3 py-2 text-sm text-cyan-200 outline-none transition-colors focus:border-cyan-300"
                  >
                    <option value="FULL" className="bg-black text-cyan-200">Full</option>
                    <option value="COMPACT" className="bg-black text-cyan-200">Compact</option>
                  </select>
                </label>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="settings-activity" title="Activity settings" className="font-mono">
              <div className="grid gap-3">
                <div className="border border-cyan-500/30 bg-black/50 px-3 py-2 text-xs text-cyan-300/90">
                  <p>Current activity: {currentActivity.label}</p>
                  <p className="mt-1">Codename: {input.primaryActivityCodename}</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetCurrentActivity}
                  className="w-full border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Reset current activity
                </button>
              </div>
            </CollapsiblePanel>
          </section>
        </TacticalReveal>

        <TacticalReveal delay={0.08}>
          <section className="grid gap-4 lg:grid-cols-2">
            <CollapsiblePanel panelId="settings-data" title="Data and resets" className="font-mono">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={handleResetInputs}
                  className="w-full border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Reset session inputs
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="w-full border border-[#7a2f35]/70 px-3 py-2 text-xs tracking-[0.14em] text-[#ff9aa4] transition-colors hover:bg-[#7a2f35]/20"
                >
                  Clear session history
                </button>
              </div>
            </CollapsiblePanel>

            <CollapsiblePanel panelId="settings-assistant" title="Assistant setup" className="font-mono">
              <div className="grid gap-3">
                <p className="text-xs text-cyan-300/85">
                  Re-run first-time setup if you want to reconfigure baseline goals and startup activity selection.
                </p>
                <button
                  type="button"
                  onClick={handleRestartOnboarding}
                  className="w-full border border-cyan-500/40 px-3 py-2 text-xs tracking-[0.14em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
                >
                  Restart onboarding
                </button>
              </div>
            </CollapsiblePanel>
          </section>
        </TacticalReveal>
      </section>
    </main>
  );
}

