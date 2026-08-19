"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, LayoutGrid, Settings, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Orders", icon: LayoutGrid },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminHeader({ email }: { email: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-black/5 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-semibold text-ink-900">
          <UtensilsCrossed className="h-5 w-5 text-brand-500" />
          Dashboard
        </div>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-ink-900 text-white" : "text-ink-700/70 hover:bg-black/5"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {email ? <span className="text-sm text-ink-700/50">{email}</span> : null}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700/70 hover:bg-black/5"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
