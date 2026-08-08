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
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy === "accepted" ? "…" : "Добавить в ассортимент"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("postponed")}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === "postponed" ? "…" : "Рассмотреть позже"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => decide("rejected")}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {busy === "rejected" ? "…" : "Не добавлять"}
      </button>
    </div>
  );
}
