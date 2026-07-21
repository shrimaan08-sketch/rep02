"use client";

import { useState, FormEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, SecondaryButton } from "@/components/ui";
import api, { extractErrorMessage } from "@/lib/api";
import { ECOClass, Part } from "@/types";

const CLASSES: ECOClass[] = ["minor", "major", "emergency"];

interface AffectedPartDraft {
  part_id: number;
  part_number: string;
  change_description: string;
}

function NewECOForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceEcrId = searchParams.get("source_ecr_id");

  const [form, setForm] = useState({
    title: "", description: "", eco_class: "major" as ECOClass,
    disposition_notes: "", effectivity_date: "", estimated_cost_impact: "",
  });
  const [affectedParts, setAffectedParts] = useState<AffectedPartDraft[]>([]);
  const [partQuery, setPartQuery] = useState("");
  const [partResults, setPartResults] = useState<Part[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (partQuery.trim().length < 2) {
      setPartResults([]);
      return;
    }
    const handle = setTimeout(() => {
      api.get(`/parts?search=${encodeURIComponent(partQuery)}&page_size=8`).then((res) => {
        setPartResults(res.data.items);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [partQuery]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addPart(part: Part) {
    if (affectedParts.some((p) => p.part_id === part.id)) return;
    setAffectedParts((prev) => [...prev, { part_id: part.id, part_number: part.part_number, change_description: "" }]);
    setPartQuery("");
    setPartResults([]);
  }

  function removePart(partId: number) {
    setAffectedParts((prev) => prev.filter((p) => p.part_id !== partId));
  }

  function updatePartDescription(partId: number, description: string) {
    setAffectedParts((prev) => prev.map((p) => (p.part_id === partId ? { ...p, change_description: description } : p)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post("/ecos", {
        title: form.title,
        description: form.description,
        eco_class: form.eco_class,
        disposition_notes: form.disposition_notes || null,
        effectivity_date: form.effectivity_date || null,
        estimated_cost_impact: form.estimated_cost_impact ? Number(form.estimated_cost_impact) : null,
        source_ecr_id: sourceEcrId ? Number(sourceEcrId) : null,
        affected_parts: affectedParts.map((p) => ({
          part_id: p.part_id,
          change_description: p.change_description || null,
        })),
      });
      router.push(`/ecos/${data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={sourceEcrId ? `Converting ECR-${sourceEcrId}` : "New change order"}
        title="Create an engineering change order"
      />

      <Panel className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Change class</label>
              <select
                value={form.eco_class}
                onChange={(e) => update("eco_class", e.target.value as ECOClass)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              >
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-ink-600">Determines the required approval chain.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Effectivity date</label>
              <input
                type="date"
                value={form.effectivity_date}
                onChange={(e) => update("effectivity_date", e.target.value)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
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
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Disposition of existing stock/WIP</label>
            <textarea
              rows={2}
              value={form.disposition_notes}
              onChange={(e) => update("disposition_notes", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="e.g. Use up existing inventory; rework WIP to new spec"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Estimated cost impact (USD)</label>
            <input
              type="number"
              step="0.01"
              value={form.estimated_cost_impact}
              onChange={(e) => update("estimated_cost_impact", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
            />
          </div>

          <div className="border-t border-hairline pt-4">
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Affected parts</label>
            <div className="relative">
              <input
                value={partQuery}
                onChange={(e) => setPartQuery(e.target.value)}
                placeholder="Search part number or name..."
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
              {partResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-sm2 border border-hairline bg-paper shadow-panel">
                  {partResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addPart(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
                    >
                      <span className="font-mono text-xs text-azure-600">{p.part_number}</span>
                      <span className="text-ink-700">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {affectedParts.map((p) => (
                <div key={p.part_id} className="flex items-center gap-2 rounded-sm2 border border-hairline p-2">
                  <span className="shrink-0 font-mono text-xs text-azure-600">{p.part_number}</span>
                  <input
                    value={p.change_description}
                    onChange={(e) => updatePartDescription(p.part_id, e.target.value)}
                    placeholder="What's changing on this part?"
                    aria-label={`What's changing on part ${p.part_number}`}
                    className="flex-1 border-none bg-transparent text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removePart(p.part_id)}
                    aria-label={`Remove part ${p.part_number} from this ECO`}
                    className="text-ink-600 hover:text-signal-red"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-sm2 border border-signal-red/25 bg-signal-red-bg px-3 py-2 text-xs text-signal-red">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-hairline pt-4">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create ECO"}
            </PrimaryButton>
            <SecondaryButton onClick={() => router.push("/ecos")}>Cancel</SecondaryButton>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}

export default function NewECOPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-sm text-ink-600">Loading…</p></AppShell>}>
      <NewECOForm />
    </Suspense>
  );
}
