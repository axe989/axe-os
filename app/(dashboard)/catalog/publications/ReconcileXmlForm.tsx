"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReconcileResult = {
  success: boolean;
  discoveredCount?: number;
  summary?: { matched: number; ambiguous: number; none: number };
  error?: string;
};

// Manual XML paste, not a file-upload pipeline: this phase never uploads
// anything to Kaspi automatically, and the human-in-the-loop step of
// pasting a Kaspi export is a deliberate boundary, not a placeholder.
export default function ReconcileXmlForm({ salesChannel }: { salesChannel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [xml, setXml] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/catalog/publications/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml, salesChannel }),
      });
      const data = (await response.json()) as ReconcileResult;
      setResult(data);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Импорт Kaspi XML
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs text-slate-500">
        Вставьте XML-выгрузку Kaspi, чтобы сопоставить опубликованные листинги с позициями публикации.
      </p>
      <textarea
        value={xml}
        onChange={(e) => setXml(e.target.value)}
        rows={6}
        placeholder="<kaspi_catalog>...</kaspi_catalog>"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || !xml.trim()}
          onClick={submit}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Сопоставляем…" : "Сопоставить"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:underline"
        >
          Скрыть
        </button>
      </div>

      {result ? (
        <div className="mt-3 text-xs">
          {result.success ? (
            <p className="text-slate-700">
              Найдено в XML: {result.discoveredCount}. Подтверждено: {result.summary?.matched}. На проверку:{" "}
              {result.summary?.ambiguous}. Без совпадений: {result.summary?.none}.
            </p>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
