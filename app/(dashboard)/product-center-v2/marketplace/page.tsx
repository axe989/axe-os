import { listMarketplaceOverview } from "@/lib/catalog/queries/marketplace-overview";

export const dynamic = "force-dynamic";

export default async function MarketplaceOverviewPage() {
  const channels = await listMarketplaceOverview();

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Маркетплейсы</h2>
        <p className="mt-1 text-xs text-slate-500">Состояние публикации по каждой площадке.</p>
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
                <div className="flex justify-between"><dt className="text-slate-400">Листингов</dt><dd className="font-semibold text-slate-800">{channel.listingCount}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Активных</dt><dd className="font-semibold text-emerald-600">{channel.activeListingCount}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Опубликовано (пайплайн)</dt><dd className="font-semibold text-slate-800">{channel.publishedItemCount}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-400">Заблокировано</dt><dd className={`font-semibold ${channel.blockedItemCount > 0 ? "text-red-600" : "text-slate-800"}`}>{channel.blockedItemCount}</dd></div>
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
    </section>
  );
}
