"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCommercialOfferForm({
  masterProductId,
  defaultName,
}: {
  masterProductId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [commercialName, setCommercialName] = useState(defaultName);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/commercial-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterProductId,
          commercialName,
          assortmentStatus: "candidate",
          reason: "Добавлено коммерческое предложение из карточки предложения поставщика",
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось создать коммерческое предложение");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={commercialName}
        onChange={(e) => setCommercialName(e.target.value)}
        placeholder="Название коммерческого предложения"
        className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={busy || !commercialName}
        onClick={submit}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Добавляем…" : "Добавить предложение"}
      </button>
    </div>
  );
}
