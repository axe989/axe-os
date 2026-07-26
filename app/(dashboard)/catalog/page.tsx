import { Boxes } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function CatalogPage() {
  return (
    <ModulePlaceholder
      title="Каталог"
      description="Единый каталог товаров с привязкой к поставщикам и каналам продаж."
      icon={Boxes}
      capabilities={[
        "Карточки товаров с характеристиками и медиа",
        "Сопоставление SKU между Kaspi и поставщиками",
        "История изменения цен и остатков",
        "Массовое редактирование и импорт из Excel",
      ]}
    />
  );
}
