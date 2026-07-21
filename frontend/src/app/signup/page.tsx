"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, GitBranch, Layers, Bot } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LogoMark } from "@/components/Logo";

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Signed, auditable approvals" },
  { icon: GitBranch, label: "Full revision history" },
  { icon: Layers, label: "Multi-level BOM impact analysis" },
  { icon: Bot, label: "AI-summarized change orders" },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(email, password);
    } catch (err: any) {
      setError(err.message || "Sign-up failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Left: cinematic brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between">
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
            Start managing{" "}
            <span className="bg-gradient-to-r from-azure-300 to-azure-500 bg-clip-text text-transparent">
              engineering change
            </span>{" "}
            in minutes.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-300">
            Create your workspace and get a signed, auditable record for every change — from the
            first request to release on the shop floor.
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
          <p className="text-sm text-ink-300">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-azure-300 hover:text-azure-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right: sign-up */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <LogoMark className="h-8 w-8" />
            <span className="font-display text-lg font-semibold tracking-tight text-ink-950">Revion</span>
          </div>

          <div className="overflow-hidden rounded-xl2 border border-hairline bg-paper shadow-float">
            <div className="border-b border-hairline px-7 pb-5 pt-6">
              <p className="font-mono text-2xs font-medium uppercase tracking-[0.18em] text-azure-600">Get started</p>
              <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink-950">
                Create your account
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-7 py-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-700">Email</label>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md2 border border-hairline-strong bg-paper px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-300 focus:border-azure-500 focus:ring-2 focus:ring-azure-500/20"
                  placeholder="At least 8 characters"
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
                {submitting ? "Creating account…" : "Create account"}
                {!submitting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
              </button>
            </form>

            <div className="border-t border-hairline px-7 py-4">
              <p className="text-center text-sm text-ink-500">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-azure-600 hover:text-azure-700">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
