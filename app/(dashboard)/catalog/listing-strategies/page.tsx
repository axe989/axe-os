import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SUGGESTED_PURPOSES = [
  "primary",
  "alternative",
  "premium",
  "seasonal",
  "seo_experiment",
  "bundle_experiment",
  "conversion_test",
];

export default async function ListingStrategiesPage() {
  const supabase = createSupabaseAdminClient();
  const { data: strategies, error } = await supabase
    .from("listing_strategies")
    .select("id, name, purpose, is_ab_test, expected_audience, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Стратегии листингов</h2>
        <p className="mt-1 text-sm text-slate-500">
          Уровень 4: группировка листингов маркетплейсов по назначению (основной, альтернативный, сезонный,
          A/B-эксперимент). Назначается листингу на странице коммерческого товара.
        </p>

        <form
          action="/api/catalog/listing-strategies"
          method="POST"
          className="mt-6 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Название</label>
            <input
              type="text"
              name="name"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="напр. Основной листинг зима 2026"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Назначение</label>
            <input
              type="text"
              name="purpose"
              list="purpose-suggestions"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="primary / seasonal / ..."
            />
            <datalist id="purpose-suggestions">
              {SUGGESTED_PURPOSES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Ожидаемая аудитория</label>
            <input
              type="text"
              name="expectedAudience"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isAbTest" className="h-4 w-4" />
            A/B-тест
          </label>
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
        ) : strategies && strategies.length > 0 ? (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Назначение</th>
                  <th className="px-3 py-2 font-medium">Аудитория</th>
                  <th className="px-3 py-2 font-medium">A/B</th>
                  <th className="px-3 py-2 font-medium">Активна</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {strategies.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-3 py-3 text-slate-600">{s.purpose ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{s.expected_audience ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{s.is_ab_test ? "Да" : "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{s.is_active ? "Да" : "Нет"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Стратегий пока нет.
          </div>
        )}
      </section>
    </div>
  );
}
