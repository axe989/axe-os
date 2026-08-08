import Link from "next/link";
import { getSupplierOfferDetail } from "@/lib/catalog/queries/supplier-offer-detail";
import SupplierOfferActions from "./SupplierOfferActions";

export const dynamic = "force-dynamic";

const DECISION_LABELS: Record<string, string> = {
  pending: "Решение не принято",
  accepted: "Добавлено в ассортимент",
  rejected: "Не добавлено",
  postponed: "Отложено",
  ignored: "Проигнорировано",
};

function decisionClassName(decision: string) {
  switch (decision) {
    case "accepted":
      return "bg-emerald-50 text-emerald-700";
    case "rejected":
      return "bg-red-50 text-red-700";
    case "postponed":
      return "bg-amber-50 text-amber-700";
    case "ignored":
      return "bg-slate-100 text-slate-500";
    default:
      return "bg-blue-50 text-blue-700";
  }
}

function formatMoney(value: number | null, currency: string) {
  if (value === null) return "не передана поставщиком";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value)} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(new Date(value));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function SupplierOfferDetailPage({ params }: PageProps) {
  const { id } = await params;
  const offer = await getSupplierOfferDetail(id);

  const attributeEntries = Object.entries(offer.supplierTechnicalAttributes).filter(
    ([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
  );

  return (
    <div>
      <Link href="/product-center-v2/supplier-feed" className="text-sm text-blue-600 hover:underline">
        ← Предложения поставщиков
      </Link>

      <header className="mt-2 mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{offer.masterProductName ?? offer.nameRaw ?? "Без названия"}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {offer.supplierName} · артикул поставщика {offer.supplierSku ?? "не указан"}
              {offer.manufacturerSku ? ` · артикул производителя ${offer.manufacturerSku}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${decisionClassName(offer.assortmentDecision)}`}>
            {DECISION_LABELS[offer.assortmentDecision] ?? offer.assortmentDecision}
          </span>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <SupplierOfferActions
            supplierOfferId={offer.id}
            decision={offer.assortmentDecision}
            masterProductId={offer.masterProductId}
            masterProductName={offer.masterProductName}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Предложение поставщика</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-slate-400">Поставщик</dt><dd className="font-medium text-slate-800">{offer.supplierName}</dd></div>
              <div><dt className="text-xs text-slate-400">Артикул поставщика</dt><dd className="font-medium text-slate-800">{offer.supplierSku ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate-400">Артикул производителя</dt><dd className="font-medium text-slate-800">{offer.manufacturerSku ?? "не определён"}</dd></div>
              <div><dt className="text-xs text-slate-400">Закупочная цена</dt><dd className="font-medium text-slate-800">{formatMoney(offer.purchasePrice, offer.currency)}</dd></div>
              <div>
                <dt className="text-xs text-slate-400">Наличие у поставщика</dt>
                <dd className={offer.isAvailable ? "font-medium text-emerald-600" : "font-medium text-red-500"}>
                  {offer.isAvailable ? "В наличии" : "Нет в наличии"}
                  {offer.stockQuantity !== null ? ` · ${offer.stockQuantity} шт.` : ""}
                </dd>
              </div>
              <div><dt className="text-xs text-slate-400">Последнее обновление от поставщика</dt><dd className="font-medium text-slate-800">{formatDate(offer.lastSeenAt)}</dd></div>
              <div><dt className="text-xs text-slate-400">Бренд</dt><dd className="font-medium text-slate-800">{offer.brandName ?? offer.brandRaw ?? "не определён"}</dd></div>
              <div><dt className="text-xs text-slate-400">Категория</dt><dd className="font-medium text-slate-800">{offer.categoryName ?? "не определена"}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Источник данных</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-slate-400">Файл импорта</dt><dd className="font-medium text-slate-800">{offer.importFileName ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate-400">Лист / раздел</dt><dd className="font-medium text-slate-800">{offer.importWorksheetName ?? "—"}</dd></div>
              <div><dt className="text-xs text-slate-400">Импорт завершён</dt><dd className="font-medium text-slate-800">{formatDate(offer.importCompletedAt)}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Технические данные от поставщика</h3>
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
              <p className="text-xs text-slate-400">Поставщик не передал технические характеристики вместе с этой позицией</p>
            )}
          </div>

          {offer.assortmentDecision !== "pending" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Решение по ассортименту</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-slate-400">Решение</dt><dd className="font-medium text-slate-800">{DECISION_LABELS[offer.assortmentDecision]}</dd></div>
                <div><dt className="text-xs text-slate-400">Кем принято</dt><dd className="font-medium text-slate-800">{offer.assortmentDecisionBy ?? "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Когда</dt><dd className="font-medium text-slate-800">{formatDate(offer.assortmentDecisionAt)}</dd></div>
                {offer.assortmentDecisionReason ? (
                  <div className="col-span-full"><dt className="text-xs text-slate-400">Комментарий</dt><dd className="font-medium text-slate-800">{offer.assortmentDecisionReason}</dd></div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Базовый товар (Master Product)</h3>
            {offer.masterProductId ? (
              <p className="text-sm text-slate-700">{offer.masterProductName}</p>
            ) : (
              <p className="text-xs text-slate-400">Ещё не создан — решение по ассортименту не принято</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Коммерческие товары и маркетплейс</h3>
            {offer.commercialProducts.length > 0 ? (
              <ul className="space-y-2">
                {offer.commercialProducts.map((cp) => (
                  <li key={cp.id} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                    <Link href={`/product-center-v2/development/${cp.id}`} className="font-semibold text-blue-700 hover:underline">
                      {cp.commercialName}
                    </Link>
                    <div className="mt-1 flex items-center justify-between text-slate-500">
                      <span>{cp.stageLabel}</span>
                      <span>{cp.listingCount > 0 ? `${cp.listingCount} листинг(ов)` : "не опубликован"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Коммерческий товар ещё не создан</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
