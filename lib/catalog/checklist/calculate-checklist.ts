import { CHECKLIST_ITEMS } from "./items";
import type { ChecklistItemStatus, LaunchChecklist, ResolvedChecklistItem } from "./types";

// What the system already knows about an item without a human telling it
// (e.g. "does an active sale price exist" -- see resolve-checklist.ts for
// where these come from).
export type AutoSignal = {
  key: string;
  status: Extract<ChecklistItemStatus, "done" | "blocked" | "pending">;
  note: string | null;
};

// The only genuinely operational, human-entered state: a target date, an
// optional manual override (for cases the automatic signals can't see --
// "verbally confirmed with supplier, paperwork pending"), and a free-text
// note on what's actually blocking. One row per (product, item) in
// commercial_product_launch_tasks.
export type ManualOverlay = {
  key: string;
  targetDate: string | null;
  statusOverride: Extract<ChecklistItemStatus, "done" | "blocked" | "not_applicable"> | null;
  blockingNote: string | null;
};

// A manual override always wins over the auto-computed signal -- a human
// closing an item they know is fine (or flagging one the system can't
// see) must never be silently reverted by a stale automatic check.
export function calculateLaunchChecklist(
  autoSignals: AutoSignal[],
  overlays: ManualOverlay[],
): LaunchChecklist {
  const autoByKey = new Map(autoSignals.map((s) => [s.key, s]));
  const overlayByKey = new Map(overlays.map((o) => [o.key, o]));

  const items: ResolvedChecklistItem[] = CHECKLIST_ITEMS.map((definition) => {
    const overlay = overlayByKey.get(definition.key) ?? null;
    const auto = autoByKey.get(definition.key) ?? null;

    const status: ChecklistItemStatus = overlay?.statusOverride ?? auto?.status ?? "pending";
    // A human note is independent of whether they also overrode the
    // status -- "yes it's blocked, and here's what's being done about
    // it" is a real, common case, not just "I'm forcing a different
    // status". Manual note always wins over the auto-generated one when
    // present.
    const note = overlay?.blockingNote ?? auto?.note ?? null;

    return {
      key: definition.key,
      category: definition.category,
      label: definition.label,
      team: definition.team,
      status,
      note,
      targetDate: overlay?.targetDate ?? null,
      source: overlay?.statusOverride ? "manual" : "auto",
    };
  });

  const doneItems = items.filter((item) => item.status === "done").length;
  const totalItems = items.length;

  return {
    items,
    completionPercent: totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0,
    totalItems,
    doneItems,
  };
}
