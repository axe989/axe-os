import Link from "next/link";
import { getPublicationItemDetail } from "@/lib/catalog/queries/publications";
import { KASPI_COLUMNS } from "@/lib/catalog/publication/adapters/kaspi-csv";
import PublicationActions from "./PublicationActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  content_incomplete: "Не хватает контента",
  needs_review: "Требует проверки",
  ready_for_export: "Готово к экспорту",
  exported: "Экспортировано",
  uploaded: "Загружено в Kaspi",
  published: "Опубликовано",
  publication_error: "Ошибка публикации",
  archived: "Архив",
};

const MODE_LABELS: Record<string, string> = {
  create_new_listing: "Создание нового листинга",
  join_existing_listing: "Присоединение к листингу",
  update_existing_listing: "Обновление листинга",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function PublicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getPublicationItemDetail(id);
  const { resolved } = detail;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/catalog/publications" className="text-sm text-blue-600 hover:underline">
        ← Все публикации
      </Link>

      <header className="mb-6 mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{detail.commercialProductName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {MODE_LABELS[detail.publicationMode] ?? detail.publicationMode} · канал: {detail.salesChannel} · вариант:{" "}
            {detail.contentVariantTitle}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {STATUS_LABELS[detail.status] ?? detail.status}
        </span>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Действия</h2>
        <PublicationActions
          publicationItemId={detail.id}
          status={detail.status}
          hasValidationErrors={resolved.validationErrors.length > 0}
        />
        {detail.approvedAt ? (
          <p className="mt-3 text-xs text-slate-500">
            Утверждено {detail.approvedBy ?? "—"} в {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.approvedAt))}
          </p>
        ) : null}
      </section>

      {resolved.validationErrors.length > 0 ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-700">
            Ошибки валидации ({resolved.validationErrors.length})
          </h2>
          <ul className="space-y-1 text-sm text-red-700">
            {resolved.validationErrors.map((err, index) => (
              <li key={`${err.code}-${index}`}>
                <span className="font-mono text-xs text-red-500">[{err.field ?? err.code}]</span> {err.message}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          Ошибок валидации нет — позиция готова к экспорту.
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Превью публикации</h2>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Артикул продавца</dt>
            <dd className="font-mono text-sm text-slate-900">{resolved.sellerSku ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Бренд</dt>
            <dd className="text-sm text-slate-900">{resolved.context.brand ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Заголовок</dt>
            <dd className="text-sm text-slate-900">{resolved.context.title ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Описание</dt>
            <dd className="whitespace-pre-wrap text-sm text-slate-900">{resolved.context.description ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium text-slate-500">Изображения</dt>
            <dd className="text-sm text-slate-900">
              {resolved.mediaResolution
                ? `Набор медиа унаследован от: ${
                    resolved.mediaResolution.resolvedFrom === "content_variant"
                      ? "контент-варианта"
                      : resolved.mediaResolution.resolvedFrom === "commercial_product"
                        ? "коммерческого товара"
                        : "базового товара"
                  }`
                : "Медиа не найдено"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Сгенерированные поля Kaspi CSV
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Поле</th>
                <th className="py-2 pr-4">Обязательное</th>
                <th className="py-2">Значение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {KASPI_COLUMNS.map((column) => (
                <tr key={column.key}>
                  <td className="py-2 pr-4 text-slate-600">{column.label}</td>
                  <td className="py-2 pr-4">
                    {column.required ? (
                      <span className="text-xs font-semibold text-red-600">да</span>
                    ) : (
                      <span className="text-xs text-slate-400">нет</span>
                    )}
                  </td>
                  <td className="py-2 font-mono text-xs text-slate-900">
                    {resolved.row[column.key] || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
