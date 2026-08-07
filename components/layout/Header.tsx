"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Дашборд",
    subtitle: "Обзор ключевых показателей AXE OS",
  },
  "/orders": {
    title: "Заказы Kaspi",
    subtitle: "Закупка, затраты и прибыль по каждому заказу",
  },
  "/catalog": {
    title: "Каталог",
    subtitle: "Единый каталог товаров и SKU для всех каналов продаж",
  },
  "/suppliers": {
    title: "Поставщики",
    subtitle: "Данные загружены непосредственно из Supabase",
  },
  "/procurement": {
    title: "Закупки",
    subtitle: "Заявки на закупку и контроль поставок",
  },
  "/warehouse": {
    title: "Склад",
    subtitle: "Остатки, приёмка и движение товаров",
  },
  "/logistics": {
    title: "Логистика",
    subtitle: "Доставка, маршруты и затраты на перевозку",
  },
  "/finance": {
    title: "Финансы",
    subtitle: "Прибыль, расходы и финансовая отчётность",
  },
  "/analytics": {
    title: "Аналитика",
    subtitle: "Динамика продаж и ключевые метрики бизнеса",
  },
  "/marketplace": {
    title: "Marketplace",
    subtitle: "Управление каналами продаж и маркетплейсами",
  },
  "/settings": {
    title: "Настройки",
    subtitle: "Параметры аккаунта, интеграций и доступа",
  },
};

type HeaderProps = {
  userEmail: string | null;
};

export default function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] ?? { title: "AXE OS", subtitle: "" };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-slate-900 md:text-lg">
          {meta.title}
        </h1>

        {meta.subtitle ? (
          <p className="hidden truncate text-xs text-slate-500 md:block">
            {meta.subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Уведомления"
          className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell size={18} />
        </button>

        {userEmail ? (
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 sm:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {userEmail.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[160px] truncate">{userEmail}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
