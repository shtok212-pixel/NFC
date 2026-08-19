"use client";

import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cartCount, cartTotal, useCartStore } from "@/store/useCartStore";

export function CartBar({ onOpen }: { onOpen: () => void }) {
  const lines = useCartStore((s) => s.lines);
  const count = cartCount(lines);

  if (count === 0) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
      <button
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-2xl bg-ink-900 px-5 py-4 text-white shadow-float active:scale-[0.98]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold">
              {count}
            </span>
          </span>
          View Order
        </span>
        <span className="text-sm font-bold">{formatCurrency(cartTotal(lines))}</span>
      </button>
    </div>
  );
}
