"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FileEdit, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, EmptyState, inputClass } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonRow } from "@/components/Skeleton";
import { useApi } from "@/lib/swr";
import { Paginated, ECR, ECRStatus } from "@/types";
import { formatRelative, titleCase } from "@/lib/format";

const STATUS_OPTIONS: (ECRStatus | "all")[] = [
  "all", "draft", "submitted", "under_review", "approved", "rejected", "converted", "cancelled",
];

export default function ECRListPage() {
  const [status, setStatus] = useState<ECRStatus | "all">("all");
  const [search, setSearch] = useState("");
  const query = new URLSearchParams({ page_size: "50" });
  if (status !== "all") query.set("status", status);
  if (search) query.set("search", search);
  const { data, isLoading } = useApi<Paginated<ECR>>(`/ecrs?${query.toString()}`);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Requests"
        title="Engineering change requests"
        subtitle="Proposed changes awaiting review before authorization."
        actions={<Link href="/ecrs/new"><PrimaryButton><Plus size={15} /> New ECR</PrimaryButton></Link>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or number…" className={`${inputClass} pl-9`} />
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
              <th className="px-5 py-3 font-semibold">Request</th>
              <th className="px-5 py-3 font-semibold">Priority</th>
              <th className="px-5 py-3 font-semibold">Requested by</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : data?.items?.length ? (
              data.items.map((ecr) => (
                <tr key={ecr.id} className="group transition-colors hover:bg-canvas">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/ecrs/${ecr.id}`} className="block">
                      <span className="font-mono text-2xs text-azure-600">{ecr.ecr_number}</span>
                      <span className="mt-0.5 block truncate font-medium text-ink-800 group-hover:text-ink-950">{ecr.title}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={ecr.priority} size="sm" /></td>
                  <td className="px-5 py-3 text-ink-500">{ecr.requested_by?.full_name ?? "—"}</td>
                  <td className="px-5 py-3 text-2xs text-ink-400 tnum">{formatRelative(ecr.created_at)}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge status={ecr.status} size="sm" /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5}><EmptyState icon={FileEdit} title="No change requests found" subtitle="Raise one to kick off the review process." /></td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
