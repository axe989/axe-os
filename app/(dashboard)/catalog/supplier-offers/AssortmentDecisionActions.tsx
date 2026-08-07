"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Assortment Decision step of the lifecycle (Supplier Offer -> Assortment
// Decision -> Base Product). Reuses the existing supplier_offer ->
// product_master creation path (createMasterProductFromSupplierOffer);
// only the labeling/framing is new.
export default function AssortmentDecisionActions({
  matchId,
  supplierOfferId,
}: {
  matchId: string | null;
  supplierOfferId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createProduct(assortmentStatus: "candidate" | "order_only") {
    setBusy(true);
    try {
      const reason =
        assortmentStatus === "order_only"
          ? "Доступен под заказ у поставщика"
          : "Есть в наличии у поставщика — кандидат в ассортимент";

      const response = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "supplier_offer",
          sourceId: supplierOfferId,
          assortmentStatus,
          reason,
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось создать базовый товар");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function exclude() {
    if (!matchId) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ignore" }),
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
        onClick={() => createProduct("candidate")}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Создать базовый товар
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => createProduct("order_only")}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
      >
        Под заказ
      </button>
      <button
        type="button"
        disabled={busy || !matchId}
        onClick={exclude}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Исключить
      </button>
    </div>
  );
}
