"use client";

import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/lib/swr";
import { Part, BOM } from "@/types";
import { formatDate, titleCase, formatCurrency } from "@/lib/format";

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: part } = useApi<Part>(`/parts/${id}`);
  const { data: boms } = useApi<BOM[]>(part ? `/parts/${id}/boms` : null);

  if (!part) {
    return (
      <AppShell>
        <p className="text-sm text-ink-600">Loading...</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 overflow-hidden rounded-sm2 border border-hairline bg-paper shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-950 px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-azure-300">{part.part_number}</p>
            <h1 className="mt-1 text-xl font-semibold text-white">{part.name}</h1>
          </div>
          <StatusBadge status={part.status} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline text-xs sm:grid-cols-4">
          <div className="px-4 py-3">
            <p className="text-ink-600">Type</p>
            <p className="mt-0.5 font-medium text-ink-900">{titleCase(part.part_type)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Unit of measure</p>
            <p className="mt-0.5 font-medium text-ink-900">{part.unit_of_measure}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Standard cost</p>
            <p className="mt-0.5 font-medium text-ink-900">{formatCurrency(part.standard_cost)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Current revision</p>
            <p className="mt-0.5 font-mono font-medium text-ink-900">
              {part.revisions?.find((r) => r.id === part.current_revision_id)?.revision_code ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {part.description && (
        <Panel className="mb-6">
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-950">Description</h2>
          </div>
          <p className="px-5 py-4 text-sm leading-relaxed text-ink-800">{part.description}</p>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel>
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-950">Revision history</h2>
          </div>
          {part.revisions && part.revisions.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {part.revisions.map((rev) => (
                <li key={rev.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-ink-950">Rev {rev.revision_code}</span>
                    <span className={`text-xs ${rev.is_released ? "text-signal-green" : "text-signal-slate"}`}>
                      {rev.is_released ? "Released" : "In work"}
                    </span>
                  </div>
                  {rev.change_summary && <p className="mt-1 text-xs text-ink-600">{rev.change_summary}</p>}
                  <p className="mt-1 text-[11px] text-ink-500">{formatDate(rev.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No revisions" />
          )}
        </Panel>

        <Panel>
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-950">Bills of materials</h2>
          </div>
          {boms && boms.length > 0 ? (
            <div className="divide-y divide-hairline">
              {boms.map((bom) => (
                <div key={bom.id} className="px-5 py-3">
                  <p className="text-sm font-medium text-ink-900">{bom.name}</p>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {bom.items.map((item) => (
                        <tr key={item.id} className="border-t border-hairline">
                          <td className="py-1.5 pr-2 font-mono text-azure-600">
                            {item.child_part?.part_number ?? item.child_part_id}
                          </td>
                          <td className="py-1.5 pr-2 text-ink-700">{item.child_part?.name}</td>
                          <td className="py-1.5 text-right text-ink-600">×{item.quantity_per}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No BOM defined" subtitle="This part has no bill of materials yet." />
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
