"use client";

import { useState } from "react";
import type { ProductCardData } from "@/lib/catalog/queries/product-card";
import OverviewTab from "./tabs/OverviewTab";
import SpecsTab from "./tabs/SpecsTab";
import ContentTab from "./tabs/ContentTab";
import MediaTab from "./tabs/MediaTab";
import DocumentsTab from "./tabs/DocumentsTab";
import PricingTab from "./tabs/PricingTab";
import MarketplaceTab from "./tabs/MarketplaceTab";
import HistoryTab from "./tabs/HistoryTab";

const TABS = [
  "Обзор",
  "Характеристики",
  "Контент",
  "Медиа",
  "Документы",
  "Цены и маржа",
  "Marketplace",
  "История",
] as const;

type Tab = (typeof TABS)[number];

export default function ProductWorkspaceTabs({ data }: { data: ProductCardData }) {
  const [activeTab, setActiveTab] = useState<Tab>("Обзор");

  return (
    <div>
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-lg px-3.5 py-2 text-sm font-medium ${
              activeTab === tab ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Обзор" ? (
        <OverviewTab
          commercialProductId={data.commercialProductId}
          supplierName={data.supplierName}
          purchasePrice={data.purchasePrice}
          supplierAvailable={data.supplierAvailable}
          bundleComponents={data.bundleComponents}
          checklistItems={data.checklist.items}
        />
      ) : null}

      {activeTab === "Характеристики" ? <SpecsTab attributes={data.technicalAttributes} /> : null}

      {activeTab === "Контент" ? (
        <ContentTab commercialProductId={data.commercialProductId} contentTitle={data.contentTitle} contentDescription={data.contentDescription} />
      ) : null}

      {activeTab === "Медиа" ? <MediaTab commercialProductId={data.commercialProductId} media={data.media} /> : null}

      {activeTab === "Документы" ? <DocumentsTab commercialProductId={data.commercialProductId} documents={data.documents} /> : null}

      {activeTab === "Цены и маржа" ? (
        <PricingTab
          purchasePrice={data.purchasePrice}
          salePrice={data.salePrice}
          minAllowedPrice={data.minAllowedPrice}
          expectedMarginPercent={data.expectedMarginPercent}
          purchasePriceHistory={data.purchasePriceHistory}
          salePriceHistory={data.salePriceHistory}
        />
      ) : null}

      {activeTab === "Marketplace" ? <MarketplaceTab listings={data.listings} /> : null}

      {activeTab === "История" ? <HistoryTab history={data.history} /> : null}
    </div>
  );
}
