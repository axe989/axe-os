import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import MatchRowActions from "./MatchRowActions";
import BulkConfirmButton from "./BulkConfirmButton";
import ListingMatchRowActions from "./ListingMatchRowActions";
import ListingBulkConfirmButton from "./ListingBulkConfirmButton";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "", label: "Все" },
  { value: "matched", label: "Сопоставлено" },
  { value: "probable", label: "Вероятные" },
  { value: "conflict", label: "Конфликты" },
  { value: "missing", label: "Отсутствуют" },
  { value: "ignored", label: "Игнорируется" },
];

const ENTITY_TABS = [
  { value: "supplier", label: "Поставщики → Master Product" },
  { value: "listing", label: "Kaspi листинги → Commercial Product" },
];

function statusClassName(status: string) {
  if (status === "matched") return "bg-emerald-50 text-emerald-700";
  if (status === "probable") return "bg-amber-50 text-amber-700";
  if (status === "conflict") return "bg-red-50 text-red-700";
  if (status === "missing") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-500";
}

type PageProps = { searchParams: Promise<{ status?: string; entity?: string }> };

export default async function CatalogMatchingPage({ searchParams }: PageProps) {
  const { status, entity: rawEntity } = await searchParams;
  const entity = rawEntity === "listing" ? "listing" : "supplier";

  const entityQueryString = (target: "supplier" | "listing", statusValue?: string) => {
    const params = new URLSearchParams();
    if (target === "listing") params.set("entity", "listing");
    if (statusValue) params.set("status", statusValue);
    const qs = params.toString();
    return qs ? `/catalog/matching?${qs}` : "/catalog/matching";
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Сопоставление</h2>
            <p className="mt-1 text-sm text-slate-500">
              Уровень 1→1: поставщики к Master Product · Уровень 3→2: листинги маркетплейсов к Commercial Product
            </p>
          </div>
          {entity === "supplier" ? <BulkConfirmButton /> : <ListingBulkConfirmButton />}
        </div>

        <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {ENTITY_TABS.map((t) => (
            <Link
              key={t.value}
              href={entityQueryString(t.value as "supplier" | "listing", status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                entity === t.value ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={entityQueryString(entity, f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                (status ?? "") === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {entity === "supplier" ? (
          <SupplierMatchTable statusFilter={status} />
        ) : (
          <ListingMatchTable statusFilter={status} />
        )}
      </section>
    </div>
  );
}

async function SupplierMatchTable({ statusFilter }: { statusFilter?: string }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("product_matches")
    .select(
      `id, match_status, match_method, confidence_score, match_reasons, reviewed_by, reviewed_at,
       supplier_offers ( id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, stock_quantity, product_condition ),
       product_master ( id, name, manufacturer_sku )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) {
    query = query.eq("match_status", statusFilter);
  }

  const { data: matches, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Ошибка загрузки: {error.message}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Нет данных для выбранного фильтра.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Предложение поставщика</th>
            <th className="px-3 py-2 font-medium">Master Product</th>
            <th className="px-3 py-2 font-medium">Статус</th>
            <th className="px-3 py-2 font-medium">Метод / уверенность</th>
            <th className="px-3 py-2 font-medium">Обоснование</th>
            <th className="px-3 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {matches.map((row) => {
            const offer = Array.isArray(row.supplier_offers) ? row.supplier_offers[0] : row.supplier_offers;
            const product = Array.isArray(row.product_master) ? row.product_master[0] : row.product_master;

            return (
              <tr key={row.id}>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-900">{offer?.supplier_name_raw ?? "—"}</div>
                  <div className="text-xs text-slate-500">
                    {offer?.supplier_sku} · {offer?.product_condition} · остаток {offer?.stock_quantity ?? "—"}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {product ? (
                    <Link href={`/catalog/products/${product.id}`} className="text-blue-700 hover:underline">
                      {product.name}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(row.match_status)}`}>
                    {row.match_status}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {row.match_method}
                  {row.confidence_score !== null ? ` · ${Number(row.confidence_score).toFixed(2)}` : ""}
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {Array.isArray(row.match_reasons) ? row.match_reasons.join("; ") : ""}
                </td>
                <td className="px-3 py-3">
                  <MatchRowActions matchId={row.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ListingMatchTable({ statusFilter }: { statusFilter?: string }) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("listing_matches")
    .select(
      `id, match_status, match_method, confidence_score, match_reasons, reviewed_by, reviewed_at,
       marketplace_listings ( id, sales_channel, external_sku, title, current_sale_price ),
       commercial_products ( id, commercial_name )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) {
    query = query.eq("match_status", statusFilter);
  }

  const { data: matches, error } = await query;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        Ошибка загрузки: {error.message}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Нет данных для выбранного фильтра.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Листинг маркетплейса</th>
            <th className="px-3 py-2 font-medium">Commercial Product</th>
            <th className="px-3 py-2 font-medium">Статус</th>
            <th className="px-3 py-2 font-medium">Метод / уверенность</th>
            <th className="px-3 py-2 font-medium">Обоснование</th>
            <th className="px-3 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {matches.map((row) => {
            const listing = Array.isArray(row.marketplace_listings)
              ? row.marketplace_listings[0]
              : row.marketplace_listings;
            const commercialProduct = Array.isArray(row.commercial_products)
              ? row.commercial_products[0]
              : row.commercial_products;

            return (
              <tr key={row.id}>
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-900">{listing?.title ?? "—"}</div>
                  <div className="text-xs text-slate-500">
                    {listing?.sales_channel} · {listing?.external_sku}
                  </div>
                </td>
                <td className="px-3 py-3">
                  {commercialProduct ? (
                    <Link
                      href={`/catalog/commercial-products/${commercialProduct.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {commercialProduct.commercial_name}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClassName(row.match_status)}`}>
                    {row.match_status}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {row.match_method}
                  {row.confidence_score !== null ? ` · ${Number(row.confidence_score).toFixed(2)}` : ""}
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {Array.isArray(row.match_reasons) ? row.match_reasons.join("; ") : ""}
                </td>
                <td className="px-3 py-3">
                  <ListingMatchRowActions matchId={row.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
