import { Store } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function MarketplacePage() {
  return (
    <ModulePlaceholder
      title="Marketplace"
      description="Управление каналами продаж и маркетплейсами."
      icon={Store}
      capabilities={[
        "Единая лента заказов со всех маркетплейсов",
        "Синхронизация карточек товаров и остатков",
        "Учёт комиссий маркетплейсов",
        "Мониторинг отзывов и рейтинга",
      ]}
    />
  );
}
