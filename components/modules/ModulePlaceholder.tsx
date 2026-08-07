import { Hammer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  capabilities: string[];
  icon?: LucideIcon;
};

export default function ModulePlaceholder({
  title,
  description,
  capabilities,
  icon: Icon,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {Icon ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Icon size={24} />
              </span>
            ) : null}

            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
            <Hammer size={14} />В разработке
          </span>
        </div>

        {capabilities.length > 0 ? (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Что появится в этом разделе
            </h2>

            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  {capability}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
