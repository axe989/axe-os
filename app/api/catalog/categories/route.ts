import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const parentId = formData.get("parentId");

    if (!name) {
      return NextResponse.json({ success: false, error: "Название обязательно" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("product_categories").insert({
      name,
      slug: slugify(name),
      parent_id: typeof parentId === "string" && parentId ? parentId : null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.redirect(new URL("/catalog/categories", request.url), { status: 303 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
