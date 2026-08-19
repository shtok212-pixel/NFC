"use client";

import { useState } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { cartTotal, useCartStore } from "@/store/useCartStore";

export function CartDrawer({
  open,
  onClose,
  onOrderPlaced,
}: {
  open: boolean;
  onClose: () => void;
  onOrderPlaced: (orderId: string) => void;
}) {
  const tableNumber = useCartStore((s) => s.tableNumber);
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const setLastOrderId = useCartStore((s) => s.setLastOrderId);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const total = cartTotal(lines);

  async function submitOrder() {
    if (!tableNumber || lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            notes: l.notes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your order");

      setLastOrderId(data.id);
      clearCart();
      onOrderPlaced(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-label="Close cart"
      />
      <div className="safe-bottom relative z-10 flex max-h-[85dvh] flex-col rounded-t-3xl bg-white animate-slide-up">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
            <ShoppingBag className="h-5 w-5" /> Your Order
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-700/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-700/50">Your cart is empty.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-black/5">
              {lines.map((line) => (
                <li key={line.menuItemId} className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900">{line.name}</p>
                    <p className="text-xs text-ink-700/50">{formatCurrency(line.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-black/5 px-1 py-1">
                    <button
                      onClick={() => updateQuantity(line.menuItemId, line.quantity - 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm active:scale-90"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-4 text-center text-sm font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(line.menuItemId, line.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm active:scale-90"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold">
                    {formatCurrency(line.price * line.quantity)}
                  </span>
                  <button
                    onClick={() => removeItem(line.menuItemId)}
                    aria-label={`Remove ${line.name}`}
                    className="text-ink-700/30 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 ? (
          <div className="border-t border-black/5 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-ink-700/60">Total</span>
              <span className="text-lg font-bold text-ink-900">{formatCurrency(total)}</span>
            </div>
            {error ? <p className="mb-2 text-sm text-red-600">{error}</p> : null}
            <Button
              size="lg"
              className="w-full"
              onClick={submitOrder}
              disabled={submitting || !tableNumber}
            >
              {submitting ? "Sending..." : "Send Order to Kitchen"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
