import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import CreateCommercialProductForm from "./CreateCommercialProductForm";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "general", label: "Общее" },
  { key: "attributes", label: "Характеристики" },
  { key: "suppliers", label: "Поставщики" },
  { key: "commercial", label: "Коммерческие товары" },
];

const ASSORTMENT_LABELS: Record<string, string> = {
  active: "Активен",
  order_only: "Под заказ",
  candidate: "Кандидат",
  excluded: "Исключён",
  archived: "Архив",
};

function assortmentClassName(value: string) {
  if (value === "active") return "bg-emerald-50 text-emerald-700";
  if (value === "candidate") return "bg-amber-50 text-amber-700";
  if (value === "order_only") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-500";
}

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
          Master Product (объективные факты производителя) · {brand?.name ?? "Бренд не указан"}{" "}
          {category?.name ? `· ${category.name}` : ""}
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
          ) : (
            <CommercialProductsTab masterProductId={id} defaultName={product.name as string} />
          )}
        </div>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GeneralTab({ product }: { product: any }) {
  return (
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
        <dt className="text-slate-500">Тип товара</dt>
        <dd className="font-medium text-slate-900">{product.product_type ?? "—"}</dd>
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

// One Master Product may produce many Commercial Products (spec example:
// Gree Bora 07 -> without installation / with standard installation /
// with WiFi module / ...).
async function CommercialProductsTab({
  masterProductId,
  defaultName,
}: {
  masterProductId: string;
  defaultName: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: commercialProducts } = await supabase
    .from("commercial_products")
    .select("id, commercial_name, status, assortment_status, created_at")
    .eq("master_product_id", masterProductId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {commercialProducts && commercialProducts.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Коммерческое название</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Ассортимент</th>
                <th className="px-3 py-2 font-medium">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {commercialProducts.map((cp) => (
                <tr key={cp.id}>
                  <td className="px-3 py-3">
                    <Link
                      href={`/catalog/commercial-products/${cp.id}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {cp.commercial_name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{cp.status}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${assortmentClassName(cp.assortment_status)}`}>
                      {ASSORTMENT_LABELS[cp.assortment_status] ?? cp.assortment_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">{formatDate(cp.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          У этого товара пока нет коммерческих упаковок.
        </div>
      )}

      <div className="border-t border-slate-100 pt-6">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Добавить коммерческий товар</h3>
        <CreateCommercialProductForm masterProductId={masterProductId} defaultName={defaultName} />
      </div>
    </div>
  );
}
