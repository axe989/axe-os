import Link from "next/link";
import { getProductCard } from "@/lib/catalog/queries/product-card";
import { STAGE_COLUMNS, stageForStatus } from "@/lib/catalog/production/stages";
import ProductWorkspaceTabs from "./ProductWorkspaceTabs";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "не назначена";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductCardPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProductCard(id);
  const stage = STAGE_COLUMNS.find((c) => c.key === stageForStatus(data.status));

  return (
    <div>
      <Link href="/product-center-v2/development" className="text-sm text-blue-600 hover:underline">
        ← Подготовка товаров
      </Link>

      <header className="mt-2 mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{data.commercialName}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.brandName ?? "Бренд не указан"} · {data.manufacturerSku ?? "без артикула"} · {data.categoryName ?? "категория не указана"}
              {data.sellerSku ? ` · AXE SKU ${data.sellerSku}` : ""}
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
            <div className="text-xs text-slate-400">Плановая дата запуска</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{formatDate(data.targetDate)}</div>
          </div>
        </div>
      </header>

      <ProductWorkspaceTabs data={data} />
    </div>
  );
}
