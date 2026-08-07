import { Warehouse } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function WarehousePage() {
  return (
    <ModulePlaceholder
      title="Склад"
      description="Остатки, приёмка и движение товаров по складам."
      icon={Warehouse}
      capabilities={[
        "Остатки по товарам и складским местам",
        "Приёмка и списание с историей движений",
        "Оповещения о низком остатке",
        "Сверка фактических остатков с учётными",
      ]}
    />
  );
}
