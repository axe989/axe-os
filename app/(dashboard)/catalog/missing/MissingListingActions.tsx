"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MissingListingActions({
  matchId,
  marketplaceListingId,
}: {
  matchId: string;
  marketplaceListingId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createCommercialProduct(assortmentStatus: "candidate" | "order_only") {
    setBusy(true);
    try {
      const reason =
        assortmentStatus === "order_only"
          ? "Доступен под заказ"
          : "Есть листинг на Kaspi — кандидат в ассортимент";

      const response = await fetch("/api/catalog/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "marketplace_listing",
          sourceId: marketplaceListingId,
          assortmentStatus,
          reason,
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось создать коммерческий товар");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function ignoreMatch() {
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/listing-matches/${matchId}`, {
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
        onClick={() => createCommercialProduct("candidate")}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Создать коммерч. товар
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => createCommercialProduct("order_only")}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
      >
        Под заказ
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={ignoreMatch}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Исключить
      </button>
    </div>
  );
}
