import { ClipboardList } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function ProcurementPage() {
  return (
    <ModulePlaceholder
      title="Закупки"
      description="Заявки на закупку и контроль поставок от заказа до склада."
      icon={ClipboardList}
      capabilities={[
        "Формирование заявок из незакупленных заказов",
        "Сравнение цен поставщиков по позициям",
        "Статусы заявок: заказано, в пути, получено",
        "Автоматические подсказки по пополнению остатков",
      ]}
    />
  );
}
