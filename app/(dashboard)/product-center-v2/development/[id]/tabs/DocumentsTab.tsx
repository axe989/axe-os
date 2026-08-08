"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCardDocumentSlot } from "@/lib/catalog/queries/product-card";
import { productMediaUrl } from "@/lib/catalog/media/storage-url";

const STATUS_LABELS: Record<string, string> = {
  required: "Требуется",
  uploaded: "Загружен",
  verified: "Проверен",
  not_applicable: "Не обязателен",
};

function statusClassName(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-50 text-emerald-700";
    case "uploaded":
      return "bg-blue-50 text-blue-700";
    case "required":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-400";
  }
}

function DocumentRow({ commercialProductId, slot }: { commercialProductId: string; slot: ProductCardDocumentSlot }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("commercialProductId", commercialProductId);
      formData.append("documentType", slot.documentType);
      const response = await fetch("/api/catalog/documents/upload", { method: "POST", body: formData });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось загрузить документ");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
      <div>
        <div className="text-sm font-medium text-slate-800">
          {slot.label}
          {slot.required ? <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">обязательно</span> : null}
        </div>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClassName(slot.status)}`}>
          {STATUS_LABELS[slot.status]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {slot.fileReference ? (
          <a href={productMediaUrl(slot.fileReference)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
            Открыть файл
          </a>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Загружаем…" : slot.fileReference ? "Заменить файл" : "+ Загрузить"}
        </button>
      </div>
    </li>
  );
}

export default function DocumentsTab({ commercialProductId, documents }: { commercialProductId: string; documents: ProductCardDocumentSlot[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Документы</h3>
      <ul className="space-y-2">
        {documents.map((slot) => (
          <DocumentRow key={slot.documentType} commercialProductId={commercialProductId} slot={slot} />
        ))}
      </ul>
    </div>
  );
}
