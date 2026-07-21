"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, SecondaryButton } from "@/components/ui";
import api, { extractErrorMessage } from "@/lib/api";
import { PartType } from "@/types";

const TYPES: PartType[] = ["raw_material", "component", "subassembly", "assembly", "finished_good"];

export default function NewPartPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    part_number: "", name: "", description: "", part_type: "component" as PartType,
    unit_of_measure: "EA", standard_cost: "", initial_specification: "",
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
      const { data } = await api.post("/parts", {
        ...form,
        standard_cost: form.standard_cost ? Number(form.standard_cost) : null,
      });
      router.push(`/parts/${data.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Item master" title="Create a new part" />

      <Panel className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Part number</label>
              <input
                required
                value={form.part_number}
                onChange={(e) => update("part_number", e.target.value.toUpperCase())}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm font-mono outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
                placeholder="e.g. BRK-1001"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Unit of measure</label>
              <input
                value={form.unit_of_measure}
                onChange={(e) => update("unit_of_measure", e.target.value)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Part type</label>
              <select
                value={form.part_type}
                onChange={(e) => update("part_type", e.target.value as PartType)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              >
                {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-700">Standard cost (USD)</label>
              <input
                type="number" step="0.01"
                value={form.standard_cost}
                onChange={(e) => update("standard_cost", e.target.value)}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-700">Initial specification (Rev A)</label>
            <textarea
              rows={3}
              value={form.initial_specification}
              onChange={(e) => update("initial_specification", e.target.value)}
              className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              placeholder="Material, tolerance, drawing reference..."
            />
          </div>

          {error && (
            <p className="rounded-sm2 border border-signal-red/25 bg-signal-red-bg px-3 py-2 text-xs text-signal-red">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 border-t border-hairline pt-4">
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create part"}
            </PrimaryButton>
            <SecondaryButton onClick={() => router.push("/parts")}>Cancel</SecondaryButton>
          </div>
        </form>
      </Panel>
    </AppShell>
  );
}
