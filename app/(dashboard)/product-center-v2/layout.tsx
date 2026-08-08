import type { ReactNode } from "react";
import ProductCenterNav from "./ProductCenterNav";

export default function ProductCenterV2Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Product Center v2.0</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Пилот — параллельно с текущим Товарным центром, без замены. Все данные — общие.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Пилот
        </span>
      </div>

      <ProductCenterNav />

      {children}
    </div>
  );
}
