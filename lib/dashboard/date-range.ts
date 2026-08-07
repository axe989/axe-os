export type DateRangePresetKey = "today" | "7d" | "14d" | "30d" | "custom";

export type DateRange = {
  from: Date;
  to: Date;
  preset: DateRangePresetKey;
};

export type DateRangeSearchParams = {
  from?: string;
  to?: string;
  preset?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DATE_RANGE_PRESETS: {
  key: Exclude<DateRangePresetKey, "custom">;
  label: string;
  days: number;
}[] = [
  { key: "today", label: "Сегодня", days: 0 },
  { key: "7d", label: "7 дней", days: 6 },
  { key: "14d", label: "14 дней", days: 13 },
  { key: "30d", label: "30 дней", days: 29 },
];

const DEFAULT_PRESET = DATE_RANGE_PRESETS[2]; // 14 days, matches the Kaspi sync window

function toDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);

  result.setUTCHours(0, 0, 0, 0);

  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);

  result.setUTCHours(23, 59, 59, 999);

  return result;
}

export function resolveDateRange(
  searchParams: DateRangeSearchParams,
): DateRange {
  const fromParam = searchParams.from ? toDateOnly(searchParams.from) : null;
  const toParam = searchParams.to ? toDateOnly(searchParams.to) : null;

  if (fromParam && toParam) {
    const [start, end] =
      fromParam.getTime() <= toParam.getTime()
        ? [fromParam, toParam]
        : [toParam, fromParam];

    return {
      from: startOfDay(start),
      to: endOfDay(end),
      preset: "custom",
    };
  }

  const preset =
    DATE_RANGE_PRESETS.find((item) => item.key === searchParams.preset) ??
    DEFAULT_PRESET;

  const to = endOfDay(new Date());
  const from = startOfDay(new Date(to.getTime() - preset.days * DAY_MS));

  return { from, to, preset: preset.key };
}

export function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
