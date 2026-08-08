import Link from "next/link";
import { getProductCard } from "@/lib/catalog/queries/product-card";
import { STAGE_COLUMNS, stageForStatus } from "@/lib/catalog/production/stages";
import LaunchChecklistTable from "./LaunchChecklistTable";

export const dynamic = "force-dynamic";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "не назначена";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductCardPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProductCard(id);
  const stage = STAGE_COLUMNS.find((c) => c.key === stageForStatus(data.status));

  const attributeEntries = Object.entries(data.technicalAttributes).filter(
    ([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
  );

  return (
    <div>
      <Link href="/product-center-v2/development" className="text-sm text-blue-600 hover:underline">
        ← Производство товара
      </Link>

      <header className="mt-2 mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{data.commercialName}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.brandName ?? "Бренд не указан"} · {data.manufacturerSku ?? "без артикула"} · {data.categoryName ?? "категория не указана"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">{data.checklist.completionPercent}%</div>
            <div className="text-xs text-slate-400">готовность чек-листа</div>
          </div>
        </div>

        {/* The four facts every commercial product must always show */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-400">Текущая стадия</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{stage?.label ?? data.status}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Следующее действие</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{data.nextActionLabel ?? "Готово к запуску"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Ответственный</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{data.nextActionTeam ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Целевая дата запуска</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(data.targetDate)}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* Left: media & documents */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Изображения</h3>
            {data.media.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {data.media.map((m, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-slate-200 bg-slate-50 p-1 text-center text-[10px] text-slate-400">
                    {m.role === "primary_image" ? "главное" : m.role === "infographic" ? "инфографика" : "галерея"}
                    <div className="mt-1 truncate font-mono text-[9px]">{m.storagePath}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Фотографии отсутствуют</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Документы</h3>
            {data.documents.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-slate-600">
                {data.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between">
                    <span>{d.documentType}</span>
                    <span className="text-slate-400">{d.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Нет требуемых документов для этой категории</p>
            )}
          </div>
        </div>

        {/* Center: supplier, specs, content, bundle, checklist */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Предложение поставщика</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><div className="text-xs text-slate-400">Поставщик</div><div className="font-medium text-slate-800">{data.supplierName ?? "—"}</div></div>
              <div><div className="text-xs text-slate-400">Закупочная цена</div><div className="font-medium text-slate-800">{formatMoney(data.purchasePrice)}</div></div>
              <div><div className="text-xs text-slate-400">Наличие</div><div className={data.supplierAvailable ? "font-medium text-emerald-600" : "font-medium text-red-500"}>{data.supplierAvailable ? "В наличии" : "Нет"}</div></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Технические характеристики</h3>
            {attributeEntries.length > 0 ? (
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {attributeEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-slate-400">{key}</dt>
                    <dd className="font-medium text-slate-800">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-400">Характеристики не заполнены</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Контент</h3>
            <div className="text-sm font-medium text-slate-800">{data.contentTitle ?? <span className="text-slate-400">Заголовок не написан</span>}</div>
            <p className="mt-1 text-sm text-slate-600">{data.contentDescription ?? <span className="text-slate-400">Описание не написано</span>}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Комплектация</h3>
            {data.bundleComponents.length > 0 ? (
              <p className="text-sm text-slate-600">{data.bundleComponents.length} компонент(ов) в бандле</p>
            ) : (
              <p className="text-xs text-slate-400">Стандартная комплектация, без дополнительных компонентов</p>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Чек-лист запуска</h3>
            <LaunchChecklistTable commercialProductId={data.commercialProductId} items={data.checklist.items} />
          </div>
        </div>

        {/* Right: marketplace, pricing, performance */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Цена и маржа</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Цена продажи</span><span className="font-medium text-slate-800">{formatMoney(data.salePrice)}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ожидаемая маржа</span>
                <span className="font-medium text-slate-800">{data.expectedMarginPercent !== null ? `${data.expectedMarginPercent.toFixed(1)}%` : "—"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Маркетплейсы</h3>
            {data.listings.length > 0 ? (
              <ul className="space-y-2">
                {data.listings.map((listing) => (
                  <li key={listing.id} className="rounded-lg bg-slate-50 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">{listing.salesChannel}</span>
                      <span className="text-slate-400">{listing.listingStatus}</span>
                    </div>
                    <div className="mt-0.5 text-slate-500">{listing.title ?? listing.externalSku ?? "—"}</div>
                    {listing.currentSalePrice !== null ? <div className="mt-0.5 font-medium text-slate-700">{formatMoney(listing.currentSalePrice)}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Ещё не опубликован ни на одной площадке</p>
            )}
          </div>

          <Link
            href={`/catalog/commercial-products/${data.commercialProductId}`}
            className="block rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600"
          >
            Открыть в текущем Товарном центре →
          </Link>
        </div>
      </div>
    </div>
  );
}
