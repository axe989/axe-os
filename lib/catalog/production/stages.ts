import type { ProductWorkflowStatus } from "../types";

// The 9-stage Product Development Kanban from the approved business
// architecture, mapped onto the existing commercial_products.status enum
// (see supabase/migrations/20260808090000_product_center_v2_status_and_decisions.sql --
// only needs_images/optimization needed adding, everything else already existed).
export type StageKey =
  | "new"
  | "accepted"
  | "technical_data"
  | "content"
  | "images"
  | "pricing"
  | "ready"
  | "published"
  | "optimization";

export const STAGE_COLUMNS: { key: StageKey; label: string }[] = [
  { key: "new", label: "Новый" },
  { key: "accepted", label: "Принят" },
  { key: "technical_data", label: "Технические данные" },
  { key: "content", label: "Контент" },
  { key: "images", label: "Изображения" },
  { key: "pricing", label: "Цена" },
  { key: "ready", label: "Готов" },
  { key: "published", label: "Опубликован" },
  { key: "optimization", label: "Оптимизация" },
];

const STATUS_TO_STAGE: Record<ProductWorkflowStatus, StageKey> = {
  discovered: "new",
  needs_matching: "new",
  draft: "accepted",
  needs_technical_data: "technical_data",
  needs_content: "content",
  needs_images: "images",
  needs_price: "pricing",
  review: "ready",
  approved: "ready",
  ready_to_publish: "ready",
  published: "published",
  needs_update: "optimization",
  optimization: "optimization",
  archived: "new",
};

export function stageForStatus(status: ProductWorkflowStatus): StageKey {
  return STATUS_TO_STAGE[status] ?? "new";
}
