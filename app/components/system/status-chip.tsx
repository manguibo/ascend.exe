type StatusChipTone = "default" | "purple" | "red";

type StatusChipProps = {
  label: string;
  value: string;
  tone?: StatusChipTone;
};

const toneClass: Record<StatusChipTone, string> = {
  default: "border-cyan-500/40 bg-black/80 text-cyan-200",
  purple: "border-[#4b2a78] bg-[#11091b]/80 text-[#b08cff]",
  red: "border-[#7a2f35] bg-[#1a080a]/80 text-[#ff8d97]",
};

export function StatusChip({ label, value, tone = "default" }: StatusChipProps) {
  return (
    <div className={`border px-3 py-2 font-mono ${toneClass[tone]}`}>
      <p className="text-[10px] tracking-[0.16em] text-cyan-500/90">{label}</p>
      <p className="mt-1 text-xs tracking-[0.08em]">{value}</p>
    </div>
  );
}
