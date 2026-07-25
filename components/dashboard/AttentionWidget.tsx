import { AlertTriangle, Clock, PackageX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tone = "warning" | "danger";

type AttentionItem = {
  icon: LucideIcon;
  title: string;
  detail: string;
  tone: Tone;
};

const ATTENTION_ITEMS: AttentionItem[] = [
  {
    icon: PackageX,
    title: "6 заказов не закуплено",
    detail: "Требуется указать поставщика и закупочную цену",
    tone: "warning",
  },
  {
    icon: Clock,
    title: "3 доставки просрочены",
    detail: "Плановая дата доставки уже прошла",
    tone: "danger",
  },
  {
    icon: AlertTriangle,
    title: "2 заказа с отрицательной маржой",
    detail: "Проверьте затраты на логистику и рекламу",
    tone: "danger",
  },
];

const TONE_STYLES: Record<Tone, string> = {
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

export default function AttentionWidget() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Требует внимания
      </h2>

      <ul className="space-y-3">
        {ATTENTION_ITEMS.map(({ icon: Icon, title, detail, tone }) => (
          <li key={title} className="flex items-start gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[tone]}`}
            >
              <Icon size={18} />
            </span>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
