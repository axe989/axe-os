import Link from "next/link";
import { listMarketplaceOverview } from "@/lib/catalog/queries/marketplace-overview";

export const dynamic = "force-dynamic";

export default async function MarketplaceOverviewPage() {
  const channels = await listMarketplaceOverview();

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Маркетплейсы</h2>
        <p className="mt-1 text-xs text-slate-500">
          Где и в каком представлении опубликован товар? Каждое число ниже кликабельно и открывает список конкретных листингов.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((channel) => (
          <div key={channel.channel} className={`rounded-2xl border p-5 ${channel.connected ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{channel.label}</h3>
              {!channel.connected ? (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">не подключён</span>
              ) : null}
            </div>

            {channel.connected ? (
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-400">Листингов на площадке</dt>
                  <dd className="font-semibold text-slate-800">
                    <Link href={`/product-center-v2/marketplace/listings?channel=${channel.channel}`} className="hover:underline">
                      {channel.listingCount}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-400">— из них активных</dt>
                  <dd className="font-semibold text-emerald-600">
                    <Link href={`/product-center-v2/marketplace/listings?channel=${channel.channel}&status=active`} className="hover:underline">
                      {channel.activeListingCount}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                  <dt className="text-slate-400">Сопоставлено с каталогом AXE</dt>
                  <dd className="font-semibold text-blue-700">
                    <Link href={`/product-center-v2/marketplace/listings?channel=${channel.channel}&reconciled=matched`} className="hover:underline">
                      {channel.reconciledListingCount}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-400">Ещё не сопоставлено</dt>
                  <dd className="font-semibold text-amber-600">
                    <Link href={`/product-center-v2/marketplace/listings?channel=${channel.channel}&reconciled=unmatched`} className="hover:underline">
                      {channel.listingCount - channel.reconciledListingCount}
                    </Link>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2.5">
                  <dt className="text-slate-400">Опубликовано через наш пайплайн</dt>
                  <dd className="font-semibold text-slate-800">{channel.publishedItemCount}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-slate-400">Заблокировано на публикации</dt>
                  <dd className={`font-semibold ${channel.blockedItemCount > 0 ? "text-red-600" : "text-slate-800"}`}>{channel.blockedItemCount}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-xs text-slate-400">
                Адаптер публикации для этой площадки ещё не подключён. Данные появятся, когда
                Publication Engine получит адаптер этого канала.
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        <p className="font-semibold text-slate-600">Что означают эти цифры?</p>
        <p className="mt-1">
          <strong>«Листингов на площадке»</strong> — реальные позиции, зафиксированные на маркетплейсе (например, из выгрузки
          инструмента репрайсинга или XML Kaspi), независимо от того, знает ли о них наш каталог.
          <strong className="ml-1">«Сопоставлено с каталогом AXE»</strong> — сколько из них реально привязаны к конкретному
          коммерческому товару в Product Center. Это два разных числа с разными знаменателями — не путайте их.
        </p>
      </div>
    </section>
  );
}
