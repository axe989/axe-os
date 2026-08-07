"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BulkConfirmButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/matches/bulk-confirm", { method: "POST" });
      const result = (await response.json()) as { success: boolean; confirmedCount?: number; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось выполнить массовое подтверждение");
        return;
      }
      alert(`Подтверждено точных совпадений: ${result.confirmedCount ?? 0}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={run}
      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      {busy ? "Подтверждаем…" : "Массово подтвердить точные совпадения"}
    </button>
  );
}
