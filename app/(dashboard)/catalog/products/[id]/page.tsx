import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  calculateExpectedMargin,
  calculateExpectedProfit,
  calculateMinimumSalePrice,
  calculateRecommendedSalePrice,
  classifyMarginStatus,
} from "@/lib/catalog/pricing/margin";
import ProductStatusForm from "./ProductStatusForm";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "general", label: "Общее" },
  { key: "attributes", label: "Характеристики" },
  { key: "suppliers", label: "Поставщики" },
  { key: "pricing", label: "Цены и маржа" },
  { key: "channels", label: "Каналы продаж" },
  { key: "content", label: "Контент" },
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

export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? rawTab! : "general";
  const supabase = createSupabaseAdminClient();

  const { data: product, error } = await supabase
    .from("product_master")
    .select("*, product_brands ( id, name ), product_categories ( id, name )")
    .eq("id", id)
    .single();

  if (error || !product) {
    return (
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          Товар не найден: {error?.message}
        </div>
      </div>
    );
  }

  const brand = Array.isArray(product.product_brands) ? product.product_brands[0] : product.product_brands;
  const category = Array.isArray(product.product_categories)
    ? product.product_categories[0]
    : product.product_categories;

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <Link href="/catalog/products" className="text-sm text-blue-700 hover:underline">
        ← Все товары
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {brand?.name ?? "Бренд не указан"} {category?.name ? `· ${category.name}` : ""}
          {product.manufacturer_sku ? ` · ${product.manufacturer_sku}` : ""}
        </p>

        <nav className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/catalog/products/${id}?tab=${t.key}`}
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
            <GeneralTab product={product} />
          ) : tab === "attributes" ? (
            <AttributesTab product={product} />
          ) : tab === "suppliers" ? (
            <SuppliersTab productId={id} />
          ) : tab === "pricing" ? (
            <PricingTab productId={id} />
          ) : tab === "channels" ? (
            <ChannelsTab productId={id} />
          ) : tab === "content" ? (
            <ContentTab />
          ) : (
            <HistoryTab productId={id} />
          )}
        </div>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GeneralTab({ product }: { product: any }) {
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Внутренний SKU</dt>
          <dd className="font-medium text-slate-900">{product.internal_sku ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Артикул производителя</dt>
          <dd className="font-medium text-slate-900">{product.manufacturer_sku ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">EAN</dt>
          <dd className="font-medium text-slate-900">{product.ean ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Серия</dt>
          <dd className="font-medium text-slate-900">{product.series ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Статус контента</dt>
          <dd className="font-medium text-slate-900">{product.content_status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Готовность публикации</dt>
          <dd className="font-medium text-slate-900">{product.publication_readiness}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Создан</dt>
          <dd className="font-medium text-slate-900">{formatDate(product.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Обновлён</dt>
          <dd className="font-medium text-slate-900">{formatDate(product.updated_at)}</dd>
        </div>
      </dl>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Изменить статус</h3>
        <ProductStatusForm
          productId={product.id}
          status={product.status}
          assortmentStatus={product.assortment_status}
        />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AttributesTab({ product }: { product: any }) {
  const attrs = (product.technical_attributes ?? {}) as Record<string, unknown>;
  const entries = Object.entries(attrs).filter(([, v]) => v !== null && v !== undefined && v !== "");

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Характеристики ещё не заполнены.
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-slate-500">{key}</dt>
          <dd className="font-medium text-slate-900">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

async function SuppliersTab({ productId }: { productId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: offers } = await supabase
    .from("supplier_offers")
    .select(
      "id, supplier_sku, purchase_price, stock_quantity, product_condition, lead_time_days, is_order_only, last_seen_at, suppliers ( name )",
    )
    .eq("product_id", productId)
    .order("last_seen_at", { ascending: false });

  if (!offers || offers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Нет связанных предложений поставщиков.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Поставщик</th>
            <th className="px-3 py-2 font-medium">Артикул</th>
            <th className="px-3 py-2 font-medium">Закупка</th>
            <th className="px-3 py-2 font-medium">Остаток</th>
            <th className="px-3 py-2 font-medium">Состояние</th>
            <th className="px-3 py-2 font-medium">Обновлено</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {offers.map((offer) => {
            const supplier = Array.isArray(offer.suppliers) ? offer.suppliers[0] : offer.suppliers;
            return (
              <tr key={offer.id}>
                <td className="px-3 py-3 text-slate-900">{supplier?.name ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-600">{offer.supplier_sku}</td>
                <td className="px-3 py-3 text-slate-600">{formatMoney(offer.purchase_price)}</td>
                <td className="px-3 py-3 text-slate-600">{offer.stock_quantity ?? "—"}</td>
                <td className="px-3 py-3 text-slate-600">{offer.product_condition}</td>
                <td className="px-3 py-3 text-slate-500">{formatDate(offer.last_seen_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ChannelsTab({ productId }: { productId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: listings } = await supabase
    .from("channel_listings")
    .select("id, sales_channel, external_sku, title, listing_status, current_sale_price, last_synced_at")
    .eq("product_id", productId)
    .order("last_synced_at", { ascending: false });

  if (!listings || listings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Нет привязанных позиций каналов продаж.
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {listings.map((listing) => (
            <tr key={listing.id}>
              <td className="px-3 py-3 text-slate-900">{listing.sales_channel}</td>
              <td className="px-3 py-3 font-mono text-xs text-slate-600">{listing.external_sku}</td>
              <td className="px-3 py-3 text-slate-600">{listing.title}</td>
              <td className="px-3 py-3 text-slate-600">{listing.listing_status}</td>
              <td className="px-3 py-3 text-slate-600">{formatMoney(listing.current_sale_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentTab() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
      Контент и публикация карточек будут добавлены на следующем этапе.
      <br />
      Порядок: проверенные характеристики → генерация контента → проверка человеком → согласование → публикация.
    </div>
  );
}

async function PricingTab({ productId }: { productId: string }) {
  const supabase = createSupabaseAdminClient();

  const [{ data: offers }, { data: listings }, { data: strategy }, { data: offerHistory }, { data: channelHistory }] =
    await Promise.all([
      supabase
        .from("supplier_offers")
        .select("purchase_price, product_condition, last_seen_at, suppliers ( name )")
        .eq("product_id", productId)
        .eq("product_condition", "new")
        .order("last_seen_at", { ascending: false })
        .limit(1),
      supabase
        .from("channel_listings")
        .select("id, sales_channel, current_sale_price")
        .eq("product_id", productId),
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
            await supabase.from("supplier_offers").select("id").eq("product_id", productId)
          ).data?.map((r) => r.id) ?? [],
        )
        .order("recorded_at", { ascending: false })
        .limit(20),
      supabase
        .from("channel_price_history")
        .select("sale_price, previous_price, price_type, sales_channel, recorded_at")
        .eq("product_id", productId)
        .order("recorded_at", { ascending: false })
        .limit(20),
    ]);

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
      {marginBlock}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">История цен закупки</h3>
        {offerHistory && offerHistory.length > 0 ? (
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
                {offerHistory.map((row, i) => (
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
        <h3 className="mb-3 text-sm font-semibold text-slate-700">История цен продажи</h3>
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

async function HistoryTab({ productId }: { productId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: history } = await supabase
    .from("product_status_history")
    .select("change_type, previous_value, new_value, reason, changed_by, created_at")
    .eq("product_id", productId)
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
