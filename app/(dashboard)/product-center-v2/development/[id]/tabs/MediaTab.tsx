"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductCardMediaItem } from "@/lib/catalog/queries/product-card";
import { productMediaUrl } from "@/lib/catalog/media/storage-url";

const ROLE_LABELS: Record<string, string> = {
  primary_image: "Главное фото",
  gallery: "Галерея",
  infographic: "Инфографика",
};

export default function MediaTab({ commercialProductId, media }: { commercialProductId: string; media: ProductCardMediaItem[] }) {
  const router = useRouter();
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const primaryInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function upload(role: "primary_image" | "gallery", file: File) {
    setBusyRole(role);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("commercialProductId", commercialProductId);
      formData.append("role", role);
      const response = await fetch("/api/catalog/media/upload", { method: "POST", body: formData });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!result.success) {
        alert(result.error ?? "Не удалось загрузить изображение");
        return;
      }
      router.refresh();
    } finally {
      setBusyRole(null);
    }
  }

  const primary = media.find((m) => m.role === "primary_image") ?? null;
  const gallery = media.filter((m) => m.role !== "primary_image");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Главное фото</h3>
        <div className="flex items-center gap-4">
          {primary ? (
            <img src={productMediaUrl(primary.storagePath)} alt="Главное фото" className="h-28 w-28 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-[10px] text-slate-400">
              нет фото
            </div>
          )}
          <div>
            <input
              ref={primaryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload("primary_image", file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busyRole !== null}
              onClick={() => primaryInputRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {busyRole === "primary_image" ? "Загружаем…" : "+ Загрузить изображение"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Галерея</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {gallery.map((m) => (
            <div key={m.id} className="space-y-1">
              <img src={productMediaUrl(m.storagePath)} alt={ROLE_LABELS[m.role] ?? m.role} className="aspect-square w-full rounded-lg border border-slate-200 object-cover" />
              <div className="text-center text-[10px] text-slate-400">{ROLE_LABELS[m.role] ?? m.role}</div>
            </div>
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-[10px] text-slate-400 hover:border-blue-300 hover:text-blue-600">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload("gallery", file);
                e.target.value = "";
              }}
            />
            {busyRole === "gallery" ? "Загружаем…" : "+ Загрузить из галереи"}
          </label>
        </div>
        {gallery.length === 0 ? <p className="mt-2 text-xs text-slate-400">Фотографии галереи ещё не добавлены</p> : null}
      </div>
    </div>
  );
}
