"use client";

import type { ReactNode } from "react";
import { TacticalReveal } from "./tactical-reveal";

type PageHeaderProps = {
  node: string;
  title: string;
  description: string;
  statusLine?: string;
  children?: ReactNode;
};

export function PageHeader({ node, title, description, statusLine, children }: PageHeaderProps) {
  return (
    <TacticalReveal>
      <header className="ui-panel relative overflow-hidden p-5 font-mono sm:p-6">
        <div className="ui-grid-overlay pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative z-10">
        <p className="ui-panel-title">{node}</p>
        <h1 className="mt-3 text-2xl tracking-[0.08em] text-cyan-200">{title}</h1>
        <p className="ui-muted mt-3 max-w-3xl text-sm">{description}</p>
        {statusLine ? <p className="mt-2 text-xs tracking-[0.08em] text-cyan-500/90">{statusLine}</p> : null}
        <p className="mt-2 text-[10px] tracking-[0.12em] text-cyan-500/75">This view updates as soon as you log a new session.</p>
        {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </header>
    </TacticalReveal>
  );
}
