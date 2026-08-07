"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExportResult = {
  success: boolean;
  batchId?: string;
  exportedCount?: number;
  skipped?: Array<{ id: string; errors: { code: string; message: string }[] }>;
  error?: string;
};

export default function ExportButton({ salesChannel }: { salesChannel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);

  async function exportBatch() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/catalog/publications/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesChannel }),
      });
      const data = (await response.json()) as ExportResult;
      setResult(data);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={exportBatch}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Экспортируем…" : `Экспортировать ${salesChannel} CSV`}
      </button>

      {result ? (
        <div className="mt-2 max-w-sm text-xs">
          {result.success ? (
            <>
              <p className="font-medium text-emerald-700">Экспортировано позиций: {result.exportedCount}</p>
              {result.batchId ? (
                <a
                  href={`/api/catalog/publications/export/${result.batchId}`}
                  className="text-blue-600 hover:underline"
                >
                  Скачать CSV
                </a>
              ) : null}
              {result.skipped && result.skipped.length > 0 ? (
                <p className="mt-1 text-red-600">
                  Пропущено из-за ошибок валидации: {result.skipped.length}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-red-600">{result.error}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
