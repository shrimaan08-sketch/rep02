"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, SecondaryButton } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/lib/swr";
import api, { extractErrorMessage } from "@/lib/api";
import { ECR, ECRStatus } from "@/types";
import { formatDateTime, titleCase } from "@/lib/format";
import { useAuth } from "@/lib/auth";

const NEXT_STATUS: Partial<Record<ECRStatus, { label: string; target: ECRStatus }[]>> = {
  draft: [{ label: "Submit for review", target: "submitted" }],
  submitted: [{ label: "Begin review", target: "under_review" }],
  under_review: [
    { label: "Approve", target: "approved" },
    { label: "Reject", target: "rejected" },
  ],
};

export default function ECRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: ecr, mutate } = useApi<ECR>(`/ecrs/${id}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(target: ECRStatus) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/ecrs/${id}/status`, { status: target });
      mutate();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function convertToEco() {
    router.push(`/ecos/new?source_ecr_id=${id}`);
  }

  if (!ecr) {
    return (
      <AppShell>
        <p className="text-sm text-ink-600">Loading...</p>
      </AppShell>
    );
  }

  const actions = NEXT_STATUS[ecr.status] ?? [];

  return (
    <AppShell>
      {/* Title-block style header */}
      <div className="mb-6 overflow-hidden rounded-sm2 border border-hairline bg-paper shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-950 px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-azure-300">{ecr.ecr_number}</p>
            <h1 className="mt-1 text-xl font-semibold text-white">{ecr.title}</h1>
          </div>
          <StatusBadge status={ecr.status} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline text-xs sm:grid-cols-4">
          <div className="px-4 py-3">
            <p className="text-ink-600">Reason</p>
            <p className="mt-0.5 font-medium text-ink-900">{titleCase(ecr.reason_code)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Priority</p>
            <p className="mt-0.5"><StatusBadge status={ecr.priority} /></p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Requested by</p>
            <p className="mt-0.5 font-medium text-ink-900">{ecr.requested_by?.full_name ?? "—"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Created</p>
            <p className="mt-0.5 font-medium text-ink-900">{formatDateTime(ecr.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {ecr.ai_summary && (
            <Panel className="border-azure-300/40 bg-azure-50/40">
              <div className="flex items-center gap-2 border-b border-azure-300/30 px-5 py-3">
                <Sparkles size={14} className="text-azure-600" />
                <h2 className="text-sm font-semibold text-azure-700">AI-generated summary</h2>
              </div>
              <p className="px-5 py-4 text-sm leading-relaxed text-ink-800">{ecr.ai_summary}</p>
            </Panel>
          )}

          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Description</h2>
            </div>
            <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-ink-800">{ecr.description}</p>
          </Panel>

          {ecr.justification && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Justification</h2>
              </div>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-ink-800">{ecr.justification}</p>
            </Panel>
          )}

          {ecr.proposed_solution && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Proposed solution</h2>
              </div>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-ink-800">{ecr.proposed_solution}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Actions</h2>
            </div>
            <div className="space-y-2 p-5">
              {actions.map((a) => (
                <PrimaryButton key={a.target} onClick={() => changeStatus(a.target)} disabled={busy} className="w-full">
                  {a.label}
                </PrimaryButton>
              ))}
              {ecr.status === "approved" && (
                <PrimaryButton onClick={convertToEco} className="w-full">
                  <span className="flex items-center justify-center gap-1.5">
                    Convert to ECO <ArrowRight size={14} />
                  </span>
                </PrimaryButton>
              )}
              {actions.length === 0 && ecr.status !== "approved" && (
                <p className="text-xs text-ink-600">No further actions available from this status.</p>
              )}
              {error && <p className="text-xs text-signal-red">{error}</p>}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
