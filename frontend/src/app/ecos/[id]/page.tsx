"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, QrCode, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, SecondaryButton, EmptyState } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import { useApi } from "@/lib/swr";
import api, { DEMO_MODE, extractErrorMessage } from "@/lib/api";
import { ECO, ImpactAnalysisResult, Supplier, SupplierNotification } from "@/types";
import { formatDateTime, titleCase, formatCurrency } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export default function ECODetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: eco, mutate } = useApi<ECO>(`/ecos/${id}`);
  const { data: impact } = useApi<ImpactAnalysisResult>(eco ? `/ecos/${id}/impact-analysis` : null);
  const { data: suppliers } = useApi<Supplier[]>("/suppliers");
  const { data: notifications, mutate: mutateNotifications } = useApi<SupplierNotification[]>(
    eco ? `/ecos/${id}/supplier-notifications` : null
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signatureModal, setSignatureModal] = useState<{ stepId: number; approve: boolean } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");

  async function runLifecycleAction(action: "submit" | "implement" | "close" | "cancel") {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/ecos/${id}/${action}`);
      mutate();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function notifySelectedSupplier() {
    if (!selectedSupplier) return;
    setBusy(true);
    try {
      await api.post("/supplier-notifications", {
        eco_id: Number(id), supplier_id: Number(selectedSupplier),
        message: `Please review the attached engineering change and confirm your ability to support the revised specification.`,
      });
      mutateNotifications();
      setSelectedSupplier("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!eco) {
    return (
      <AppShell>
        <p className="text-sm text-ink-600">Loading...</p>
      </AppShell>
    );
  }

  const myActiveSteps = eco.approval_chain.filter(
    (s) => s.status === "active" && (s.required_role === user?.role || user?.role === "admin")
  );

  return (
    <AppShell>
      <div className="mb-6 overflow-hidden rounded-sm2 border border-hairline bg-paper shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-ink-950 px-6 py-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-azure-300">{eco.eco_number}</p>
            <h1 className="mt-1 text-xl font-semibold text-white">{eco.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={eco.eco_class} />
            <StatusBadge status={eco.status} />
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-hairline border-t border-hairline text-xs sm:grid-cols-5">
          <div className="px-4 py-3">
            <p className="text-ink-600">Initiated by</p>
            <p className="mt-0.5 font-medium text-ink-900">{eco.initiated_by?.full_name ?? "—"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Effectivity</p>
            <p className="mt-0.5 font-medium text-ink-900">{eco.effectivity_date || "TBD"}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Cost impact</p>
            <p className="mt-0.5 font-medium text-ink-900">{formatCurrency(eco.estimated_cost_impact)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-ink-600">Created</p>
            <p className="mt-0.5 font-medium text-ink-900">{formatDateTime(eco.created_at)}</p>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-3">
            <QrCode size={13} className="text-ink-600" />
            <a
              href={
                DEMO_MODE
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`ECO:${eco.eco_number}`)}`
                  : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/ecos/${eco.id}/qr-code`
              }
              target="_blank"
              rel="noreferrer"
              className="text-azure-600 hover:underline"
            >
              View traveler QR
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {eco.ai_summary && (
            <Panel className="border-azure-300/40 bg-azure-50/40">
              <div className="flex items-center gap-2 border-b border-azure-300/30 px-5 py-3">
                <Sparkles size={14} className="text-azure-600" />
                <h2 className="text-sm font-semibold text-azure-700">AI-generated summary</h2>
              </div>
              <p className="px-5 py-4 text-sm leading-relaxed text-ink-800">{eco.ai_summary}</p>
            </Panel>
          )}

          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Description</h2>
            </div>
            <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-ink-800">{eco.description}</p>
          </Panel>

          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Approval chain</h2>
            </div>
            {eco.approval_chain.length === 0 ? (
              <EmptyState title="Not yet submitted" subtitle="Submit this ECO to generate its approval chain." />
            ) : (
              <ul className="divide-y divide-hairline">
                {eco.approval_chain.map((step) => (
                  <li key={step.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm2 border border-hairline font-mono text-[11px] text-ink-600">
                        {step.sequence}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{titleCase(step.required_role)}</p>
                        {step.approver && <p className="text-xs text-ink-600">{step.approver.full_name}</p>}
                        {step.signed_at && (
                          <p className="flex items-center gap-1 text-[11px] text-ink-600">
                            <ShieldCheck size={11} /> Signed {formatDateTime(step.signed_at)}
                          </p>
                        )}
                        {step.comments && <p className="mt-0.5 text-xs italic text-ink-600">&ldquo;{step.comments}&rdquo;</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={step.status} />
                      {step.status === "active" && (step.required_role === user?.role || user?.role === "admin") && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSignatureModal({ stepId: step.id, approve: true })}
                            className="flex items-center gap-1 rounded-sm2 bg-signal-green px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                          >
                            <CheckCircle2 size={12} /> Sign & approve
                          </button>
                          <button
                            onClick={() => setSignatureModal({ stepId: step.id, approve: false })}
                            className="flex items-center gap-1 rounded-sm2 bg-signal-red px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {impact && (
            <Panel>
              <div className="border-b border-hairline px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-950">Impact analysis</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 p-5">
                <div className="rounded-sm2 border border-hairline p-3 text-center">
                  <p className="font-mono text-xl font-semibold text-ink-950">{impact.directly_affected_parts.length}</p>
                  <p className="mt-1 text-xs text-ink-600">Directly affected parts</p>
                </div>
                <div className="rounded-sm2 border border-hairline p-3 text-center">
                  <p className="font-mono text-xl font-semibold text-signal-amber">{impact.upstream_assemblies.length}</p>
                  <p className="mt-1 text-xs text-ink-600">Upstream assemblies</p>
                </div>
                <div className="rounded-sm2 border border-hairline p-3 text-center">
                  <p className="font-mono text-xl font-semibold text-ink-950">{impact.affected_boms.length}</p>
                  <p className="mt-1 text-xs text-ink-600">BOMs touched</p>
                </div>
              </div>
              {impact.notes.length > 0 && (
                <ul className="space-y-1 border-t border-hairline px-5 py-3 text-xs text-ink-600">
                  {impact.notes.map((n, i) => <li key={i}>• {n}</li>)}
                </ul>
              )}
            </Panel>
          )}

          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Supplier notifications</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3">
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="rounded-sm2 border border-hairline px-2 py-1.5 text-sm outline-none focus:border-azure-500"
              >
                <option value="">Select a supplier...</option>
                {suppliers?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <SecondaryButton onClick={notifySelectedSupplier} disabled={!selectedSupplier || busy}>
                Notify supplier
              </SecondaryButton>
            </div>
            {notifications && notifications.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-ink-900">{n.supplier?.name ?? `Supplier #${n.supplier_id}`}</span>
                    <StatusBadge status={n.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-ink-600">No suppliers notified yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Workflow actions</h2>
            </div>
            <div className="space-y-2 p-5">
              {eco.status === "draft" && (
                <PrimaryButton onClick={() => runLifecycleAction("submit")} disabled={busy} className="w-full">
                  Submit for approval
                </PrimaryButton>
              )}
              {eco.status === "approved" && (
                <PrimaryButton onClick={() => runLifecycleAction("implement")} disabled={busy} className="w-full">
                  Mark implemented
                </PrimaryButton>
              )}
              {eco.status === "implemented" && (
                <PrimaryButton onClick={() => runLifecycleAction("close")} disabled={busy} className="w-full">
                  Close ECO
                </PrimaryButton>
              )}
              {!["closed", "cancelled", "implemented"].includes(eco.status) && (
                <SecondaryButton onClick={() => runLifecycleAction("cancel")} disabled={busy} className="w-full">
                  Cancel ECO
                </SecondaryButton>
              )}
              {error && <p className="text-xs text-signal-red">{error}</p>}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-hairline px-5 py-3">
              <h2 className="text-sm font-semibold text-ink-950">Affected parts</h2>
            </div>
            {eco.affected_parts.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {eco.affected_parts.map((ap) => (
                  <li key={ap.id} className="px-5 py-3 text-sm">
                    <p className="font-mono text-xs text-azure-600">Part #{ap.part_id}</p>
                    {ap.change_description && <p className="text-ink-700">{ap.change_description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-ink-600">No parts linked yet.</p>
            )}
          </Panel>
        </div>
      </div>

      {signatureModal && (
        <SignatureModal
          approve={signatureModal.approve}
          onClose={() => setSignatureModal(null)}
          onSubmit={async (comments, pin) => {
            setBusy(true);
            setError(null);
            try {
              await api.post(`/ecos/${id}/approvals/${signatureModal.stepId}/decision`, {
                approve: signatureModal.approve, comments, signature_pin: pin,
              });
              setSignatureModal(null);
              mutate();
            } catch (err) {
              setError(extractErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </AppShell>
  );
}

function SignatureModal({
  approve, onClose, onSubmit,
}: {
  approve: boolean;
  onClose: () => void;
  onSubmit: (comments: string, pin: string) => Promise<void>;
}) {
  const [comments, setComments] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 px-4">
      <div className="w-full max-w-sm rounded-sm2 border border-hairline bg-paper shadow-panel">
        <div className="border-b border-hairline px-5 py-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-azure-600">Digital signature</p>
          <h2 className="text-sm font-semibold text-ink-950">
            {approve ? "Sign to approve this step" : "Sign to reject this step"}
          </h2>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Comments (optional)</label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Re-enter your password to sign</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-[11px] text-ink-600">
              This re-authentication is recorded as part of the signed audit trail.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-hairline px-5 py-4">
          <PrimaryButton
            disabled={!pin || submitting}
            onClick={async () => {
              setSubmitting(true);
              await onSubmit(comments, pin);
              setSubmitting(false);
            }}
          >
            {submitting ? "Signing..." : approve ? "Sign & approve" : "Sign & reject"}
          </PrimaryButton>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
