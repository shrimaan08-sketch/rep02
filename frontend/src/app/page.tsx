"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  GitBranch,
  Layers,
  Bot,
  FileSignature,
  Bell,
  ScrollText,
  Boxes,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

const FEATURES = [
  { icon: FileSignature, title: "Signed approval chains", body: "Route ECOs through cross-functional sign-off with knowledge-based e-signatures and tamper-evident hashes." },
  { icon: GitBranch, title: "Full revision history", body: "Every released change creates an immutable part revision, so you can always see what changed, when, and why." },
  { icon: Boxes, title: "BOM impact analysis", body: "Trace a change through multi-level bills of materials to see exactly which assemblies are affected." },
  { icon: ScrollText, title: "Complete audit trail", body: "Every state change is recorded — built for ISO 9001, AS9100, and FDA 21 CFR Part 11 traceability." },
  { icon: Bell, title: "Supplier notifications", body: "Notify affected suppliers of a change and track their acknowledgement in one place." },
  { icon: Bot, title: "AI change summaries", body: "Plain-English summaries of every change request and order, generated automatically." },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/mo",
    tagline: "For a single team getting started.",
    features: ["Up to 5 users", "Parts, BOMs & revisions", "ECR / ECO workflows", "Community support"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$49",
    cadence: "/user/mo",
    tagline: "For scaling engineering orgs.",
    features: ["Unlimited users", "Approval chains & e-signatures", "BOM impact analysis", "AI change summaries", "Priority support"],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    tagline: "For regulated, audited environments.",
    features: ["SSO & SAML", "Advanced audit & retention", "Supplier portal", "Dedicated support & SLA", "On-prem / VPC option"],
    cta: "Contact sales",
    highlighted: false,
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-ink-900">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink-950">Revion</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-ink-600 md:flex">
            <a href="#features" className="hover:text-ink-950">Features</a>
            <a href="#pricing" className="hover:text-ink-950">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-md2 bg-azure-600 px-4 py-2 text-sm font-semibold text-white hover:bg-azure-700">
                Go to dashboard <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md2 px-3.5 py-2 text-sm font-medium text-ink-700 hover:text-ink-950">Sign in</Link>
                <Link href="/signup" className="inline-flex items-center gap-1.5 rounded-md2 bg-azure-600 px-4 py-2 text-sm font-semibold text-white hover:bg-azure-700">
                  Get started <ArrowRight size={15} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-blueprint opacity-[0.4] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-azure-500/10 blur-[130px]" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1 text-xs font-medium text-ink-600">
            <ShieldCheck size={13} className="text-azure-600" /> Engineering change management, done right
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-950 sm:text-6xl">
            The control center for{" "}
            <span className="bg-gradient-to-r from-azure-500 to-azure-700 bg-clip-text text-transparent">engineering change</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
            Parts, revisions, and bills of materials stay in lockstep with a signed, auditable approval record
            for every change that reaches the shop floor.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard" : "/signup"} className="group inline-flex w-full items-center justify-center gap-2 rounded-md2 bg-azure-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-azure-700 hover:shadow-glow-azure sm:w-auto">
              {user ? "Open dashboard" : "Start for free"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#pricing" className="inline-flex w-full items-center justify-center gap-2 rounded-md2 border border-hairline-strong bg-paper px-6 py-3 text-sm font-semibold text-ink-800 hover:border-ink-300 sm:w-auto">
              See pricing
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-400">No credit card required · Free plan for small teams</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-hairline bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950">Everything a change process needs</h2>
            <p className="mt-3 text-ink-600">From the first request to release — traceable, signed, and auditable at every step.</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl2 border border-hairline bg-canvas p-6 transition-shadow hover:shadow-panel">
                <div className="flex h-10 w-10 items-center justify-center rounded-md2 bg-azure-50 text-azure-600">
                  <Icon size={19} />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-ink-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950">Simple, transparent pricing</h2>
            <p className="mt-3 text-ink-600">Start free. Upgrade as your engineering org grows.</p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl2 border p-7 ${
                  plan.highlighted
                    ? "border-azure-500 bg-paper shadow-float ring-1 ring-azure-500/20"
                    : "border-hairline bg-paper"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-7 rounded-full bg-azure-600 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-lg font-semibold text-ink-950">{plan.name}</h3>
                <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold tracking-tight text-ink-950">{plan.price}</span>
                  {plan.cadence && <span className="text-sm text-ink-500">{plan.cadence}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <Check size={16} className="mt-0.5 shrink-0 text-azure-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "/signup" : "/signup"}
                  className={`mt-8 inline-flex items-center justify-center gap-1.5 rounded-md2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-azure-600 text-white hover:bg-azure-700"
                      : "border border-hairline-strong bg-canvas text-ink-800 hover:border-ink-300"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-950 px-8 py-14 text-center">
            <div className="absolute inset-0 bg-grid-blueprint opacity-20 [background-size:34px_34px]" />
            <div className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-azure-500/20 blur-[100px]" />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white">Ready to control your change process?</h2>
              <p className="mx-auto mt-3 max-w-xl text-ink-300">Create your workspace in under a minute — no credit card required.</p>
              <Link href={user ? "/dashboard" : "/signup"} className="mt-8 inline-flex items-center gap-2 rounded-md2 bg-white px-6 py-3 text-sm font-semibold text-ink-950 transition-transform hover:scale-[1.02]">
                {user ? "Open dashboard" : "Get started free"} <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline">
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
