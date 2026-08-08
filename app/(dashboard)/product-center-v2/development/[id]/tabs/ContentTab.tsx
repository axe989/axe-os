"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContentTab({
  commercialProductId,
  contentTitle,
  contentDescription,
}: {
  commercialProductId: string;
  contentTitle: string | null;
  contentDescription: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(contentTitle ?? "");
  const [description, setDescription] = useState(contentDescription ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/catalog/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialProductId, title, description }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось сохранить контент");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Контент</h3>
      <div className="space-y-3">
        <label className="block text-xs">
          <span className="mb-1 block text-slate-500">Название</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название товара для маркетплейса"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-slate-500">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Полное описание товара"
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Сохраняем…" : "Сохранить контент"}
        </button>
      </div>
    </div>
  );
}
