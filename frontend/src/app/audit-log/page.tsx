"use client";

import AppShell from "@/components/AppShell";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { SkeletonRow } from "@/components/Skeleton";
import { useApi } from "@/lib/swr";
import { Paginated, AuditLog } from "@/types";
import { formatDateTime } from "@/lib/format";
import { ScrollText } from "lucide-react";

export default function AuditLogPage() {
  const { data, isLoading } = useApi<Paginated<AuditLog>>("/audit-logs?page_size=100");

  return (
    <AppShell>
      <PageHeader eyebrow="Traceability" title="Audit log"
        subtitle="Append-only record of every state-changing action across Revion." />
      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-2xs uppercase tracking-wider text-ink-400">
              <th className="px-5 py-3 font-semibold">Timestamp</th>
              <th className="px-5 py-3 font-semibold">Actor</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
            ) : data?.items?.length ? (
              data.items.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-canvas">
                  <td className="px-5 py-3 font-mono text-2xs text-ink-400 tnum">{formatDateTime(log.timestamp)}</td>
                  <td className="px-5 py-3 text-ink-700">{log.actor_email || "system"}</td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-canvas-alt px-1.5 py-0.5 font-mono text-2xs text-ink-700">{log.action}</code>
                  </td>
                  <td className="px-5 py-3 text-ink-500">{log.entity_type} #{log.entity_id}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4}><EmptyState icon={ScrollText} title="No audit events yet" subtitle="Access is restricted to admin and quality roles." /></td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
