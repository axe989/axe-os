"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCommercialProductForm({
  masterProductId,
  defaultName,
}: {
  masterProductId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [commercialName, setCommercialName] = useState(defaultName);
  const [assortmentStatus, setAssortmentStatus] = useState("candidate");
  const [reason, setReason] = useState("");
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
          assortmentStatus,
          reason: reason || "Добавлена новая коммерческая упаковка",
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось создать коммерческий товар");
        return;
      }
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <input
        type="text"
        value={commercialName}
        onChange={(e) => setCommercialName(e.target.value)}
        placeholder="Коммерческое название (напр. «+ WiFi модуль»)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
      />
      <select
        value={assortmentStatus}
        onChange={(e) => setAssortmentStatus(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="candidate">Кандидат</option>
        <option value="active">Активен</option>
        <option value="order_only">Под заказ</option>
      </select>
      <button
        type="button"
        disabled={busy || !commercialName}
        onClick={submit}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Создаём…" : "Добавить"}
      </button>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Причина (необязательно)"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-4"
      />
    </div>
  );
}
