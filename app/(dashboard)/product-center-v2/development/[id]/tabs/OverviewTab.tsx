import type { ResolvedChecklistItem } from "@/lib/catalog/checklist/types";
import type { BundleComponent } from "@/lib/catalog/types";
import LaunchChecklistTable from "../LaunchChecklistTable";

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) + " ₸";
}

export default function OverviewTab({
  commercialProductId,
  supplierName,
  purchasePrice,
  supplierAvailable,
  bundleComponents,
  checklistItems,
}: {
  commercialProductId: string;
  supplierName: string | null;
  purchasePrice: number | null;
  supplierAvailable: boolean;
  bundleComponents: BundleComponent[];
  checklistItems: ResolvedChecklistItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Предложение поставщика</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><div className="text-xs text-slate-400">Поставщик</div><div className="font-medium text-slate-800">{supplierName ?? "—"}</div></div>
          <div><div className="text-xs text-slate-400">Закупочная цена</div><div className="font-medium text-slate-800">{formatMoney(purchasePrice)}</div></div>
          <div><div className="text-xs text-slate-400">Наличие</div><div className={supplierAvailable ? "font-medium text-emerald-600" : "font-medium text-red-500"}>{supplierAvailable ? "В наличии" : "Нет"}</div></div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Комплектация</h3>
        {bundleComponents.length > 0 ? (
          <p className="text-sm text-slate-600">{bundleComponents.length} компонент(ов) в бандле</p>
        ) : (
          <p className="text-xs text-slate-400">Стандартная комплектация, без дополнительных компонентов</p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Чек-лист запуска</h3>
        <LaunchChecklistTable commercialProductId={commercialProductId} items={checklistItems} />
      </div>
    </div>
  );
}
