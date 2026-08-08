import Link from "next/link";
import { getExecutiveDashboard } from "@/lib/catalog/queries/executive-dashboard";
import { metricByKey } from "@/lib/catalog/metrics/dictionary";

export const dynamic = "force-dynamic";

function Kpi({ metricKey, value, tone }: { metricKey: string; value: string | number; tone?: "good" | "warn" }) {
  const metric = metricByKey(metricKey);
  return (
    <Link
      href={metric.drillDownHref}
      title={metric.definition}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm"
    >
      <div className="text-xs text-slate-400">{metric.name}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
    </Link>
  );
}

function BarRow({ label, count, max, href }: { label: string; count: number; max: number; href?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const content = (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-40 shrink-0 text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold text-slate-700">{count}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-md hover:bg-slate-50">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveDashboard();
  const pipelineMax = Math.max(1, ...data.launchPipeline.map((p) => p.count));
  const readinessMax = Math.max(1, ...data.readinessDistribution.map((r) => r.count));
  const readinessRanges = [
    { min: 0, max: 25 },
    { min: 25, max: 50 },
    { min: 50, max: 75 },
    { min: 75, max: 99 },
    { min: 100, max: 100 },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Панель руководителя</h2>
        <p className="mt-1 text-xs text-slate-500">
          Реальные показатели по всем товарам во всех категориях. Каждая плитка кликабельна и открывает точный список за этим числом; наведите курсор для определения метрики.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi metricKey="baseProductCount" value={data.baseProductCount} />
        <Kpi metricKey="commercialProductCount" value={data.commercialProductCount} />
        <Kpi metricKey="activeProducts" value={data.activeProducts} tone="good" />
        <Kpi metricKey="archivedProducts" value={data.archivedProducts} />
        <Kpi metricKey="marketplaceListingCount" value={data.marketplaceListingCount} />
        <Kpi metricKey="publishedProducts" value={data.publishedProducts} tone="good" />
        <Kpi metricKey="kaspiCoveragePercent" value={`${data.kaspiCoveragePercent}%`} />
        <Kpi metricKey="websiteCoveragePercent" value={`${data.websiteCoveragePercent}%`} />
        <Kpi metricKey="createdLastWindow" value={data.createdLastWindow} />
        <Kpi metricKey="archivedLastWindow" value={data.archivedLastWindow} />
        <Kpi metricKey="publishedLastWindow" value={data.publishedLastWindow} tone="good" />
        <Kpi metricKey="awaitingBusinessDecision" value={data.awaitingBusinessDecision} tone="warn" />
        <Kpi metricKey="inPreparation" value={data.inPreparation} tone="warn" />
        <Kpi metricKey="awaitingLaunch" value={data.awaitingLaunch} tone="warn" />
        <Kpi metricKey="commercialOpportunities" value={data.commercialOpportunities} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Воронка запуска</h3>
          <div className="space-y-2">
            {data.launchPipeline.map((row) => (
              <BarRow key={row.label} label={row.label} count={row.count} max={pipelineMax} href={`/product-center-v2/development?stage=${row.stage}`} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Распределение по готовности</h3>
          <div className="space-y-2">
            {data.readinessDistribution.map((row, i) => (
              <BarRow
                key={row.label}
                label={row.label}
                count={row.count}
                max={readinessMax}
                href={`/product-center-v2/development?readinessMin=${readinessRanges[i].min}&readinessMax=${readinessRanges[i].max}`}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Определения всех метрик — в словаре метрик (lib/catalog/metrics/dictionary.ts). «Всего товаров» (Base Products) и
        «Commercial Products» — разные числа с разным смыслом: один физический товар может продаваться в нескольких
        коммерческих упаковках. Не путайте их с «Marketplace Listings» — это уже позиции, реально зафиксированные на площадках.
      </p>
    </section>
  );
}
