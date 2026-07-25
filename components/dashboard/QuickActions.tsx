"use client";

import Link from "next/link";
import { FileText, PlusCircle, RefreshCw, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const ACTIONS: QuickAction[] = [
  {
    label: "Синхронизировать Kaspi",
    description: "Обновить заказы из Kaspi.kz",
    href: "/orders",
    icon: RefreshCw,
  },
  {
    label: "Добавить поставщика",
    description: "Новая карточка поставщика",
    href: "/",
    icon: PlusCircle,
  },
  {
    label: "Открыть заказы",
    description: "Лента заказов и финансы",
    href: "/orders",
    icon: Truck,
  },
  {
    label: "Экспорт отчёта",
    description: "Скоро будет доступно",
    href: "#",
    icon: FileText,
    disabled: true,
  },
];

export default function QuickActions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">
        Быстрые действия
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACTIONS.map(({ label, description, href, icon: Icon, disabled }) => (
          <Link
            key={label}
            href={href}
            aria-disabled={disabled}
            onClick={(event) => {
              if (disabled) {
                event.preventDefault();
              }
            }}
            className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition-colors ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-blue-200 hover:bg-blue-50"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon size={18} />
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {label}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
