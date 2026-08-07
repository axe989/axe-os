"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Plain-language front for the Matching Engine (product_matches), for
// offers the matcher couldn't confidently resolve on its own. Normal
// users never see match_method/confidence_score here -- just a decision:
// is this the same product, or not.
export default function ReviewActions({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function sendAction(action: "confirm" | "ignore") {
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
        onClick={() => sendAction("confirm")}
        className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
      >
        Подтвердить
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => sendAction("ignore")}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        Не наш товар
      </button>
    </div>
  );
}
