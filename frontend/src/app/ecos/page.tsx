"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, GitBranch, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, EmptyState, inputClass } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonRow } from "@/components/Skeleton";
import { useApi } from "@/lib/swr";
import { Paginated, ECOSummary, ECOStatus } from "@/types";
import { formatRelative, titleCase } from "@/lib/format";

const STATUS_OPTIONS: (ECOStatus | "all")[] = [
  "all", "draft", "pending_approval", "in_review", "approved", "rejected", "implemented", "closed", "cancelled",
];

export default function ECOListPage() {
  const [status, setStatus] = useState<ECOStatus | "all">("all");
  const [search, setSearch] = useState("");
  const query = new URLSearchParams({ page_size: "50" });
  if (status !== "all") query.set("status", status);
  if (search) query.set("search", search);
  const { data, isLoading } = useApi<Paginated<ECOSummary>>(`/ecos?${query.toString()}`);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Change orders"
        title="Engineering change orders"
        subtitle="Authorized changes moving through the signed approval chain."
        actions={<Link href="/ecos/new"><PrimaryButton><Plus size={15} /> New ECO</PrimaryButton></Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or number…"
            className={`${inputClass} pl-9`} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setStatus(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                status === opt ? "border-azure-500 bg-azure-50 text-azure-700" : "border-hairline bg-paper text-ink-500 hover:bg-canvas hover:text-ink-700"
              }`}>
              {opt === "all" ? "All" : titleCase(opt)}
            </button>
          ))}
        </div>
      </div>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-2xs uppercase tracking-wider text-ink-400">
              <th className="px-5 py-3 font-semibold">Order</th>
              <th className="px-5 py-3 font-semibold">Class</th>
              <th className="px-5 py-3 font-semibold">Initiated by</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : data?.items?.length ? (
              data.items.map((eco) => (
                <tr key={eco.id} className="group transition-colors hover:bg-canvas">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/ecos/${eco.id}`} className="block">
                      <span className="font-mono text-2xs text-azure-600">{eco.eco_number}</span>
                      <span className="mt-0.5 block truncate font-medium text-ink-800 group-hover:text-ink-950">{eco.title}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={eco.eco_class} size="sm" /></td>
                  <td className="px-5 py-3 text-ink-500">{eco.initiated_by?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-2xs text-ink-400 tnum">{formatRelative(eco.created_at)}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge status={eco.status} size="sm" /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5}><EmptyState icon={GitBranch} title="No change orders found" subtitle="Create one directly, or convert an approved change request." /></td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
