"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Boxes, FileEdit, GitBranch, Truck, ScrollText,
  Search, LogOut, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { titleCase } from "@/lib/format";
import { Wordmark, LogoMark } from "@/components/Logo";

const NAV_SECTIONS: { heading: string; items: { href: string; label: string; icon: typeof Boxes }[] }[] = [
  {
    heading: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Change management",
    items: [
      { href: "/ecrs", label: "Change Requests", icon: FileEdit },
      { href: "/ecos", label: "Change Orders", icon: GitBranch },
    ],
  },
  {
    heading: "Product data",
    items: [
      { href: "/parts", label: "Parts & BOMs", icon: Boxes },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    heading: "Compliance",
    items: [{ href: "/audit-log", label: "Audit Log", icon: ScrollText }],
  },
];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <LogoMark className="h-9 w-9 animate-pulse" />
          <p className="text-sm text-ink-400">Loading Revion…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 z-30 flex h-screen flex-col bg-ink-depth text-ink-200 transition-all duration-200 ${
          collapsed ? "w-[68px]" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-4">
          {collapsed ? <LogoMark className="h-8 w-8" /> : <Wordmark />}
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-wider text-ink-500">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const active = pathname?.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={`group relative flex items-center gap-3 rounded-md2 px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-white/[0.07] text-white"
                          : "text-ink-300 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-azure-400" />
                      )}
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.9} className={active ? "text-azure-300" : ""} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-2.5 border-t border-white/[0.06] px-4 py-3 text-2xs font-medium text-ink-400 hover:text-white"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
        </button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-hairline bg-paper/85 px-6 backdrop-blur-md">
          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts, change requests, change orders…"
              aria-label="Global search"
              className="w-full rounded-full border border-hairline bg-canvas py-2 pl-9 pr-4 text-sm text-ink-800 outline-none transition-colors placeholder:text-ink-300 focus:border-azure-400 focus:bg-paper focus:ring-2 focus:ring-azure-500/15"
            />
          </form>

          <div className="flex items-center gap-3 pl-4">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-ink-900">{user.full_name}</p>
              <p className="text-2xs uppercase tracking-wide text-ink-400">{titleCase(user.role)}</p>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-azure-sheen text-xs font-semibold text-white shadow-sm ring-2 ring-white"
              title={user.full_name}
            >
              {initials(user.full_name)}
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-signal-red-bg hover:text-signal-red"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main key={pathname} className="page-enter flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
