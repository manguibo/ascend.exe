"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUiRailDensity } from "@/lib/system/use-ui-rail-density";

type NavItem = {
  href: string;
  label: string;
};

const navItems: readonly NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Overview" },
  { href: "/log", label: "Activity History" },
  { href: "/groups", label: "Groups" },
  { href: "/directives", label: "Guidance" },
  { href: "/account", label: "Account" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();
  const { density, toggleDensity } = useUiRailDensity();

  return (
    <nav className="sticky top-0 z-30 border-b border-cyan-500/35 bg-black/90 px-6 py-3 backdrop-blur-[2px] sm:px-10 lg:px-16">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`border px-3 py-2 text-xs tracking-[0.16em] transition-colors ${
                isActive ? "border-cyan-300 text-cyan-100" : "border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        </div>
        <button
          type="button"
          onClick={toggleDensity}
          className="border border-cyan-500/40 px-3 py-2 font-mono text-xs tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
        >
          View {density}
        </button>
      </div>
    </nav>
  );
}
