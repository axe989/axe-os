"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const WORKFLOW_STATUSES = [
  "discovered",
  "needs_matching",
  "draft",
  "needs_technical_data",
  "needs_content",
  "needs_price",
  "review",
  "approved",
  "ready_to_publish",
  "published",
  "needs_update",
  "archived",
];

const ASSORTMENT_STATUSES = ["active", "order_only", "candidate", "excluded", "archived"];

export default function ProductStatusForm({
  productId,
  status,
  assortmentStatus,
}: {
  productId: string;
  status: string;
  assortmentStatus: string;
}) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(status);
  const [assortmentValue, setAssortmentValue] = useState(assortmentStatus);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusValue,
          assortmentStatus: assortmentValue,
          reason: reason || undefined,
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось сохранить");
        return;
      }
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Статус жизненного цикла</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
        >
          {WORKFLOW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Статус ассортимента</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={assortmentValue}
          onChange={(e) => setAssortmentValue(e.target.value)}
        >
          {ASSORTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Причина изменения</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="например: недостаточная маржа"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="sm:col-span-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
