"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import type { MenuItem } from "@/lib/types";

export function MenuItemCard({ item, delay = 0 }: { item: MenuItem; delay?: number }) {
  const lines = useCartStore((s) => s.lines);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);

  const quantity = useMemo(
    () => lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0,
    [lines, item.id]
  );

  const [justAdded, setJustAdded] = useState(false);

  function handleAdd() {
    addItem({ menuItemId: item.id, name: item.name, price: item.price });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 300);
  }

  return (
    <div
      className="flex gap-3 rounded-[20px] border border-ink-900/[0.04] bg-white p-3 shadow-card animate-rise-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="72px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-600/70">
            <UtensilsCrossed className="h-6 w-6" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1">
        <div>
          <h3 className="text-[14.5px] font-bold leading-tight tracking-tight text-ink-900">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-700/55">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[14px] font-bold tabular-nums text-ink-900">
            {formatCurrency(item.price)}
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white shadow-sm transition-transform active:scale-90 ${
                justAdded ? "animate-pop" : ""
              }`}
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-ink-900/5 p-1">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-900 shadow-sm transition-transform active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-[13px] font-bold tabular-nums">{quantity}</span>
              <button
                onClick={handleAdd}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-900 shadow-sm transition-transform active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
