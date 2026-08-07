import { Truck } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function LogisticsPage() {
  return (
    <ModulePlaceholder
      title="Логистика"
      description="Доставка, маршруты и затраты на перевозку заказов."
      icon={Truck}
      capabilities={[
        "Планирование маршрутов доставки",
        "Назначение курьеров и транспортных компаний",
        "Учёт стоимости доставки по заказам",
        "Контроль сроков доставки (SLA)",
      ]}
    />
  );
}
