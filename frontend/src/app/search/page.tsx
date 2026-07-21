"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { useApi } from "@/lib/swr";
import StatusBadge from "@/components/StatusBadge";

interface SearchResults {
  parts: { id: number; part_number: string; name: string; status: string }[];
  ecrs: { id: number; ecr_number: string; title: string; status: string }[];
  ecos: { id: number; eco_number: string; title: string; status: string }[];
}

function SearchResultsView() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const { data, isLoading } = useApi<SearchResults>(q ? `/search?q=${encodeURIComponent(q)}` : null);

  const totalResults = (data?.parts.length ?? 0) + (data?.ecrs.length ?? 0) + (data?.ecos.length ?? 0);

  return (
    <AppShell>
      <PageHeader eyebrow="Search" title={`Results for "${q}"`} />

      {isLoading ? (
        <p className="text-sm text-ink-600">Searching...</p>
      ) : totalResults === 0 ? (
        <Panel>
          <EmptyState title="No matches found" subtitle="Try a part number, ECR number, or ECO number." />
        </Panel>
      ) : (
        <div className="space-y-6">
          {data && data.parts.length > 0 && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Parts</h2>
              </div>
              <ul className="divide-y divide-hairline">
                {data.parts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/parts/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-canvas">
                      <span>
                        <span className="font-mono text-xs text-azure-600">{p.part_number}</span>{" "}
                        <span className="text-ink-900">{p.name}</span>
                      </span>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {data && data.ecrs.length > 0 && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Change requests</h2>
              </div>
              <ul className="divide-y divide-hairline">
                {data.ecrs.map((e) => (
                  <li key={e.id}>
                    <Link href={`/ecrs/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-canvas">
                      <span>
                        <span className="font-mono text-xs text-azure-600">{e.ecr_number}</span>{" "}
                        <span className="text-ink-900">{e.title}</span>
                      </span>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {data && data.ecos.length > 0 && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Change orders</h2>
              </div>
              <ul className="divide-y divide-hairline">
                {data.ecos.map((e) => (
                  <li key={e.id}>
                    <Link href={`/ecos/${e.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-canvas">
                      <span>
                        <span className="font-mono text-xs text-azure-600">{e.eco_number}</span>{" "}
                        <span className="text-ink-900">{e.title}</span>
                      </span>
                      <StatusBadge status={e.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </AppShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-sm text-ink-600">Loading search…</p></AppShell>}>
      <SearchResultsView />
    </Suspense>
  );
}
