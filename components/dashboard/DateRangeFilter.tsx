"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import {
  DATE_RANGE_PRESETS,
  formatDateInput,
  resolveDateRange,
} from "@/lib/dashboard/date-range";

export default function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = resolveDateRange({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    preset: searchParams.get("preset") ?? undefined,
  });

  const rangeKey = `${current.from.getTime()}_${current.to.getTime()}`;

  const [fromInput, setFromInput] = useState(() =>
    formatDateInput(current.from),
  );
  const [toInput, setToInput] = useState(() => formatDateInput(current.to));
  const [syncedRangeKey, setSyncedRangeKey] = useState(rangeKey);

  if (rangeKey !== syncedRangeKey) {
    setSyncedRangeKey(rangeKey);
    setFromInput(formatDateInput(current.from));
    setToInput(formatDateInput(current.to));
  }

  function applyPreset(presetKey: string) {
    const params = new URLSearchParams();

    params.set("preset", presetKey);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function applyCustomRange() {
    if (!fromInput || !toInput) {
      return;
    }

    const params = new URLSearchParams();

    params.set("from", fromInput);
    params.set("to", toInput);

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          <Calendar size={16} />
          {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
            current.from,
          )}{" "}
          – {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(
            current.to,
          )}
        </span>

        {DATE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => applyPreset(preset.key)}
            disabled={isPending}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              current.preset === preset.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={fromInput}
          max={toInput || undefined}
          onChange={(event) => setFromInput(event.target.value)}
          aria-label="Начало периода"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
        />

        <span className="text-sm text-slate-400">—</span>

        <input
          type="date"
          value={toInput}
          min={fromInput || undefined}
          onChange={(event) => setToInput(event.target.value)}
          aria-label="Конец периода"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
        />

        <button
          type="button"
          onClick={applyCustomRange}
          disabled={isPending || !fromInput || !toInput}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          Применить
        </button>
      </div>
    </section>
  );
}
