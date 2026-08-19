"use client";

import { useState } from "react";
import { CategoryTabs } from "@/components/customer/CategoryTabs";
import { MenuItemCard } from "@/components/customer/MenuItemCard";
import type { MenuCategoryWithItems } from "@/lib/types";

export function MenuList({ categories }: { categories: MenuCategoryWithItems[] }) {
  const nonEmpty = categories.filter((c) => c.items.length > 0);
  const [activeId, setActiveId] = useState(nonEmpty[0]?.id ?? "");

  if (nonEmpty.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-ink-700/60">
        The menu isn't available right now — please ask a member of staff.
      </div>
    );
  }

  const active = nonEmpty.find((c) => c.id === activeId) ?? nonEmpty[0];

  return (
    <div className="flex flex-1 flex-col">
      <CategoryTabs categories={nonEmpty} activeId={active.id} onSelect={setActiveId} />
      <div className="flex flex-col gap-2.5 px-4 pb-28 pt-3">
        {active.items.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
