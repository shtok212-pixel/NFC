"use client";

import { ShoppingBag, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cartCount, cartTotal, useCartStore } from "@/store/useCartStore";

export function CartBar({ onOpen }: { onOpen: () => void }) {
  const lines = useCartStore((s) => s.lines);
  const count = cartCount(lines);

  return (
    <div
      className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 transition-all duration-300 ease-out"
      style={{
        opacity: count > 0 ? 1 : 0,
        transform: count > 0 ? "translateY(0)" : "translateY(120%)",
      }}
    >
      <button
        onClick={onOpen}
        disabled={count === 0}
        className="pointer-events-auto flex w-full items-center justify-between rounded-[20px] bg-ink-900/95 px-5 py-4 text-white shadow-float backdrop-blur transition-transform active:scale-[0.98]"
      >
        <span className="flex items-center gap-2.5 text-[14px] font-bold">
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold tabular-nums">
              {count}
            </span>
          </span>
          View Cart
        </span>
        <span className="flex items-center gap-1 text-[14px] font-bold tabular-nums">
          {formatCurrency(cartTotal(lines))}
          <ChevronRight className="h-3.5 w-3.5 opacity-60" />
        </span>
      </button>
    </div>
  );
}
