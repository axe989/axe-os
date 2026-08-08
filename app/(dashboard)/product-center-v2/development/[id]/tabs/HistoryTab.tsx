import type { ProductHistoryEvent } from "@/lib/catalog/queries/product-card";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Almaty" }).format(new Date(value));
}

export default function HistoryTab({ history }: { history: ProductHistoryEvent[] }) {
  if (history.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">История пока пуста</div>;
  }

  const reversed = [...history].reverse();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <ol className="space-y-3">
        {reversed.map((event, i) => (
          <li key={i} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{event.label}</span>
                <span className="text-xs text-slate-400">{formatDate(event.at)}</span>
              </div>
              {event.detail ? <p className="mt-0.5 text-xs text-slate-500">{event.detail}</p> : null}
              {event.by ? <p className="mt-0.5 text-xs text-slate-400">{event.by}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
