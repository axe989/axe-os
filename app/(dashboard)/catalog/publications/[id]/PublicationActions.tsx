"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PublicationActions({
  publicationItemId,
  status,
  hasValidationErrors,
}: {
  publicationItemId: string;
  status: string;
  hasValidationErrors: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"revalidate" | "approve" | "archive" | "mark_uploaded" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "revalidate" | "approve" | "archive" | "mark_uploaded") {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(`/api/catalog/publications/${publicationItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        setMessage(result.error ?? "Не удалось выполнить действие");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const locked = ["exported", "uploaded", "published", "archived"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={busy !== null || locked}
        onClick={() => act("revalidate")}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === "revalidate" ? "Проверяем…" : "Проверить"}
      </button>

      <button
        type="button"
        disabled={busy !== null || locked || hasValidationErrors}
        onClick={() => act("approve")}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        title={hasValidationErrors ? "Нельзя утвердить, пока есть ошибки валидации" : undefined}
      >
        {busy === "approve" ? "Утверждаем…" : "Утвердить к экспорту"}
      </button>

      {status === "exported" ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => act("mark_uploaded")}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "mark_uploaded" ? "Отмечаем…" : "Отметить: загружено в Kaspi"}
        </button>
      ) : null}

      <button
        type="button"
        disabled={busy !== null || locked}
        onClick={() => act("archive")}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
      >
        В архив
      </button>

      {message ? <span className="text-sm font-medium text-red-600">{message}</span> : null}
    </div>
  );
}
