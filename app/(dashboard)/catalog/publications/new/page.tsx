import { listCommercialProductOptions } from "@/lib/catalog/queries/publications";
import NewPublicationForm from "./NewPublicationForm";

export const dynamic = "force-dynamic";

export default async function NewPublicationPage() {
  const commercialProducts = await listCommercialProductOptions();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Новая публикация</h1>
        <p className="mt-1 text-sm text-slate-500">
          Выберите коммерческий товар, режим публикации и контент-вариант для канала
        </p>
      </header>

      <NewPublicationForm commercialProducts={commercialProducts} />
    </main>
  );
}
