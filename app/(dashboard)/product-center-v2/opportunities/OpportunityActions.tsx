"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AssortmentDecision } from "@/lib/catalog/types";

export default function OpportunityActions({ supplierOfferId }: { supplierOfferId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<AssortmentDecision | null>(null);

  async function decide(decision: Exclude<AssortmentDecision, "pending">) {
    setBusy(decision);
    try {
      const response = await fetch("/api/catalog/assortment-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierOfferId, decision }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось сохранить решение");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("accepted")}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy === "accepted" ? "…" : "Принять"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("rejected")}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        {busy === "rejected" ? "…" : "Отклонить"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("postponed")}
        className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
      >
        {busy === "postponed" ? "…" : "Отложить"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("ignored")}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        {busy === "ignored" ? "…" : "Игнорировать"}
      </button>
    </div>
  );
}
