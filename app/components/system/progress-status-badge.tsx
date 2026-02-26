import type { ProgressEventState } from "@/lib/ranks/progression";

type ProgressStatusBadgeProps = {
  status: ProgressEventState;
  prefix?: string;
};

export function ProgressStatusBadge({ status, prefix = "" }: ProgressStatusBadgeProps) {
  const statusClass =
    status === "DEMOTION RISK"
      ? "border-[#7a2f35] bg-[#1a080a] text-[#ff8d97]"
      : status === "PROMOTION READY"
        ? "border-cyan-500/60 bg-cyan-950/30 text-cyan-200"
        : status === "PROMOTION PROXIMITY"
          ? "border-cyan-500/50 bg-black text-cyan-300"
          : "border-cyan-500/35 bg-black text-cyan-400";

  return <p className={`border px-3 py-2 text-xs tracking-[0.16em] ${statusClass}`}>{`${prefix}${status}`}</p>;
}
