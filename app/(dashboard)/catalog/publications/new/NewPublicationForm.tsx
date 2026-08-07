"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommercialProductOption, ContentVariantOption } from "@/lib/catalog/queries/publications";

const PUBLICATION_MODES: { value: string; label: string }[] = [
  { value: "create_new_listing", label: "Создать новый листинг" },
  { value: "join_existing_listing", label: "Присоединить к существующему листингу" },
  { value: "update_existing_listing", label: "Обновить существующий листинг" },
];

export default function NewPublicationForm({
  commercialProducts,
}: {
  commercialProducts: CommercialProductOption[];
}) {
  const router = useRouter();

  const [commercialProductId, setCommercialProductId] = useState(commercialProducts[0]?.id ?? "");
  const [publicationMode, setPublicationMode] = useState("create_new_listing");
  const [marketplaceListingId, setMarketplaceListingId] = useState("");

  const [variants, setVariants] = useState<ContentVariantOption[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [contentVariantId, setContentVariantId] = useState<string>("");

  const [creatingVariant, setCreatingVariant] = useState(false);
  const [newVariantTitle, setNewVariantTitle] = useState("");
  const [newVariantDescription, setNewVariantDescription] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!commercialProductId) {
      return;
    }

    let cancelled = false;

    // The state updates below are deliberately pushed past a microtask
    // boundary (the leading await) so none of them run synchronously
    // during the effect's own execution -- this is a fetch-on-mount, not
    // a derived-state effect, so there's nothing to compute without it.
    async function loadVariants() {
      await Promise.resolve();
      if (cancelled) return;
      setLoadingVariants(true);

      try {
        const response = await fetch(`/api/catalog/content-variants?commercialProductId=${commercialProductId}`);
        const result = (await response.json()) as { success: boolean; variants?: ContentVariantOption[] };
        if (cancelled) return;

        const list = result.success ? result.variants ?? [] : [];
        setVariants(list);
        setContentVariantId(list[0]?.id ?? "");
        setCreatingVariant(list.length === 0);
      } finally {
        if (!cancelled) setLoadingVariants(false);
      }
    }

    loadVariants();

    return () => {
      cancelled = true;
    };
  }, [commercialProductId]);

  async function createVariantIfNeeded(): Promise<string | null> {
    if (!creatingVariant) {
      return contentVariantId || null;
    }

    if (!newVariantTitle.trim()) {
      setError("Укажите заголовок нового контент-варианта");
      return null;
    }

    const response = await fetch("/api/catalog/content-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commercialProductId,
        title: newVariantTitle,
        description: newVariantDescription || null,
        salesChannel: "kaspi",
        isDefault: variants.length === 0,
      }),
    });
    const result = (await response.json()) as { success: boolean; contentVariantId?: string; error?: string };
    if (!result.success || !result.contentVariantId) {
      setError(result.error ?? "Не удалось создать контент-вариант");
      return null;
    }
    return result.contentVariantId;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const variantId = await createVariantIfNeeded();
      if (!variantId) {
        return;
      }

      if (publicationMode !== "create_new_listing" && !marketplaceListingId.trim()) {
        setError("Для этого режима укажите ID существующего листинга маркетплейса");
        return;
      }

      const response = await fetch("/api/catalog/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialProductId,
          contentVariantId: variantId,
          publicationMode,
          salesChannel: "kaspi",
          marketplaceListingId: publicationMode === "create_new_listing" ? null : marketplaceListingId,
        }),
      });
      const result = (await response.json()) as { success: boolean; publicationItemId?: string; error?: string };

      if (!result.success || !result.publicationItemId) {
        setError(result.error ?? "Не удалось создать публикацию");
        return;
      }

      router.push(`/catalog/publications/${result.publicationItemId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Коммерческий товар</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={commercialProductId}
          onChange={(e) => setCommercialProductId(e.target.value)}
        >
          {commercialProducts.map((cp) => (
            <option key={cp.id} value={cp.id}>
              {cp.commercialName} ({cp.masterProductName})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Режим публикации</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={publicationMode}
          onChange={(e) => setPublicationMode(e.target.value)}
        >
          {PUBLICATION_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {publicationMode !== "create_new_listing" ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            ID существующего листинга маркетплейса
          </label>
          <input
            type="text"
            value={marketplaceListingId}
            onChange={(e) => setMarketplaceListingId(e.target.value)}
            placeholder="marketplace_listings.id"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Контент-вариант</label>
        {loadingVariants ? (
          <p className="text-sm text-slate-400">Загрузка вариантов…</p>
        ) : (
          <>
            {variants.length > 0 && !creatingVariant ? (
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={contentVariantId}
                onChange={(e) => setContentVariantId(e.target.value)}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} {v.isDefault ? "(по умолчанию)" : ""}
                  </option>
                ))}
              </select>
            ) : null}

            {variants.length > 0 ? (
              <button
                type="button"
                onClick={() => setCreatingVariant((prev) => !prev)}
                className="mt-2 text-xs font-medium text-blue-600 hover:underline"
              >
                {creatingVariant ? "Выбрать существующий вариант" : "Создать новый контент-вариант"}
              </button>
            ) : null}

            {creatingVariant ? (
              <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                <input
                  type="text"
                  value={newVariantTitle}
                  onChange={(e) => setNewVariantTitle(e.target.value)}
                  placeholder="Заголовок для Kaspi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  value={newVariantDescription}
                  onChange={(e) => setNewVariantDescription(e.target.value)}
                  placeholder="Описание (мин. 100 символов)"
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={busy || !commercialProductId}
        onClick={submit}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? "Создаём…" : "Создать публикацию"}
      </button>
    </div>
  );
}
