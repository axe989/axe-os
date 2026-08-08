export default function SpecsTab({ attributes }: { attributes: Record<string, unknown> }) {
  const entries = Object.entries(attributes).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Технические характеристики</h3>
      {entries.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-slate-400">{key}</dt>
              <dd className="font-medium text-slate-800">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-slate-400">Характеристики не заполнены. Источник данных: поставщик / производитель / ручная проверка.</p>
      )}
    </div>
  );
}
