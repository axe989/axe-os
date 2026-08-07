"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/catalog", label: "Каталог", icon: Boxes },
  { href: "/suppliers", label: "Поставщики", icon: Users },
  { href: "/procurement", label: "Закупки", icon: ClipboardList },
  { href: "/warehouse", label: "Склад", icon: Warehouse },
  { href: "/logistics", label: "Логистика", icon: Truck },
  { href: "/finance", label: "Финансы", icon: Wallet },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/marketplace", label: "Marketplace", icon: Store },
];

const SETTINGS_ITEM = { href: "/settings", label: "Настройки", icon: Settings };

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClassName(active: boolean) {
  return `flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
    active
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col border-r border-slate-200 bg-white lg:w-64">
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-slate-200 px-4 lg:justify-start">
        <span className="text-xl font-extrabold tracking-tight text-blue-600 lg:hidden">
          A
        </span>
        <span className="hidden text-xl font-extrabold tracking-tight text-slate-900 lg:inline">
          AXE<span className="text-blue-600">OS</span>
        </span>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-4 lg:px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={navLinkClassName(isActiveRoute(pathname, href))}
          >
            <Icon size={20} className="shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200 px-2 py-2 lg:px-3 lg:py-3">
        <Link
          href={SETTINGS_ITEM.href}
          title={SETTINGS_ITEM.label}
          className={navLinkClassName(
            isActiveRoute(pathname, SETTINGS_ITEM.href),
          )}
        >
          <SETTINGS_ITEM.icon size={20} className="shrink-0" />
          <span className="hidden lg:inline">{SETTINGS_ITEM.label}</span>
        </Link>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title="Выйти"
            className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 lg:justify-start"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="hidden lg:inline">Выйти</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
