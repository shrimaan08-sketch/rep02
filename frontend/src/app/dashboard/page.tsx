"use client";

import Link from "next/link";
import {
  AlertTriangle, Clock, FileEdit, GitBranch, ArrowUpRight, Boxes, CheckCircle2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PanelHeader, StatCard } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonCard, SkeletonRow } from "@/components/Skeleton";
import { useApi } from "@/lib/swr";
import { DashboardMetrics, Paginated, ECR, ECOSummary } from "@/types";
import { formatRelative, titleCase } from "@/lib/format";

export default function DashboardPage() {
  const { data: metrics } = useApi<DashboardMetrics>("/dashboard/metrics", { refreshInterval: 30000 });
  const { data: recentEcos, isLoading: ecosLoading } = useApi<Paginated<ECOSummary>>("/ecos?page=1&page_size=6");
  const { data: recentEcrs, isLoading: ecrsLoading } = useApi<Paginated<ECR>>("/ecrs?page=1&page_size=6");

  const statusOrder = ["draft", "pending_approval", "in_review", "approved", "implemented", "closed", "rejected"];
  const ecoStatuses = metrics?.eco_by_status ?? {};
  const maxCount = Math.max(1, ...Object.values(ecoStatuses));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Change control dashboard"
        subtitle="Live status across change requests, orders, and part revisions."
      />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics ? (
          <>
            <StatCard label="Open change orders" value={metrics.open_ecos} icon={GitBranch} tone="azure"
              hint="Awaiting approval or in-flight" />
            <StatCard label="Avg. cycle time"
              value={metrics.average_eco_cycle_time_days != null ? `${metrics.average_eco_cycle_time_days}d` : "—"}
              icon={Clock} hint="Request to implementation" />
            <StatCard label="Requests in review" value={metrics.ecr_by_status?.under_review ?? 0}
              icon={FileEdit} tone="amber" hint="Pending disposition" />
            <StatCard label="Rejected orders" value={metrics.eco_by_status?.rejected ?? 0}
              icon={AlertTriangle} tone="red" hint="Returned for revision" />
          </>
        ) : (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent ECOs */}
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Recent change orders"
            action={<Link href="/ecos" className="inline-flex items-center gap-1 text-xs font-medium text-azure-600 hover:text-azure-700">View all <ArrowUpRight size={13} /></Link>}
          />
          <table className="w-full text-sm">
            <tbody className="divide-y divide-hairline">
              {ecosLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
              ) : recentEcos?.items?.length ? (
                recentEcos.items.map((eco) => (
                  <tr key={eco.id} className="group transition-colors hover:bg-canvas">
                    <td className="py-3 pl-5 pr-3">
                      <Link href={`/ecos/${eco.id}`} className="block">
                        <span className="font-mono text-2xs text-azure-600">{eco.eco_number}</span>
                        <span className="mt-0.5 block truncate font-medium text-ink-800 group-hover:text-ink-950">{eco.title}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right text-2xs text-ink-400 tnum">{formatRelative(eco.created_at)}</td>
                    <td className="py-3 pl-3 pr-5 text-right"><StatusBadge status={eco.status} size="sm" /></td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-5 py-10 text-center text-sm text-ink-400">No change orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        {/* ECO status distribution */}
        <Panel>
          <PanelHeader title="Orders by status" />
          <div className="space-y-2.5 p-5">
            {metrics ? (
              statusOrder.filter((s) => ecoStatuses[s]).length ? (
                statusOrder.filter((s) => ecoStatuses[s]).map((status) => (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-ink-600">{titleCase(status)}</span>
                      <span className="font-mono text-xs font-medium text-ink-800 tnum">{ecoStatuses[status]}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-canvas-alt">
                      <div className="h-full rounded-full bg-azure-sheen transition-all" style={{ width: `${(ecoStatuses[status] / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <CheckCircle2 size={22} className="text-ink-300" />
                  <p className="text-sm text-ink-400">No change orders yet.</p>
                </div>
              )
            ) : (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-6 rounded" />)}</div>
            )}
          </div>
        </Panel>
      </div>

      {/* Recent ECRs */}
      <Panel className="mt-6">
        <PanelHeader
          title="Recent change requests"
          action={<Link href="/ecrs" className="inline-flex items-center gap-1 text-xs font-medium text-azure-600 hover:text-azure-700">View all <ArrowUpRight size={13} /></Link>}
        />
        <table className="w-full text-sm">
          <tbody className="divide-y divide-hairline">
            {ecrsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
            ) : recentEcrs?.items?.length ? (
              recentEcrs.items.map((ecr) => (
                <tr key={ecr.id} className="group transition-colors hover:bg-canvas">
                  <td className="py-3 pl-5 pr-3">
                    <Link href={`/ecrs/${ecr.id}`} className="font-mono text-2xs text-azure-600">{ecr.ecr_number}</Link>
                  </td>
                  <td className="px-3 py-3"><Link href={`/ecrs/${ecr.id}`} className="truncate font-medium text-ink-800 hover:text-ink-950">{ecr.title}</Link></td>
                  <td className="px-3 py-3"><StatusBadge status={ecr.priority} size="sm" /></td>
                  <td className="py-3 pl-3 pr-5 text-right"><StatusBadge status={ecr.status} size="sm" /></td>
                </tr>
              ))
            ) : (
              <tr><td className="px-5 py-10 text-center text-sm text-ink-400">No change requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  );
}
