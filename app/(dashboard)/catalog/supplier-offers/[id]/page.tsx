import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import AssortmentDecisionActions from "../AssortmentDecisionActions";
import ReviewActions from "../ReviewActions";
import AddCommercialOfferForm from "./AddCommercialOfferForm";

export const dynamic = "force-dynamic";

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(
    new Date(value),
  );
}

const CONDITION_LABELS: Record<string, string> = {
  new: "Новый",
  discounted: "Уценка",
  damaged: "Повреждён",
  incomplete: "Неполный комплект",
  shortage: "Недостача",
  unknown: "Неизвестно",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function SupplierOfferDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: offer, error } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, currency, stock_quantity, available_quantity, is_available, product_condition, lead_time_days, is_order_only, raw_payload, last_seen_at, created_at, product_id, suppliers ( id, name, phone, email )",
    )
    .eq("id", id)
    .single();

  if (error || !offer) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Предложение поставщика не найдено: {error?.message}
        </div>
      </div>
    );
  }

  const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;

  const { data: match } = await supabase
    .from("product_matches")
    .select("id, match_status, match_method, confidence_score, match_reasons, product_id")
    .eq("supplier_product_id", id)
    .maybeSingle();

  const masterProductId = (offer.product_id as string | null) ?? null;

  const { data: masterProduct } = masterProductId
    ? await supabase
        .from("product_master")
        .select("id, name, manufacturer_sku, technical_attributes, product_brands ( name )")
        .eq("id", masterProductId)
        .maybeSingle()
    : { data: null };

  const { data: commercialOffers } = masterProductId
    ? await supabase
        .from("commercial_products")
        .select("id, commercial_name, status, assortment_status")
        .eq("master_product_id", masterProductId)
        .order("created_at", { ascending: false })
    : { data: [] as { id: string; commercial_name: string; status: string; assortment_status: string }[] };

  const commercialOfferIds = (commercialOffers ?? []).map((c) => c.id as string);

  const { data: listings } =
    commercialOfferIds.length > 0
      ? await supabase
          .from("marketplace_listings")
          .select("id, commercial_product_id, sales_channel, title, current_sale_price, listing_status, last_synced_at")
          .in("commercial_product_id", commercialOfferIds)
      : { data: [] as { id: string; commercial_product_id: string; sales_channel: string; title: string | null; current_sale_price: number | null; listing_status: string; last_synced_at: string | null }[] };

  const { data: priceHistory } = await supabase
    .from("supplier_offer_price_history")
    .select("purchase_price, stock_quantity, product_condition, recorded_at")
    .eq("supplier_product_id", id)
    .order("recorded_at", { ascending: false })
    .limit(10);

  const listingsByCommercialOffer = new Map<string, typeof listings>();
  for (const listing of listings ?? []) {
    const cpId = listing.commercial_product_id as string;
    const arr = listingsByCommercialOffer.get(cpId) ?? [];
    arr.push(listing);
    listingsByCommercialOffer.set(cpId, arr as never);
  }

  const rawPayload = offer.raw_payload as { radiator?: { attributes?: Record<string, unknown> } } | null;
  const technicalAttributes =
    (masterProduct?.technical_attributes as Record<string, unknown> | undefined) ??
    rawPayload?.radiator?.attributes ??
    {};
  const technicalEntries = Object.entries(technicalAttributes).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );

  const totalListings = listings?.length ?? 0;

  // Missing opportunities -- plain-language nudges from the same signals
  // used elsewhere (stale price, missing commercial offer / listing).
  const opportunities: string[] = [];
  if (!masterProductId) {
    opportunities.push("Ещё не принято решение по ассортименту — нет базового товара.");
  } else if ((commercialOffers?.length ?? 0) === 0) {
    opportunities.push("У базового товара пока нет ни одного коммерческого предложения.");
  } else {
    if (totalListings === 0) {
      opportunities.push("Ни один листинг на маркетплейсе ещё не создан.");
    }
    if ((commercialOffers?.length ?? 0) === 1) {
      opportunities.push(
        "Определено только одно коммерческое предложение — рассмотрите дополнительные варианты (установка, аксессуары, премиум-комплектация).",
      );
    }
    const latestCost = priceHistory?.[0]?.recorded_at ?? null;
    const latestListingSync = (listings ?? [])
      .map((l) => l.last_synced_at)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1);
    if (latestCost && (!latestListingSync || latestCost > latestListingSync)) {
      opportunities.push("Закупочная цена менялась позже, чем обновлялась цена на маркетплейсе — проверьте маржу.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <Link href="/catalog/supplier-offers" className="text-sm text-blue-700 hover:underline">
        ← Все предложения поставщиков
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{offer.supplier_name_raw}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {supplier?.name ?? "Поставщик не указан"} · {offer.supplier_sku}
          {offer.supplier_brand_raw ? ` · ${offer.supplier_brand_raw}` : ""}
        </p>

        {opportunities.length > 0 ? (
          <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Возможности, которые ещё не использованы
            </h3>
            <ul className="space-y-1 text-sm text-amber-900">
              {opportunities.map((o, i) => (
                <li key={i}>• {o}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">Поставщик</dt>
            <dd className="font-medium text-slate-900">{supplier?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Артикул поставщика</dt>
            <dd className="font-medium text-slate-900">{offer.supplier_sku}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Закупочная цена</dt>
            <dd className="font-medium text-slate-900">{formatMoney(offer.purchase_price)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Остаток</dt>
            <dd className="font-medium text-slate-900">{offer.stock_quantity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Доступно к продаже</dt>
            <dd className="font-medium text-slate-900">{offer.available_quantity ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Состояние</dt>
            <dd className="font-medium text-slate-900">
              {CONDITION_LABELS[offer.product_condition as string] ?? offer.product_condition}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Срок поставки</dt>
            <dd className="font-medium text-slate-900">
              {offer.lead_time_days !== null ? `${offer.lead_time_days} дн.` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Только под заказ</dt>
            <dd className="font-medium text-slate-900">{offer.is_order_only ? "Да" : "Нет"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Последнее обновление</dt>
            <dd className="font-medium text-slate-900">{formatDate(offer.last_seen_at)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Впервые получено</dt>
            <dd className="font-medium text-slate-900">{formatDate(offer.created_at)}</dd>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Технические характеристики</h2>
        {technicalEntries.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {technicalEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-slate-500">{key}</dt>
                <dd className="font-medium text-slate-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Характеристики пока не определены.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Статус базового товара</h2>

        {masterProduct ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <Link
              href={`/catalog/products/${masterProduct.id}`}
              className="font-semibold text-blue-700 hover:underline"
            >
              {masterProduct.name}
            </Link>
            <p className="mt-1 text-sm text-slate-500">
              {masterProduct.manufacturer_sku ?? "без артикула производителя"}
            </p>
          </div>
        ) : match && (match.match_status === "probable" || match.match_status === "conflict") ? (
          <div className="mt-3 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              Найдено вероятное совпадение с существующим базовым товаром — требуется проверка.
            </p>
            <details className="text-xs text-amber-800">
              <summary className="cursor-pointer">Почему так решили</summary>
              <ul className="mt-1 list-disc pl-4">
                {(Array.isArray(match.match_reasons) ? match.match_reasons : []).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </details>
            {match.id ? <ReviewActions matchId={match.id} /> : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
            <p className="text-sm text-slate-500">
              Решение по ассортименту ещё не принято — базовый товар не создан.
            </p>
            <AssortmentDecisionActions matchId={match?.id ?? null} supplierOfferId={id} />
          </div>
        )}
      </section>

      {masterProduct ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Коммерческие предложения</h2>

          {commercialOffers && commercialOffers.length > 0 ? (
            <div className="mt-4 space-y-4">
              {commercialOffers.map((cp) => {
                const cpListings = listingsByCommercialOffer.get(cp.id) ?? [];
                return (
                  <div key={cp.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/catalog/commercial-products/${cp.id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {cp.commercial_name}
                      </Link>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                        {cp.status}
                      </span>
                    </div>

                    {cpListings.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-sm text-slate-600">
                        {cpListings.map((l) => (
                          <li key={l.id} className="flex items-center justify-between">
                            <span>
                              {l.sales_channel} · {l.title}
                            </span>
                            <span className="font-medium text-slate-900">{formatMoney(l.current_sale_price)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Пока нет листингов на маркетплейсах.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Коммерческие предложения ещё не созданы.</p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <AddCommercialOfferForm masterProductId={masterProduct.id} defaultName={masterProduct.name} />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">История закупочной цены</h2>
        {priceHistory && priceHistory.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Дата</th>
                  <th className="px-3 py-2 font-medium">Цена</th>
                  <th className="px-3 py-2 font-medium">Остаток</th>
                  <th className="px-3 py-2 font-medium">Состояние</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {priceHistory.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-500">{formatDate(row.recorded_at)}</td>
                    <td className="px-3 py-2 text-slate-900">{formatMoney(row.purchase_price)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.stock_quantity ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {CONDITION_LABELS[row.product_condition as string] ?? row.product_condition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">История цен пуста.</p>
        )}
      </section>
    </div>
  );
}
