import { BarChart3 } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function AnalyticsPage() {
  return (
    <ModulePlaceholder
      title="Аналитика"
      description="Динамика продаж и ключевые метрики бизнеса."
      icon={BarChart3}
      capabilities={[
        "Дашборды динамики продаж во времени",
        "Прибыльность по товарам и категориям",
        "Сравнение каналов продаж",
        "Когортный анализ и удержание клиентов",
      ]}
    />
  );
}
