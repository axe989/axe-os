"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchRowActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [manualProductId, setManualProductId] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  async function sendAction(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось выполнить действие");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => sendAction({ action: "confirm" })}
        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        Подтвердить
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => sendAction({ action: "ignore" })}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        Игнорировать
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => sendAction({ action: "mark_conflict" })}
        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        Конфликт
      </button>

      {showManualInput ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="ID товара"
            value={manualProductId}
            onChange={(e) => setManualProductId(e.target.value)}
            className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={busy || !manualProductId}
            onClick={() => sendAction({ action: "set_product", productId: manualProductId })}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Привязать
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowManualInput(true)}
          className="text-xs font-medium text-blue-700 hover:underline"
        >
          Выбрать другой товар
        </button>
      )}
    </div>
  );
}
