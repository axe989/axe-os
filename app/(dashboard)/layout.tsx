import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Padding here must stay in sync with Sidebar's fixed width (w-20 / lg:w-64) */}
      <div className="min-w-0 pl-20 lg:pl-64">
        <Header userEmail={user?.email ?? null} />

        <main className="min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
