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
      <header className="border border-cyan-500/60 bg-black/95 p-5 font-mono">
        <p className="text-xs tracking-[0.24em] text-cyan-500">{node}</p>
        <h1 className="mt-3 text-2xl tracking-[0.08em] text-cyan-200">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-cyan-300/85">{description}</p>
        {statusLine ? <p className="mt-2 text-xs tracking-[0.08em] text-cyan-500/90">{statusLine}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </header>
    </TacticalReveal>
  );
}
