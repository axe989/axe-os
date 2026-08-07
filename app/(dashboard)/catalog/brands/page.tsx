import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CatalogBrandsPage() {
  const supabase = createSupabaseAdminClient();
  const { data: brands, error } = await supabase
    .from("product_brands")
    .select("id, name, normalized_name")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Бренды</h2>
        <p className="mt-1 text-sm text-slate-500">
          Справочник брендов. Создаются автоматически при импорте и создании товаров.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : brands && brands.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {brands.map((b) => (
              <li key={b.id} className="rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-900">
                {b.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Брендов пока нет.
          </div>
        )}
      </section>
    </div>
  );
}
