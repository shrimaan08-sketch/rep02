import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, tone = "default", hint,
}: {
  label: string; value: string | number; icon?: LucideIcon;
  tone?: "default" | "amber" | "green" | "red" | "azure"; hint?: string;
}) {
  const accent = {
    default: "text-ink-900", amber: "text-signal-amber", green: "text-signal-green",
    red: "text-signal-red", azure: "text-azure-600",
  }[tone];
  const iconWrap = {
    default: "bg-ink-100 text-ink-500", amber: "bg-signal-amber-bg text-signal-amber",
    green: "bg-signal-green-bg text-signal-green", red: "bg-signal-red-bg text-signal-red",
    azure: "bg-azure-50 text-azure-600",
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-md2 border border-hairline bg-paper p-4 shadow-panel transition-shadow hover:shadow-panel-lg">
      <div className="flex items-start justify-between">
        <p className="text-2xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        {Icon && (
          <span className={`flex h-7 w-7 items-center justify-center rounded-md2 ${iconWrap}`}>
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className={`mt-2.5 font-display text-[26px] font-semibold leading-none tnum ${accent}`}>{value}</p>
      {hint && <p className="mt-1.5 text-2xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  eyebrow, title, subtitle, actions,
}: {
  eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 font-mono text-2xs font-medium uppercase tracking-[0.18em] text-azure-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md2 border border-hairline bg-paper shadow-panel ${className}`}>{children}</div>;
}

export function PanelHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
      <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {Icon && (
        <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-ink-500">{subtitle}</p>}
    </div>
  );
}

export function PrimaryButton({
  children, onClick, type = "button", disabled, className = "",
}: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md2 bg-azure-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-azure-700 hover:shadow-glow-azure active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children, onClick, type = "button", disabled, className = "",
}: {
  children: ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md2 border border-hairline-strong bg-paper px-3.5 py-1.5 text-sm font-medium text-ink-800 transition-all hover:border-ink-300 hover:bg-canvas active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-2xs text-ink-400">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md2 border border-hairline-strong bg-paper px-3 py-2 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-azure-500 focus:ring-2 focus:ring-azure-500/20";
