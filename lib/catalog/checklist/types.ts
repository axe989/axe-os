// Product Launch Checklist (Product Center v2.0, approved business
// architecture). Deliberately a different, coarser vocabulary than
// lib/catalog/readiness's ResponsibleTeam/8-dimension model: that engine
// is a fine-grained diagnostic tool, this is the 5-zone organizational
// ownership the business explicitly approved for "who does what" across
// the whole product lifecycle. Both are real, both stay -- this one is
// just built partly on top of the other's signals (see resolve-checklist.ts).

export type ChecklistCategory =
  | "business"
  | "pricing"
  | "content"
  | "media"
  | "marketplace_attributes"
  | "publication"
  | "post_publication_verification";

export type LaunchTeam = "commercial_director" | "content" | "marketplace" | "finance" | "management";

export type ChecklistItemStatus = "done" | "blocked" | "pending" | "not_applicable";

export type ChecklistItemDefinition = {
  key: string;
  category: ChecklistCategory;
  label: string;
  team: LaunchTeam;
};

export type ResolvedChecklistItem = {
  key: string;
  category: ChecklistCategory;
  label: string;
  team: LaunchTeam;
  status: ChecklistItemStatus;
  note: string | null;
  targetDate: string | null;
  source: "auto" | "manual";
};

export type LaunchChecklist = {
  items: ResolvedChecklistItem[];
  completionPercent: number;
  totalItems: number;
  doneItems: number;
};
