import { Settings } from "lucide-react";
import ModulePlaceholder from "@/components/modules/ModulePlaceholder";

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Настройки"
      description="Параметры аккаунта, интеграций и доступа сотрудников."
      icon={Settings}
      capabilities={[
        "Роли и права доступа сотрудников",
        "Управление интеграциями и API-ключами",
        "Настройка уведомлений",
        "Реквизиты компании",
      ]}
    />
  );
}
