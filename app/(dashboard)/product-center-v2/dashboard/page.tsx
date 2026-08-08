import { getExecutiveDashboard } from "@/lib/catalog/queries/executive-dashboard";

export const dynamic = "force-dynamic";

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-40 shrink-0 text-slate-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right font-semibold text-slate-700">{count}</span>
    </div>
  );
}

export default async function ExecutiveDashboardPage() {
  const data = await getExecutiveDashboard();
  const pipelineMax = Math.max(1, ...data.launchPipeline.map((p) => p.count));
  const readinessMax = Math.max(1, ...data.readinessDistribution.map((r) => r.count));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-700">Панель руководителя</h2>
        <p className="mt-1 text-xs text-slate-500">Реальные показатели по всем товарам во всех категориях.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi label="Всего товаров" value={data.totalProducts} />
        <Kpi label="Активные товары" value={data.activeProducts} tone="good" />
        <Kpi label="Архивные товары" value={data.archivedProducts} />
        <Kpi label="Опубликовано" value={data.publishedProducts} tone="good" />
        <Kpi label="Покрытие Kaspi" value={`${data.kaspiCoveragePercent}%`} />
        <Kpi label="Покрытие сайта" value={`${data.websiteCoveragePercent}%`} />
        <Kpi label={`Создано за ${30} дн.`} value={data.createdLastWindow} />
        <Kpi label={`Архивировано за ${30} дн.`} value={data.archivedLastWindow} />
        <Kpi label="Ожидают запуска" value={data.awaitingLaunch} tone="warn" />
        <Kpi label="Ожидают бизнес-решения" value={data.awaitingBusinessDecision} tone="warn" />
        <Kpi label="Коммерческие возможности" value={data.commercialOpportunities} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Воронка запуска</h3>
          <div className="space-y-2">
            {data.launchPipeline.map((row) => (
              <BarRow key={row.label} label={row.label} count={row.count} max={pipelineMax} />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Распределение по готовности</h3>
          <div className="space-y-2">
            {data.readinessDistribution.map((row) => (
              <BarRow key={row.label} label={row.label} count={row.count} max={readinessMax} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
