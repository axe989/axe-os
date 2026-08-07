import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CatalogCategoriesPage() {
  const supabase = createSupabaseAdminClient();
  const { data: categories, error } = await supabase
    .from("product_categories")
    .select("id, name, slug, parent_id")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Категории</h2>
        <p className="mt-1 text-sm text-slate-500">
          Иерархия категорий. Схемы характеристик и шаблоны цен добавляются на следующем этапе.
        </p>

        <form
          action="/api/catalog/categories"
          method="POST"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Название категории</label>
            <input
              type="text"
              name="name"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="напр. Панельные радиаторы"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Родительская категория</label>
            <select name="parentId" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">— нет —</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Добавить
          </button>
        </form>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : categories && categories.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="ml-2 text-xs text-slate-400">/{c.slug}</span>
                {c.parent_id ? (
                  <span className="ml-2 text-xs text-slate-400">
                    (подкатегория: {categories.find((p) => p.id === c.parent_id)?.name ?? c.parent_id})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Категорий пока нет.
          </div>
        )}
      </section>
    </div>
  );
}
