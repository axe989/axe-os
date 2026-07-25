"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, ShoppingCart, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/orders", label: "Заказы", icon: ShoppingCart },
  { href: "/", label: "Поставщики", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-20 flex-col border-r border-slate-200 bg-white lg:w-64">
      <div className="flex h-16 items-center justify-center border-b border-slate-200 px-4 lg:justify-start">
        <span className="text-xl font-extrabold tracking-tight text-blue-600 lg:hidden">
          A
        </span>
        <span className="hidden text-xl font-extrabold tracking-tight text-slate-900 lg:inline">
          AXE<span className="text-blue-600">OS</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <form action="/auth/signout" method="post" className="border-t border-slate-200 p-2 lg:p-3">
        <button
          type="submit"
          title="Выйти"
          className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 lg:justify-start"
        >
          <LogOut size={20} className="shrink-0" />
          <span className="hidden lg:inline">Выйти</span>
        </button>
      </form>
    </aside>
  );
}
