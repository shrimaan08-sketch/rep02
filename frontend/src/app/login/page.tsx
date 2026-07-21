"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, GitBranch, Layers, Bot } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

const LIFECYCLE = [
  { code: "ECR", label: "Request raised", detail: "An engineer flags a needed change" },
  { code: "REV", label: "Cross-functional review", detail: "Quality, manufacturing & procurement weigh in" },
  { code: "ECO", label: "Change authorized", detail: "A signed approval chain releases the change" },
  { code: "REL", label: "Released to production", detail: "Suppliers notified, revisions made effective" },
];

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Signed, auditable approvals" },
  { icon: GitBranch, label: "Full revision history" },
  { icon: Layers, label: "Multi-level BOM impact analysis" },
  { icon: Bot, label: "AI-summarized change orders" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@revion.app");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Left: cinematic brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between">
        {/* layered background */}
        <div className="absolute inset-0 bg-grid-blueprint [background-size:34px_34px]" />
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-azure-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-azure-400/10 blur-[130px]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />

        <div className="relative z-10 px-14 pt-14">
          <div className="flex items-center gap-3">
            <LogoMark className="h-9 w-9" />
            <span className="font-display text-lg font-semibold tracking-tight text-white">Revion</span>
          </div>

          <h1 className="mt-20 max-w-lg font-display text-[2.6rem] font-semibold leading-[1.1] tracking-tight text-white">
            The control center for{" "}
            <span className="bg-gradient-to-r from-azure-300 to-azure-500 bg-clip-text text-transparent">
              engineering change
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-300">
            Parts, revisions, and bills of materials stay in lockstep with a signed, auditable
            approval record for every change that reaches the shop floor.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-ink-200 backdrop-blur-sm"
              >
                <Icon size={13} className="text-azure-300" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 border-t border-white/[0.07] px-14 py-9">
          <p className="mb-5 font-mono text-2xs font-medium uppercase tracking-[0.2em] text-azure-300/70">
            The change lifecycle
          </p>
          <div className="grid grid-cols-4 gap-3">
            {LIFECYCLE.map((stage, i) => (
              <div key={stage.code} className="relative">
                {i < LIFECYCLE.length - 1 && (
                  <span className="absolute right-[-8px] top-3.5 hidden h-px w-4 bg-gradient-to-r from-azure-400/40 to-transparent xl:block" />
                )}
                <span className="inline-flex items-center rounded-md2 border border-azure-300/25 bg-azure-500/[0.08] px-2 py-1 font-mono text-2xs font-semibold text-azure-200">
                  {stage.code}
                </span>
                <p className="mt-2 text-xs font-medium text-white">{stage.label}</p>
                <p className="mt-0.5 text-2xs leading-snug text-ink-400">{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: sign-in */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink-950">Revion</span>
          </div>

          <div className="overflow-hidden rounded-xl2 border border-hairline bg-paper shadow-float">
            <div className="border-b border-hairline px-7 pb-5 pt-6">
              <p className="font-mono text-2xs font-medium uppercase tracking-[0.18em] text-azure-600">Welcome back</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink-950">
                Sign in to your workspace
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-7 py-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-700">Work email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md2 border border-hairline-strong bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-azure-500 focus:ring-2 focus:ring-azure-500/20"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md2 border border-hairline-strong bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-azure-500 focus:ring-2 focus:ring-azure-500/20"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-md2 border border-signal-red-ring bg-signal-red-bg px-3 py-2 text-xs text-signal-red">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-md2 bg-azure-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-azure-700 hover:shadow-glow-azure active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <div className="border-t border-hairline px-7 py-4">
              <p className="text-center text-sm text-ink-500">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-medium text-azure-600 hover:text-azure-700">
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-2xs leading-relaxed text-ink-400">
            Seeded admin account · <span className="font-mono text-ink-500">admin@revion.app</span> ·{" "}
            <span className="font-mono text-ink-500">ChangeMe123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
