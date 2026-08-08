"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedChecklistItem } from "@/lib/catalog/checklist/types";
import { CHECKLIST_CATEGORY_LABELS, CHECKLIST_STATUS_LABELS, LAUNCH_TEAM_LABELS } from "@/lib/catalog/checklist/labels";

function statusClassName(status: string) {
  switch (status) {
    case "done":
      return "bg-emerald-50 text-emerald-700";
    case "blocked":
      return "bg-red-50 text-red-700";
    case "not_applicable":
      return "bg-slate-100 text-slate-400";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function formatDate(value: string | null) {
  if (!value) return "уточняется";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeZone: "Asia/Almaty" }).format(new Date(value));
}

function EditableRow({ commercialProductId, item, onSaved }: { commercialProductId: string; item: ResolvedChecklistItem; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(item.targetDate ?? "");
  const [statusOverride, setStatusOverride] = useState(item.source === "manual" ? item.status : "");
  const [blockingNote, setBlockingNote] = useState(item.source === "manual" ? (item.note ?? "") : "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/launch-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commercialProductId,
          itemKey: item.key,
          targetDate: targetDate || null,
          statusOverride: statusOverride || null,
          blockingNote: blockingNote || null,
        }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось сохранить");
        return;
      }
      setOpen(false);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">{CHECKLIST_CATEGORY_LABELS[item.category]}</td>
        <td className="px-4 py-3 text-slate-900">{item.label}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(item.status)}`}>{CHECKLIST_STATUS_LABELS[item.status]}</span>
        </td>
        <td className="px-4 py-3 text-slate-600">{LAUNCH_TEAM_LABELS[item.team]}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.targetDate)}</td>
        <td className="px-4 py-3 text-xs text-slate-500">{item.note ?? "—"}</td>
        <td className="px-4 py-3 text-right">
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs font-medium text-blue-600 hover:underline">
            {open ? "Закрыть" : "Изменить"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs">
                <span className="mb-1 block text-slate-500">Срок</span>
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-slate-500">Ручной статус (переопределяет авто)</span>
                <select value={statusOverride} onChange={(e) => setStatusOverride(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                  <option value="">Авто</option>
                  <option value="done">Выполнено</option>
                  <option value="blocked">Заблокировано</option>
                  <option value="not_applicable">Не требуется</option>
                </select>
              </label>
              <label className="flex-1 text-xs" style={{ minWidth: 200 }}>
                <span className="mb-1 block text-slate-500">Примечание / блокирующая проблема</span>
                <input type="text" value={blockingNote} onChange={(e) => setBlockingNote(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
              </label>
              <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {busy ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function LaunchChecklistTable({ commercialProductId, items }: { commercialProductId: string; items: ResolvedChecklistItem[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2">Раздел</th>
            <th className="px-4 py-2">Пункт</th>
            <th className="px-4 py-2">Статус</th>
            <th className="px-4 py-2">Ответственный</th>
            <th className="px-4 py-2">Срок</th>
            <th className="px-4 py-2">Примечание</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <EditableRow key={item.key} commercialProductId={commercialProductId} item={item} onSaved={() => router.refresh()} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
