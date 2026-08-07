import Link from "next/link";
import { listPublicationItems } from "@/lib/catalog/queries/publications";
import ExportButton from "./ExportButton";
import ReconcileXmlForm from "./ReconcileXmlForm";

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

function statusClassName(status: string) {
  switch (status) {
    case "ready_for_export":
      return "bg-emerald-50 text-emerald-700";
    case "content_incomplete":
      return "bg-amber-50 text-amber-700";
    case "needs_review":
      return "bg-purple-50 text-purple-700";
    case "exported":
    case "uploaded":
      return "bg-blue-50 text-blue-700";
    case "published":
      return "bg-emerald-100 text-emerald-800";
    case "publication_error":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(
    new Date(value),
  );
}

export default async function PublicationsPage() {
  const items = await listPublicationItems();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Публикации на маркетплейсы</h1>
          <p className="mt-1 text-sm text-slate-500">Kaspi Publication Pipeline — от Supplier Offer до Kaspi CSV</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <ExportButton salesChannel="kaspi" />
          <ReconcileXmlForm salesChannel="kaspi" />
          <Link
            href="/catalog/publications/new"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Новая публикация
          </Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Коммерческий товар</th>
              <th className="px-4 py-3">Контент-вариант</th>
              <th className="px-4 py-3">Канал</th>
              <th className="px-4 py-3">Артикул продавца</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Ошибки</th>
              <th className="px-4 py-3">Создано</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/catalog/publications/${item.id}`} className="font-medium text-blue-600 hover:underline">
                    {item.commercialProductName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.contentVariantTitle ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{item.salesChannel}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.sellerSku ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(item.status)}`}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.validationErrorCount > 0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {item.validationErrorCount}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.createdAt)}</td>
              </tr>
            ))}

            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Публикаций пока нет
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
