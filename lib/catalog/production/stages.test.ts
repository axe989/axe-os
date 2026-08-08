import { describe, expect, it } from "vitest";
import { STAGE_COLUMNS, stageForStatus } from "./stages";
import type { ProductWorkflowStatus } from "../types";

const ALL_STATUSES: ProductWorkflowStatus[] = [
  "discovered",
  "needs_matching",
  "draft",
  "needs_technical_data",
  "needs_content",
  "needs_images",
  "needs_price",
  "review",
  "approved",
  "ready_to_publish",
  "published",
  "needs_update",
  "optimization",
  "archived",
];

describe("stageForStatus", () => {
  it("maps every ProductWorkflowStatus value to a real Kanban column", () => {
    const validKeys = new Set(STAGE_COLUMNS.map((c) => c.key));
    for (const status of ALL_STATUSES) {
      expect(validKeys.has(stageForStatus(status))).toBe(true);
    }
  });

  it("maps the new v2 statuses to their dedicated stages", () => {
    expect(stageForStatus("needs_images")).toBe("images");
    expect(stageForStatus("optimization")).toBe("optimization");
  });

  it("maps published to the published stage", () => {
    expect(stageForStatus("published")).toBe("published");
  });
});
