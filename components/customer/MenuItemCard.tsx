"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import type { MenuItem } from "@/lib/types";

export function MenuItemCard({ item }: { item: MenuItem }) {
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
    setTimeout(() => setJustAdded(false), 400);
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3 shadow-card">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-50">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-400">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1">
        <div>
          <h3 className="text-sm font-semibold leading-tight text-ink-900">{item.name}</h3>
          {item.description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-700/60">
              {item.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-900">{formatCurrency(item.price)}</span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white transition-transform active:scale-90 ${
                justAdded ? "scale-110" : ""
              }`}
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-black/5 px-1 py-1">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-900 shadow-sm active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                onClick={handleAdd}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-900 shadow-sm active:scale-90"
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
