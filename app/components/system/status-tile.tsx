"use client";

import type { ReactNode } from "react";

type StatusTileProps = {
  label: string;
  value?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function StatusTile({ label, value, detail, children, className }: StatusTileProps) {
  return (
    <article className={`border border-cyan-500/40 bg-black/85 p-4 font-mono ${className ?? ""}`}>
      <h2 className="text-xs tracking-[0.2em] text-cyan-500">{label}</h2>
      {value ? <div className="mt-2 text-lg text-cyan-200">{value}</div> : null}
      {detail ? <div className="mt-1 text-xs text-cyan-300/85">{detail}</div> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </article>
  );
}
