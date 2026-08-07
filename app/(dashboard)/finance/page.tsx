import { Wallet } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function FinancePage() {
  return (
    <ModulePlaceholder
      title="Финансы"
      description="Прибыль, расходы и финансовая отчётность бизнеса."
      icon={Wallet}
      capabilities={[
        "P&L по каналам продаж и товарам",
        "Учёт и категоризация расходов",
        "Сверка выплат с Kaspi",
        "Прогноз движения денежных средств",
      ]}
    />
  );
}
