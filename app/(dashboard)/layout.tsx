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
      <Header userEmail={user?.email ?? null} />

      <main className="ml-20 min-h-screen pt-16 lg:ml-64">{children}</main>
    </div>
  );
}
