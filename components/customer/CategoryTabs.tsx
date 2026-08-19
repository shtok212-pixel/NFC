"use client";

import { cn } from "@/lib/utils";
import type { MenuCategoryWithItems } from "@/lib/types";

export function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: MenuCategoryWithItems[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar sticky top-0 z-10 flex gap-2 overflow-x-auto bg-[#f7f7f8]/95 px-4 py-3 backdrop-blur-md">
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all duration-200 active:scale-95",
              isActive
                ? "bg-ink-900 text-white shadow-sm"
                : "border border-ink-900/[0.08] bg-white text-ink-700/70"
            )}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
