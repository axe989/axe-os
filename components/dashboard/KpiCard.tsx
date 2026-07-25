import type { LucideIcon } from "lucide-react";

type Tone = "default" | "positive" | "negative";

type KpiCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
  tone?: Tone;
};

const TONE_STYLES: Record<Tone, string> = {
  default: "bg-blue-50 text-blue-600",
  positive: "bg-emerald-50 text-emerald-600",
  negative: "bg-red-50 text-red-600",
};

export default function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>

        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_STYLES[tone]}`}
        >
          <Icon size={18} />
        </span>
      </div>

      <strong className="mt-4 block text-2xl font-bold text-slate-900">
        {value}
      </strong>

      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </article>
  );
}
