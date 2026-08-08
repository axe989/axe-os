// Product Launch Checklist (Product Center v2.0, approved business
// architecture). Deliberately a different, coarser vocabulary than
// lib/catalog/readiness's ResponsibleTeam/8-dimension model: that engine
// is a fine-grained diagnostic tool, this is the 5-zone organizational
// ownership the business explicitly approved for "who does what" across
// the whole product lifecycle. Both are real, both stay -- this one is
// just built partly on top of the other's signals (see resolve-checklist.ts).

// 9 categories per the approved mandate (was 7): "business" split into
// assortment_decision + supplier_data, and "marketplace_attributes" split
// into technical_specs + marketplace_attributes. Item keys are unchanged
// so existing commercial_product_launch_tasks overlay rows (keyed by
// item_key, not category) keep working untouched.
export type ChecklistCategory =
  | "assortment_decision"
  | "supplier_data"
  | "pricing"
  | "technical_specs"
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
  // Whether an incomplete item blocks moving to publication, vs. one that
  // matters for quality/completeness but isn't a hard gate (e.g. a bundle
  // definition on a product that isn't sold as a bundle).
  blocking: boolean;
};

export type ResolvedChecklistItem = {
  key: string;
  category: ChecklistCategory;
  label: string;
  team: LaunchTeam;
  blocking: boolean;
  status: ChecklistItemStatus;
  note: string | null;
  targetDate: string | null;
  completedAt: string | null;
  source: "auto" | "manual";
};

export type LaunchChecklist = {
  items: ResolvedChecklistItem[];
  completionPercent: number;
  totalItems: number;
  doneItems: number;
};
