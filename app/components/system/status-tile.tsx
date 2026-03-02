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
    <article className={`ui-panel p-4 font-mono sm:p-5 ${className ?? ""}`}>
      <h2 className="ui-panel-title">{label}</h2>
      {value ? <div className="mt-2 text-lg text-cyan-200 sm:text-xl">{value}</div> : null}
      {detail ? <div className="ui-muted mt-1 text-xs">{detail}</div> : null}
      {children ? <div className="mt-2">{children}</div> : null}
    </article>
  );
}
