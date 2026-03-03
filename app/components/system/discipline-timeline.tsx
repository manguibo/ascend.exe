import type { DisciplineState } from "@/lib/system/types";

const stateToneClass: Record<DisciplineState, string> = {
  OPTIMAL: "border-cyan-500/60 bg-cyan-950/30 text-cyan-200",
  STABLE: "border-cyan-500/50 bg-black text-cyan-300",
  DECLINING: "border-[#4b2a78] bg-[#11091b] text-[#b08cff]",
  COMPROMISED: "border-[#7a2f35] bg-[#1a080a] text-[#ff8d97]",
};

type DisciplineTimelineProps = {
  states: readonly DisciplineState[];
  title?: string;
};

function getFriendlyStateLabel(state: DisciplineState): string {
  if (state === "OPTIMAL") return "On track";
  if (state === "STABLE") return "Steady";
  if (state === "DECLINING") return "Slipping";
  return "Needs reset";
}

export function DisciplineTimeline({ states, title = "Past 7 Days" }: DisciplineTimelineProps) {
  return (
    <section className="border border-cyan-500/50 bg-black p-5 font-mono">
      <h2 className="text-xs tracking-[0.22em] text-cyan-500">{title}</h2>
      <p className="mt-2 text-xs text-cyan-300/80">Your most recent week. Day {states.length} is today.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {states.map((state, index) => (
          <div key={`timeline-day-${index + 1}`} className={`border px-3 py-2 ${stateToneClass[state]}`}>
            <p className="text-[11px] tracking-[0.18em]">DAY {index + 1}</p>
            <p className="mt-1 text-sm tracking-[0.12em]">{getFriendlyStateLabel(state)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
