"use client";

import { useState, FormEvent } from "react";
import AppShell from "@/components/AppShell";
import { PageHeader, Panel, PrimaryButton, EmptyState } from "@/components/ui";
import { useApi } from "@/lib/swr";
import api, { extractErrorMessage } from "@/lib/api";
import { Supplier } from "@/types";
import { formatDate } from "@/lib/format";

export default function SuppliersPage() {
  const { data: suppliers, mutate } = useApi<Supplier[]>("/suppliers");
  const [form, setForm] = useState({ name: "", contact_email: "", contact_name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/suppliers", form);
      setForm({ name: "", contact_email: "", contact_name: "", phone: "" });
      mutate();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Sourcing" title="Suppliers" subtitle="Contacts notified when a change order affects their parts." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          {suppliers && suppliers.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-600">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas">
                    <td className="px-5 py-3 font-medium text-ink-900">{s.name}</td>
                    <td className="px-5 py-3 text-ink-600">{s.contact_name || "—"}</td>
                    <td className="px-5 py-3 text-ink-600">{s.contact_email}</td>
                    <td className="px-5 py-3 text-ink-600">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No suppliers yet" subtitle="Add one to start sending change notifications." />
          )}
        </Panel>

        <Panel>
          <div className="border-b border-hairline px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-950">Add supplier</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Company name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Contact name</label>
              <input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Contact email</label>
              <input
                type="email" required
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-700">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-sm2 border border-hairline px-3 py-2 text-sm outline-none focus:border-azure-500 focus:ring-1 focus:ring-azure-500"
              />
            </div>
            {error && <p className="text-xs text-signal-red">{error}</p>}
            <PrimaryButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Adding..." : "Add supplier"}
            </PrimaryButton>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
