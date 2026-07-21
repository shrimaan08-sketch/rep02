"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  GitBranch,
  Boxes,
  ScrollText,
  FileSignature,
  Bell,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

const STATS = [
  { value: "ISO 9001", label: "AS9100 & FDA 21 CFR\nPart 11 ready" },
  { value: "100%", label: "Signed, auditable\napproval trail" },
  { value: "Multi-level", label: "BOM impact\nanalysis" },
  { value: "AI", label: "Change summaries\nout of the box" },
];

const FEATURES = [
  { icon: FileSignature, title: "Signed approval chains", body: "Route changes through cross-functional sign-off with knowledge-based e-signatures." },
  { icon: GitBranch, title: "Full revision history", body: "Every released change creates an immutable revision — always know what changed and why." },
  { icon: Boxes, title: "BOM impact analysis", body: "Trace a change through multi-level bills of materials to see every affected assembly." },
  { icon: ScrollText, title: "Complete audit trail", body: "Every action recorded — built for regulated, audited manufacturing environments." },
  { icon: Bell, title: "Supplier notifications", body: "Notify affected suppliers and track their acknowledgement in one place." },
  { icon: ShieldCheck, title: "Role-based control", body: "Engineering, quality, manufacturing and procurement each get the right access." },
];

const PINK = "#f5457e";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* ===== Hero on blue gradient ===== */}
      <div className="relative overflow-hidden bg-[linear-gradient(125deg,#1f6bff_0%,#1746c8_42%,#0f1f52_100%)]">
        {/* subtle blueprint grid + glow */}
        <div className="absolute inset-0 bg-grid-blueprint opacity-[0.15] [background-size:36px_36px]" />
        <div className="pointer-events-none absolute -right-40 top-0 h-[36rem] w-[36rem] rounded-full bg-azure-300/20 blur-[130px]" />

        {/* Nav */}
        <header className="relative z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-xl font-semibold tracking-tight text-white">Revion</span>
            </div>
            <nav className="hidden items-center gap-9 text-sm font-medium text-white/80 md:flex">
              <a href="#features" className="hover:text-white">What we do</a>
              <a href="#why" className="hover:text-white">Why Revion</a>
            </nav>
            <div className="flex items-center gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
                  style={{ backgroundColor: PINK }}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="hidden text-sm font-medium text-white/85 hover:text-white sm:block">
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
                    style={{ backgroundColor: PINK }}
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero body */}
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-6 pb-8 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
          {/* left copy */}
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Take Control of Every
              <br />
              <span className="text-[#7ef0c6]">Engineering Change</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
              The modern control center for parts, BOMs, and signed change orders — traced from the
              first request all the way to release on the shop floor.
            </p>
            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-xl transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: PINK }}
              >
                {user ? "Open dashboard" : "Get started free"}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              {!user && (
                <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white">
                  or sign in →
                </Link>
              )}
            </div>
          </div>

          {/* right: floating product mockup */}
          <div className="relative hidden lg:block">
            <HeroMock />
          </div>
        </div>

        {/* Trust / stats row */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-14 pt-8">
          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.value}>
                <p className="font-display text-2xl font-bold text-white">{s.value}</p>
                <p className="mt-1 whitespace-pre-line text-xs leading-snug text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Features ===== */}
      <section id="features" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-azure-600">What we do</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950">
              Everything a change process needs
            </h2>
            <p className="mt-3 text-ink-600">From the first request to release — traceable, signed, and auditable at every step.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl2 border border-hairline bg-paper p-6 transition-shadow hover:shadow-panel">
                <div className="flex h-11 w-11 items-center justify-center rounded-md2 bg-azure-50 text-azure-600">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-ink-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Why band ===== */}
      <section id="why" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(125deg,#1f6bff_0%,#1746c8_45%,#0f1f52_100%)] px-8 py-14 text-center sm:px-14">
            <div className="absolute inset-0 bg-grid-blueprint opacity-20 [background-size:34px_34px]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white">Ready to control your change process?</h2>
              <p className="mx-auto mt-3 max-w-xl text-white/75">Create your account with an email and password — you&apos;ll be in the dashboard in seconds.</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
                <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#7ef0c6]" /> No credit card</span>
                <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#7ef0c6]" /> Real, persistent data</span>
                <span className="inline-flex items-center gap-1.5"><Check size={15} className="text-[#7ef0c6]" /> Set up in a minute</span>
              </div>
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-xl transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: PINK }}
              >
                {user ? "Open dashboard" : "Get started free"} <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ink-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark className="h-6 w-6" />
            <span className="font-display font-semibold text-ink-800">Revion</span>
          </div>
          <p>© {new Date().getFullYear()} Revion. Engineering change, under control.</p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-ink-800">Sign in</Link>
            <Link href="/signup" className="hover:text-ink-800">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* A stylized product mockup for the hero — floating dashboard + chart cards. */
function HeroMock() {
  return (
    <div className="relative mx-auto h-[22rem] w-full max-w-md">
      {/* main dashboard card */}
      <div className="absolute right-2 top-4 w-72 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#7ef0c6]" />
            <span className="text-xs font-semibold text-white">ECO-2026-000142</span>
          </div>
          <span className="rounded-full bg-[#7ef0c6]/20 px-2 py-0.5 text-2xs font-semibold text-[#7ef0c6]">In review</span>
        </div>
        <div className="mt-4 space-y-2">
          {[
            ["Engineering", "Approved"],
            ["Quality", "Approved"],
            ["Manufacturing", "Active"],
            ["Procurement", "Pending"],
          ].map(([role, state]) => (
            <div key={role} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-xs text-white/80">{role}</span>
              <span className="text-2xs text-white/55">{state}</span>
            </div>
          ))}
        </div>
      </div>
      {/* small chart card */}
      <div className="absolute -left-1 bottom-2 w-52 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
        <p className="text-2xs font-medium text-white/70">Changes this quarter</p>
        <p className="mt-0.5 font-display text-2xl font-bold text-white">+38%</p>
        <div className="mt-3 flex items-end gap-1.5">
          {[35, 55, 40, 70, 60, 85, 75].map((h, i) => (
            <span key={i} className="w-3 rounded-sm bg-[#7ef0c6]/70" style={{ height: `${h}%`, minHeight: 6 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
