"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncResult = {
  success: boolean;
  received?: number;
  saved?: number;
  syncedAt?: string;
  error?: string;
};

export default function SyncKaspiButton() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/kaspi/sync", {
        method: "POST",
        credentials: "same-origin",
      });

      const result = (await response.json()) as SyncResult;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Ошибка синхронизации Kaspi");
      }

      setMessage(
        `Получено: ${result.received ?? 0}, сохранено: ${result.saved ?? 0}`,
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка синхронизации",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSync}
        disabled={loading}
        className="api-link"
      >
        {loading ? "Синхронизация..." : "Обновить из Kaspi"}
      </button>

      {message ? (
        <p style={{ marginTop: 8, fontSize: 13 }}>{message}</p>
      ) : null}
    </div>
  );
}