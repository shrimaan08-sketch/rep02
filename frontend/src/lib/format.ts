export function titleCase(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type StatusTone = "slate" | "amber" | "green" | "red" | "azure";

const STATUS_TONE_MAP: Record<string, StatusTone> = {
  draft: "slate", submitted: "azure", under_review: "amber", in_review: "amber",
  pending_approval: "amber", approved: "green", rejected: "red", converted: "azure",
  implemented: "green", closed: "slate", cancelled: "slate", active: "green",
  in_design: "azure", obsolete: "slate", pending_change: "amber", pending: "slate",
  skipped: "slate", sent: "azure", acknowledged: "green", failed: "red",
  critical: "red", high: "amber", medium: "azure", low: "slate",
  major: "amber", minor: "slate", emergency: "red",
};

const TONE_CLASSES: Record<StatusTone, string> = {
  slate: "bg-signal-slate-bg text-signal-slate border-signal-slate-ring",
  amber: "bg-signal-amber-bg text-signal-amber border-signal-amber-ring",
  green: "bg-signal-green-bg text-signal-green border-signal-green-ring",
  red: "bg-signal-red-bg text-signal-red border-signal-red-ring",
  azure: "bg-azure-50 text-azure-700 border-azure-200",
};

export function statusClasses(status: string): string {
  return TONE_CLASSES[STATUS_TONE_MAP[status] ?? "slate"];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
