"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Boxes, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, EmptyState, inputClass } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonRow } from "@/components/Skeleton";
import { useApi } from "@/lib/swr";
import { Paginated, Part } from "@/types";
import { titleCase } from "@/lib/format";

export default function PartsListPage() {
  const [search, setSearch] = useState("");
  const query = new URLSearchParams({ page_size: "50" });
  if (search) query.set("search", search);
  const { data, isLoading } = useApi<Paginated<Part>>(`/parts?${query.toString()}`);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Item master"
        title="Parts & assemblies"
        subtitle="Every part number, its current revision, and lifecycle status."
        actions={<Link href="/parts/new"><PrimaryButton><Plus size={15} /> New part</PrimaryButton></Link>}
      />

      <div className="mb-4 relative w-80">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search part number or name…" className={`${inputClass} pl-9`} />
      </div>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-2xs uppercase tracking-wider text-ink-400">
              <th className="px-5 py-3 font-semibold">Part</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Rev</th>
              <th className="px-5 py-3 font-semibold">UoM</th>
              <th className="px-5 py-3 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : data?.items?.length ? (
              data.items.map((part) => (
                <tr key={part.id} className="group transition-colors hover:bg-canvas">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/parts/${part.id}`} className="block">
                      <span className="font-mono text-2xs text-azure-600">{part.part_number}</span>
                      <span className="mt-0.5 block truncate font-medium text-ink-800 group-hover:text-ink-950">{part.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-500">{titleCase(part.part_type)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-600">
                    {part.revisions?.find((r) => r.id === part.current_revision_id)?.revision_code ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-ink-500">{part.unit_of_measure}</td>
                  <td className="px-5 py-3 text-right"><StatusBadge status={part.status} size="sm" /></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5}><EmptyState icon={Boxes} title="No parts found" subtitle="Create a part to start building BOMs and change orders." /></td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
