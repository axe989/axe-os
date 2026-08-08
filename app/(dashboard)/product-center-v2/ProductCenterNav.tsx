"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/product-center-v2/supplier-feed", label: "Лента поставщиков" },
  { href: "/product-center-v2/opportunities", label: "Очередь возможностей" },
  { href: "/product-center-v2/development", label: "Производство товара" },
  { href: "/product-center-v2/marketplace", label: "Маркетплейсы" },
  { href: "/product-center-v2/dashboard", label: "Панель руководителя" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProductCenterNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
            isActive(pathname, tab.href)
              ? "border-b-2 border-blue-600 text-blue-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
