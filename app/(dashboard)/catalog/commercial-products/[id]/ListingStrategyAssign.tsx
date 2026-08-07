"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Strategy = { id: string; name: string };

export default function ListingStrategyAssign({
  listingId,
  currentStrategyId,
  strategies,
}: {
  listingId: string;
  currentStrategyId: string | null;
  currentStrategyName: string | null;
  strategies: Strategy[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentStrategyId ?? "");
  const [busy, setBusy] = useState(false);

  async function assign(nextValue: string) {
    setValue(nextValue);
    setBusy(true);
    try {
      const response = await fetch(`/api/catalog/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStrategyId: nextValue || null }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось назначить стратегию");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => assign(e.target.value)}
      className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="">— не назначена —</option>
      {strategies.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
