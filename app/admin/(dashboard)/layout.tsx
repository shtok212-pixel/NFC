import { AdminHeader } from "@/components/admin/AdminHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <AdminHeader email={user?.email ?? null} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
