import { createClient } from "@/lib/supabase/server";

type Supplier = {
  id: string;
  name: string;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data: suppliers, error } = await supabase
    .from("suppliers")
    .select("id, name, legal_name, phone, email, is_active")
    .order("name");

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Поставщики
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Данные загружены непосредственно из Supabase.
            </p>
          </div>

          <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {suppliers?.length ?? 0}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : suppliers && suppliers.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Название</th>
                  <th className="px-4 py-3 font-medium">Юридическое лицо</th>
                  <th className="px-4 py-3 font-medium">Телефон</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {suppliers.map((supplier: Supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-4 py-4 font-semibold">
                      {supplier.name}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {supplier.legal_name ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {supplier.phone ?? "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={
                          supplier.is_active
                            ? "rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
                        }
                      >
                        {supplier.is_active ? "Активен" : "Отключён"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Поставщики пока не добавлены.
          </div>
        )}
      </section>
    </div>
  );
}
