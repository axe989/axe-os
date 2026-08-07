import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ASSORTMENT_LABELS: Record<string, string> = {
  active: "Активен",
  order_only: "Под заказ",
  candidate: "Кандидат",
  excluded: "Исключён",
  archived: "Архив",
};

const ASSORTMENT_FILTERS = [
  { value: "", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "candidate", label: "Кандидаты" },
  { value: "order_only", label: "Под заказ" },
  { value: "excluded", label: "Исключённые" },
  { value: "archived", label: "Архив" },
];

function assortmentClassName(value: string) {
  if (value === "active") return "bg-emerald-50 text-emerald-700";
  if (value === "candidate") return "bg-amber-50 text-amber-700";
  if (value === "order_only") return "bg-blue-50 text-blue-700";
  if (value === "excluded" || value === "archived") return "bg-slate-100 text-slate-500";
  return "bg-slate-100 text-slate-600";
}

type PageProps = { searchParams: Promise<{ assortment?: string; q?: string }> };

export default async function CatalogProductsPage({ searchParams }: PageProps) {
  const { assortment, q } = await searchParams;
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("product_master")
    .select(
      "id, name, internal_sku, manufacturer_sku, status, assortment_status, product_brands ( name )",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (assortment) {
    query = query.eq("assortment_status", assortment);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: products, error } = await query;

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Товары</h2>
            <p className="mt-1 text-sm text-slate-500">Мастер-каталог AXE OS</p>
          </div>
          <form action="/catalog/products" className="flex gap-2">
            {assortment ? <input type="hidden" name="assortment" value={assortment} /> : null}
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Поиск по названию…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              Найти
            </button>
          </form>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {ASSORTMENT_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/catalog/products?assortment=${f.value}` : "/catalog/products"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                (assortment ?? "") === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : products && products.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Бренд</th>
                  <th className="px-3 py-2 font-medium">Артикул</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Ассортимент</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((p) => {
                  const brand = Array.isArray(p.product_brands) ? p.product_brands[0] : p.product_brands;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <Link href={`/catalog/products/${p.id}`} className="font-semibold text-blue-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{brand?.name ?? "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">
                        {p.manufacturer_sku ?? p.internal_sku ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{p.status}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${assortmentClassName(p.assortment_status)}`}
                        >
                          {ASSORTMENT_LABELS[p.assortment_status] ?? p.assortment_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Товаров пока нет. Создайте их из очереди «Отсутствующие товары».
          </div>
        )}
      </section>
    </div>
  );
}
