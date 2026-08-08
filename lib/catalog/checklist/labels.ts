import type { ChecklistCategory, ChecklistItemStatus, LaunchTeam } from "./types";

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  assortment_decision: "Ассортиментное решение",
  supplier_data: "Данные поставщика",
  pricing: "Ценообразование",
  technical_specs: "Технические характеристики",
  content: "Контент",
  media: "Медиа",
  marketplace_attributes: "Marketplace-атрибуты",
  publication: "Публикация",
  post_publication_verification: "Проверка после публикации",
};

export const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  done: "Выполнено",
  blocked: "Заблокировано",
  pending: "Не начато",
  not_applicable: "Не требуется",
};

export const LAUNCH_TEAM_LABELS: Record<LaunchTeam, string> = {
  commercial_director: "Коммерческий директор",
  content: "Контент",
  marketplace: "Маркетплейс",
  finance: "Финансы",
  management: "Руководство",
};
