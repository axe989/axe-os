import { createSupabaseAdminClient } from "@/lib/supabase/server";
import ImportWizard from "./ImportWizard";

export const dynamic = "force-dynamic";

export default async function NewCatalogImportPage() {
  const supabase = createSupabaseAdminClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto w-full max-w-screen-2xl min-w-0 space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <ImportWizard suppliers={suppliers ?? []} />
    </div>
  );
}
