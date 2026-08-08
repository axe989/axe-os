import type { ChecklistCategory, ChecklistItemStatus, LaunchTeam } from "./types";

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  business: "Бизнес",
  pricing: "Цена",
  content: "Контент",
  media: "Медиа",
  marketplace_attributes: "Атрибуты маркетплейса",
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
