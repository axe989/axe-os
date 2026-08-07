import { createSupabaseAdminClient } from "@/lib/supabase/server";
import MissingRowActions from "./MissingRowActions";
import MissingListingActions from "./MissingListingActions";

export const dynamic = "force-dynamic";

export default async function MissingProductsPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: matches, error }, { data: listingMatches, error: listingError }] = await Promise.all([
    supabase
      .from("product_matches")
      .select(
        `id, supplier_product_id,
         supplier_offers ( id, supplier_sku, supplier_name_raw, supplier_brand_raw, purchase_price, stock_quantity, product_condition, is_order_only )`,
      )
      .eq("match_status", "missing")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("listing_matches")
      .select(
        `id, marketplace_listing_id,
         marketplace_listings ( id, sales_channel, external_sku, title, current_sale_price )`,
      )
      .eq("match_status", "missing")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Отсутствующие товары поставщиков</h2>
          <p className="mt-1 text-sm text-slate-500">
            Есть у поставщика, но ещё нет Master Product в каталоге
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {error.message}
          </div>
        ) : matches && matches.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Артикул</th>
                  <th className="px-3 py-2 font-medium">Наименование поставщика</th>
                  <th className="px-3 py-2 font-medium">Бренд</th>
                  <th className="px-3 py-2 font-medium">Закупка</th>
                  <th className="px-3 py-2 font-medium">Остаток / состояние</th>
                  <th className="px-3 py-2 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matches.map((row) => {
                  const offer = Array.isArray(row.supplier_offers)
                    ? row.supplier_offers[0]
                    : row.supplier_offers;
                  if (!offer) return null;

                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{offer.supplier_sku}</td>
                      <td className="px-3 py-3 text-slate-900">{offer.supplier_name_raw}</td>
                      <td className="px-3 py-3 text-slate-600">{offer.supplier_brand_raw ?? "—"}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {offer.purchase_price !== null ? Number(offer.purchase_price).toLocaleString("ru-RU") : "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {offer.stock_quantity ?? "—"} · {offer.product_condition}
                      </td>
                      <td className="px-3 py-3">
                        <MissingRowActions matchId={row.id} supplierOfferId={offer.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Отсутствующих товаров нет — весь ассортимент поставщика сопоставлен.
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-900">Отсутствующие листинги Kaspi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kaspi XML — это источник листингов, а не мастер-каталога: листинг ещё не связан с Commercial Product
          </p>
        </div>

        {listingError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            Ошибка загрузки: {listingError.message}
          </div>
        ) : listingMatches && listingMatches.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Канал</th>
                  <th className="px-3 py-2 font-medium">Артикул</th>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Цена</th>
                  <th className="px-3 py-2 font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {listingMatches.map((row) => {
                  const listing = Array.isArray(row.marketplace_listings)
                    ? row.marketplace_listings[0]
                    : row.marketplace_listings;
                  if (!listing) return null;

                  return (
                    <tr key={row.id}>
                      <td className="px-3 py-3 text-slate-900">{listing.sales_channel}</td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{listing.external_sku}</td>
                      <td className="px-3 py-3 text-slate-600">{listing.title}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {listing.current_sale_price !== null
                          ? Number(listing.current_sale_price).toLocaleString("ru-RU")
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <MissingListingActions matchId={row.id} marketplaceListingId={listing.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            Отсутствующих листингов нет — все листинги сопоставлены с коммерческими товарами.
          </div>
        )}
      </section>
    </div>
  );
}
