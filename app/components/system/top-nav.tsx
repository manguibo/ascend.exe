"use client";

import { useEffect, useRef, useState } from "react";
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
  { href: "/groups", label: "Squads" },
  { href: "/directives", label: "Guidance" },
];

const menuItems: readonly NavItem[] = [
  { href: "/profile", label: "Profile" },
  { href: "/friends", label: "Friends" },
  { href: "/account", label: "Account" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  const pathname = usePathname();
  const { density, toggleDensity } = useUiRailDensity();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (!menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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
        <div className="relative flex items-center gap-2" ref={menuRef}>
          <button
            type="button"
            onClick={toggleDensity}
            className="border border-cyan-500/40 px-3 py-2 font-mono text-xs tracking-[0.16em] text-cyan-300 transition-colors hover:bg-cyan-500/10"
          >
            View {density}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-label="Open menu"
            className="flex h-[34px] w-[44px] items-center justify-center border border-cyan-500/40 text-cyan-300 transition-colors hover:bg-cyan-500/10"
          >
            <span className="grid gap-[3px]">
              <span className="block h-[2px] w-4 bg-cyan-300" />
              <span className="block h-[2px] w-4 bg-cyan-300" />
              <span className="block h-[2px] w-4 bg-cyan-300" />
            </span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-40 min-w-[150px] border border-cyan-500/45 bg-black/95 p-2 font-mono shadow-[0_0_24px_rgba(0,229,255,0.12)]">
              <p className="mb-2 text-[10px] tracking-[0.16em] text-cyan-500/90">MENU</p>
              <div className="grid gap-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={`menu-${item.href}`}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`border px-2 py-2 text-xs tracking-[0.14em] transition-colors ${
                        isActive ? "border-cyan-300 text-cyan-100" : "border-cyan-500/35 text-cyan-300 hover:bg-cyan-500/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
