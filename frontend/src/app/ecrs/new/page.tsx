"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, SecondaryButton } from "@/components/ui";
import api, { extractErrorMessage } from "@/lib/api";
import { ECRReasonCode, ECRPriority } from "@/types";

const REASON_CODES: ECRReasonCode[] = [
  "design_improvement", "cost_reduction", "quality_issue", "supplier_change",
  "regulatory_compliance", "customer_request", "obsolescence", "safety", "other",
];
const PRIORITIES: ECRPriority[] = ["low", "medium", "high", "critical"];

export default function NewECRPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", description: "", reason_code: "design_improvement" as ECRReasonCode,
    priority: "medium" as ECRPriority, justification: "", proposed_solution: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post("/ecrs", form);
      router.push(`/ecrs/${data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="New request" title="Raise an engineering change request" />

      <Panel className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="e.g. Replace obsolete connector on control board"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Reason code</label>
              <select
                value={form.reason_code}
                onChange={(e) => update("reason_code", e.target.value as ECRReasonCode)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              >
                {REASON_CODES.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value as ECRPriority)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Description</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="What needs to change, and on what part or assembly?"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Justification (optional)</label>
            <textarea
              rows={3}
              value={form.justification}
              onChange={(e) => update("justification", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="Why is this change needed now?"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Proposed solution (optional)</label>
            <textarea
              rows={3}
              value={form.proposed_solution}
              onChange={(e) => update("proposed_solution", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="What's the recommended fix?"
            />
          </div>

          {error && (
            <p className="rounded-sm2 border border-signal-red/25 bg-signal-red-bg px-3 py-2 text-xs text-signal-red">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-hairline pt-4">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create ECR"}
            </PrimaryButton>
            <SecondaryButton onClick={() => router.push("/ecrs")}>Cancel</SecondaryButton>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
