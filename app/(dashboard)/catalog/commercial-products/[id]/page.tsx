import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  calculateExpectedMargin,
  calculateExpectedProfit,
  calculateMinimumSalePrice,
  calculateRecommendedSalePrice,
  classifyMarginStatus,
} from "@/lib/catalog/pricing/margin";
import { resolveProductReadiness } from "@/lib/catalog/readiness/resolve-readiness";
import {
  READINESS_DIMENSION_LABELS,
  READINESS_LABEL_TEXT,
  RESPONSIBLE_TEAM_LABELS,
} from "@/lib/catalog/readiness/labels";
import type { BundleComponent, ProductReadiness, ReadinessDimensionStatus } from "@/lib/catalog/types";
import CommercialProductStatusForm from "./CommercialProductStatusForm";
import ListingStrategyAssign from "./ListingStrategyAssign";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "general", label: "Общее" },
  { key: "pricing", label: "Цены и маржа" },
  { key: "listings", label: "Листинги" },
  { key: "history", label: "История" },
];

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

function marginStatusClassName(status: string) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-700";
  if (status === "below_target") return "bg-amber-50 text-amber-700";
  if (status === "below_minimum" || status === "negative") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CommercialProductDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "general";
  const supabase = createSupabaseAdminClient();

  const { data: product, error } = await supabase
    .from("commercial_products")
    .select("*, product_master ( id, name, manufacturer_sku, brand_id, product_brands ( name ) )")
    .eq("id", id)
    .single();

  if (error || !product) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Коммерческое предложение не найдено: {error?.message}
        </div>
      </div>
    );
  }

  const master = Array.isArray(product.product_master) ? product.product_master[0] : product.product_master;
  const brand = master ? (Array.isArray(master.product_brands) ? master.product_brands[0] : master.product_brands) : null;
  const readiness = await resolveProductReadiness(supabase, { commercialProductId: id });

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <Link href={`/catalog/products/${master?.id}`} className="text-sm text-blue-700 hover:underline">
        ← {master?.name ?? "Базовый товар"}
      </Link>

      <ReadinessSummary readiness={readiness} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{product.commercial_name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Коммерческое предложение · {brand?.name ?? "Бренд не указан"}
          {master?.manufacturer_sku ? ` · ${master.manufacturer_sku}` : ""}
        </p>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/catalog/commercial-products/${id}?tab=${t.key}`}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
                tab === t.key
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="pt-6">
          {tab === "general" ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <GeneralTab product={product as any} />
          ) : tab === "pricing" ? (
            <PricingTab commercialProductId={id} masterProductId={master?.id as string} />
          ) : tab === "listings" ? (
            <ListingsTab commercialProductId={id} />
          ) : (
            <HistoryTab commercialProductId={id} />
          )}
        </div>
      </section>
    </div>
  );
}

function readinessScoreClassName(score: number) {
  if (score >= 100) return "text-emerald-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function readinessLabelClassName(score: number) {
  if (score >= 100) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

function dimensionStatusClassName(status: ReadinessDimensionStatus) {
  if (status === "complete") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partial") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

// The headline "how close is this to publication" view -- computed fresh
// on every page load (never persisted, see resolve-readiness.ts), built
// on top of the same validation engine the Kaspi publication pipeline
// uses, but reorganized into business-readable dimensions and team
// ownership instead of internal validation codes.
function ReadinessSummary({ readiness }: { readiness: ProductReadiness }) {
  const blockingIssues = readiness.dimensions.flatMap((d) =>
    d.issues.filter((issue) => issue.severity === "blocking").map((issue) => ({ ...issue, dimension: d.dimension })),
  );
  const recommendedIssues = readiness.dimensions.flatMap((d) =>
    d.issues.filter((issue) => issue.severity === "recommended").map((issue) => ({ ...issue, dimension: d.dimension })),
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Готовность к публикации</h2>
          <p className="mt-1 text-xs text-slate-400">Насколько товар готов к публикации и почему — считается автоматически</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-3xl font-bold ${readinessScoreClassName(readiness.overallScore)}`}>
            {readiness.overallScore}%
          </span>
          <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${readinessLabelClassName(readiness.overallScore)}`}>
            {READINESS_LABEL_TEXT[readiness.label]}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-9">
        {readiness.dimensions.map((dimension) => (
          <div
            key={dimension.dimension}
            className={`rounded-xl border px-3 py-2 text-center ${dimensionStatusClassName(dimension.status)}`}
          >
            <div className="text-xs font-medium">{READINESS_DIMENSION_LABELS[dimension.dimension]}</div>
            <div className="mt-1 text-lg font-bold">{dimension.score}%</div>
          </div>
        ))}
      </div>

      {blockingIssues.length > 0 ? (
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600">
            Блокирует публикацию ({blockingIssues.length})
          </h3>
          <ul className="space-y-1.5">
            {blockingIssues.map((issue, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm">
                <span className="text-red-800">{issue.message}</span>
                <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-medium text-red-700">
                  {RESPONSIBLE_TEAM_LABELS[issue.team]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          Нет блокирующих проблем — товар можно публиковать.
        </p>
      )}

      {recommendedIssues.length > 0 ? (
        <div className="mt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Рекомендуется ({recommendedIssues.length})
          </h3>
          <ul className="space-y-1.5">
            {recommendedIssues.map((issue, i) => (
              <li key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{issue.message}</span>
                <span className="whitespace-nowrap rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                  {RESPONSIBLE_TEAM_LABELS[issue.team]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function GeneralTab({ product }: { product: any }) {
  const bundleComponents = (Array.isArray(product.bundle_components) ? product.bundle_components : []) as BundleComponent[];

  let bundleLines: { label: string; quantity: number }[] = [];
  if (bundleComponents.length > 0) {
    const supabase = createSupabaseAdminClient();
    const { data: dictionaryValues } = await supabase
      .from("attribute_dictionary_values")
      .select("id, display_label")
      .in(
        "id",
        bundleComponents.map((c) => c.dictionary_value_id),
      );
    const labelById = new Map((dictionaryValues ?? []).map((v) => [v.id as string, v.display_label as string]));
    bundleLines = bundleComponents.map((c) => ({
      label: labelById.get(c.dictionary_value_id) ?? c.dictionary_value_id,
      quantity: c.quantity,
    }));
  }

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Создан</dt>
          <dd className="font-medium text-slate-900">{formatDate(product.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Обновлён</dt>
          <dd className="font-medium text-slate-900">{formatDate(product.updated_at)}</dd>
        </div>
      </dl>
      <p className="text-xs text-slate-400">
        Готовность к публикации теперь считается автоматически — см. блок «Готовность к публикации» выше.
      </p>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Состав / комплектация</h3>
        {bundleLines.length > 0 ? (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {bundleLines.map((line, i) => (
              <div key={i}>
                <dt className="text-slate-500">{line.label}</dt>
                <dd className="font-medium text-slate-900">× {line.quantity}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            Стандартная комплектация (без дополнительных услуг/аксессуаров).
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Изменить статус</h3>
        <CommercialProductStatusForm
          commercialProductId={product.id}
          status={product.status}
          assortmentStatus={product.assortment_status}
        />
      </div>
    </div>
  );
}

async function PricingTab({
  commercialProductId,
  masterProductId,
}: {
  commercialProductId: string;
  masterProductId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const [{ data: offers }, { data: listings }, { data: strategy }, { data: costHistory }] = await Promise.all([
    supabase
      .from("supplier_offers")
      .select("purchase_price, product_condition, last_seen_at")
      .eq("product_id", masterProductId)
      .eq("product_condition", "new")
      .order("last_seen_at", { ascending: false })
      .limit(1),
    supabase
      .from("marketplace_listings")
      .select("id, sales_channel, current_sale_price")
      .eq("commercial_product_id", commercialProductId),
    supabase
      .from("pricing_strategies")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("supplier_offer_price_history")
      .select("purchase_price, stock_quantity, product_condition, recorded_at, supplier_product_id")
      .in(
        "supplier_product_id",
        (
          await supabase.from("supplier_offers").select("id").eq("product_id", masterProductId)
        ).data?.map((r) => r.id) ?? [],
      )
      .order("recorded_at", { ascending: false })
      .limit(20),
  ]);

  const listingIds = (listings ?? []).map((l) => l.id as string);
  const { data: channelHistory } =
    listingIds.length > 0
      ? await supabase
          .from("channel_price_history")
          .select("sale_price, previous_price, price_type, sales_channel, recorded_at")
          .in("channel_listing_id", listingIds)
          .order("recorded_at", { ascending: false })
          .limit(20)
      : { data: [] as { sale_price: number; previous_price: number | null; price_type: string; sales_channel: string; recorded_at: string }[] };

  const purchasePrice = offers?.[0]?.purchase_price ?? null;
  const salePrice = listings?.[0]?.current_sale_price ?? null;

  let marginBlock: React.ReactNode = (
    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
      {strategy ? "Недостаточно данных о цене закупки или продажи для расчёта маржи." : "Нет активной ценовой стратегии — создайте её на странице категорий."}
    </div>
  );

  if (strategy && purchasePrice !== null && salePrice !== null) {
    const costInputs = {
      salePrice,
      purchasePrice,
      commissionPercent: strategy.marketplace_commission_percent,
      logisticsCost: strategy.default_logistics_cost,
      advertisingPercent: strategy.default_advertising_percent,
      otherVariableCost: strategy.other_variable_cost,
    };
    const profit = calculateExpectedProfit(costInputs);
    const margin = calculateExpectedMargin(profit, salePrice);
    const status = classifyMarginStatus(margin, {
      targetMarginPercent: strategy.target_margin_percent,
      minimumMarginPercent: strategy.minimum_margin_percent,
    });
    const minPrice = calculateMinimumSalePrice({
      purchasePrice,
      commissionPercent: strategy.marketplace_commission_percent,
      logisticsCost: strategy.default_logistics_cost,
      advertisingPercent: strategy.default_advertising_percent,
      otherVariableCost: strategy.other_variable_cost,
      minimumMarginPercent: strategy.minimum_margin_percent,
      minimumProfitAmount: strategy.minimum_profit_amount,
    });
    const recommendedPrice = calculateRecommendedSalePrice({
      purchasePrice,
      commissionPercent: strategy.marketplace_commission_percent,
      logisticsCost: strategy.default_logistics_cost,
      advertisingPercent: strategy.default_advertising_percent,
      otherVariableCost: strategy.other_variable_cost,
      targetMarginPercent: strategy.target_margin_percent,
      roundingRule: strategy.rounding_rule,
    });

    marginBlock = (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Закупка</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(purchasePrice)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Текущая цена продажи</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(salePrice)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Рекомендуемая цена</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(recommendedPrice)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Минимальная цена</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(minPrice)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Ожидаемая прибыль</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(profit)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Ожидаемая маржа</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{margin.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Целевая маржа</div>
          <div className="mt-1 text-lg font-semibold text-slate-900">{strategy.target_margin_percent}%</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Статус маржи</div>
          <div className={`mt-1 inline-block rounded-full px-2.5 py-1 text-sm font-medium ${marginStatusClassName(status)}`}>
            {status}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
        Закупочная цена наследуется от базового товара через предложения поставщиков; цена продажи — с листингов
        этого коммерческого предложения. Стоимость комплектации (услуги/аксессуары) пока не учитывается в расчёте.
      </div>

      {marginBlock}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">История цен закупки (базовый товар)</h3>
        {costHistory && costHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                {costHistory.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-500">{formatDate(row.recorded_at)}</td>
                    <td className="px-3 py-2 text-slate-900">{formatMoney(row.purchase_price)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.stock_quantity ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.product_condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">История закупочной цены пуста.</p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">История цен продажи (по всем листингам)</h3>
        {channelHistory && channelHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Дата</th>
                  <th className="px-3 py-2 font-medium">Канал</th>
                  <th className="px-3 py-2 font-medium">Тип</th>
                  <th className="px-3 py-2 font-medium">Цена</th>
                  <th className="px-3 py-2 font-medium">Было</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {channelHistory.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-500">{formatDate(row.recorded_at)}</td>
                    <td className="px-3 py-2 text-slate-600">{row.sales_channel}</td>
                    <td className="px-3 py-2 text-slate-600">{row.price_type}</td>
                    <td className="px-3 py-2 text-slate-900">{formatMoney(row.sale_price)}</td>
                    <td className="px-3 py-2 text-slate-500">{formatMoney(row.previous_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">История цены продажи пуста.</p>
        )}
      </div>
    </div>
  );
}

async function ListingsTab({ commercialProductId }: { commercialProductId: string }) {
  const supabase = createSupabaseAdminClient();
  const [{ data: listings }, { data: strategies }] = await Promise.all([
    supabase
      .from("marketplace_listings")
      .select(
        "id, sales_channel, external_sku, title, listing_status, current_sale_price, last_synced_at, listing_strategy_id, listing_strategies ( name )",
      )
      .eq("commercial_product_id", commercialProductId)
      .order("last_synced_at", { ascending: false }),
    supabase.from("listing_strategies").select("id, name").eq("is_active", true).order("name"),
  ]);

  if (!listings || listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Нет привязанных листингов маркетплейсов. Много листингов могут ссылаться на один коммерческий товар
        (разные заголовки/фото/SEO/цена для одного и того же товара).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Канал</th>
            <th className="px-3 py-2 font-medium">Артикул</th>
            <th className="px-3 py-2 font-medium">Название</th>
            <th className="px-3 py-2 font-medium">Статус</th>
            <th className="px-3 py-2 font-medium">Цена</th>
            <th className="px-3 py-2 font-medium">Стратегия листинга</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {listings.map((listing) => {
            const strategy = Array.isArray(listing.listing_strategies)
              ? listing.listing_strategies[0]
              : listing.listing_strategies;
            return (
              <tr key={listing.id}>
                <td className="px-3 py-3 text-slate-900">{listing.sales_channel}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-600">{listing.external_sku}</td>
                <td className="px-3 py-3 text-slate-600">{listing.title}</td>
                <td className="px-3 py-3 text-slate-600">{listing.listing_status}</td>
                <td className="px-3 py-3 text-slate-600">{formatMoney(listing.current_sale_price)}</td>
                <td className="px-3 py-3">
                  <ListingStrategyAssign
                    listingId={listing.id}
                    currentStrategyId={listing.listing_strategy_id}
                    currentStrategyName={strategy?.name ?? null}
                    strategies={strategies ?? []}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function HistoryTab({ commercialProductId }: { commercialProductId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: history } = await supabase
    .from("product_status_history")
    .select("change_type, previous_value, new_value, reason, changed_by, created_at")
    .eq("commercial_product_id", commercialProductId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!history || history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        История изменений пуста.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {history.map((row, i) => (
        <li key={i} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900">
              {row.change_type}: {row.previous_value ?? "—"} → {row.new_value}
            </span>
            <span className="text-xs text-slate-400">{formatDate(row.created_at)}</span>
          </div>
          {row.reason ? <p className="mt-1 text-sm text-slate-600">{row.reason}</p> : null}
          <p className="mt-1 text-xs text-slate-400">{row.changed_by ?? "система"}</p>
        </li>
      ))}
    </ol>
  );
}
