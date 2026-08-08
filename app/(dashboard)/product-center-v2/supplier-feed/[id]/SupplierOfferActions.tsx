"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  supplierOfferId: string;
  decision: string;
  masterProductId: string | null;
  masterProductName: string | null;
};

async function postDecision(supplierOfferId: string, decision: string, reason?: string) {
  const response = await fetch("/api/catalog/assortment-decisions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supplierOfferId, decision, reason }),
  });
  return (await response.json()) as { success: boolean; error?: string };
}

export default function SupplierOfferActions({ supplierOfferId, decision, masterProductId, masterProductName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [variantOpen, setVariantOpen] = useState(false);
  const [variantName, setVariantName] = useState(masterProductName ? `${masterProductName} (вариант)` : "");

  async function run(action: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(action);
    try {
      const result = await fn();
      if (!result.success) {
        alert(result.error ?? "Не удалось выполнить действие");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createVariant() {
    setBusy("variant");
    try {
      const response = await fetch("/api/catalog/commercial-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterProductId, commercialName: variantName }),
      });
      const result = (await response.json()) as { success: boolean; error?: string; commercialProductId?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось создать вариант");
        return;
      }
      if (result.commercialProductId) {
        router.push(`/product-center-v2/development/${result.commercialProductId}`);
      }
    } finally {
      setBusy(null);
    }
  }

  const isPending = decision === "pending";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPending ? (
        <>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("accept", () => postDecision(supplierOfferId, "accepted"))}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "accept" ? "Добавляем…" : "Добавить в ассортимент"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("postpone", () => postDecision(supplierOfferId, "postponed"))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "postpone" ? "Откладываем…" : "Рассмотреть позже"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("reject", () => postDecision(supplierOfferId, "rejected"))}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {busy === "reject" ? "Сохраняем…" : "Не добавлять"}
          </button>
        </>
      ) : null}

      {masterProductId ? (
        variantOpen ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <input
              type="text"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
              style={{ minWidth: 220 }}
              placeholder="Название варианта"
            />
            <button
              type="button"
              disabled={busy !== null || !variantName.trim()}
              onClick={createVariant}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "variant" ? "Создаём…" : "Создать"}
            </button>
            <button type="button" onClick={() => setVariantOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setVariantOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Создать коммерческий вариант
          </button>
        )
      ) : null}
    </div>
  );
}
