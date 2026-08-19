import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MenuExperience } from "@/components/customer/MenuExperience";
import { isValidTableNumber } from "@/lib/utils";
import type { MenuCategoryWithItems, RestaurantSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

function InvalidTable({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-ink-900 px-6 text-center text-white">
      <AlertTriangle className="h-10 w-10 text-brand-400" />
      <h1 className="text-lg font-semibold">Can't find your table</h1>
      <p className="max-w-xs text-sm text-white/60">{message}</p>
    </div>
  );
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const tableNumber = Number(searchParams.table);

  if (!searchParams.table || !isValidTableNumber(tableNumber)) {
    return (
      <InvalidTable message="This link is missing a valid table number. Please scan the NFC tag on your table again." />
    );
  }

  const supabase = createClient();

  const [{ data: categoriesData, error: categoriesError }, { data: settingsData }] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, sort_order, is_active, menu_items(*)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  if (categoriesError) {
    return (
      <InvalidTable message="We couldn't load the menu right now. Please ask a member of staff for help." />
    );
  }

  const categories: MenuCategoryWithItems[] = (categoriesData ?? []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order,
    is_active: cat.is_active,
    items: (cat.menu_items ?? [])
      .filter((item: any) => item.is_available)
      .sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return (
    <MenuExperience
      tableNumber={tableNumber}
      categories={categories}
      settings={(settingsData as RestaurantSettings) ?? null}
    />
  );
}
