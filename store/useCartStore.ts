"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/lib/types";

interface CartState {
  /** The table number locked in from the NFC tag's ?table= query param. */
  tableNumber: number | null;
  lines: CartLine[];
  lastOrderId: string | null;
  /** Id of the customer_sessions row for this visit (growth/retention anchor). */
  sessionId: string | null;
  /** True once the customer has answered the "stay in touch" prompt (either way). */
  hasAnsweredReengagement: boolean;

  setTableNumber: (table: number) => void;
  ensureSessionId: () => string;
  setHasAnsweredReengagement: (value: boolean) => void;
  addItem: (item: Omit<CartLine, "quantity">, quantity?: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  setLineNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setLastOrderId: (id: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tableNumber: null,
      lines: [],
      lastOrderId: null,
      sessionId: null,
      hasAnsweredReengagement: false,

      setTableNumber: (table) => {
        const current = get().tableNumber;
        // Switching tables (new NFC scan) should never carry over a stale
        // cart or a session anchored to the previous visit.
        if (current !== null && current !== table) {
          set({
            tableNumber: table,
            lines: [],
            lastOrderId: null,
            sessionId: null,
            hasAnsweredReengagement: false,
          });
        } else {
          set({ tableNumber: table });
        }
      },

      ensureSessionId: () => {
        const existing = get().sessionId;
        if (existing) return existing;
        const id = crypto.randomUUID();
        set({ sessionId: id });
        return id;
      },

      setHasAnsweredReengagement: (value) => set({ hasAnsweredReengagement: value }),

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.lines.find((l) => l.menuItemId === item.menuItemId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.menuItemId === item.menuItemId
                  ? { ...l, quantity: l.quantity + quantity }
                  : l
              ),
            };
          }
          return { lines: [...state.lines, { ...item, quantity }] };
        });
      },

      removeItem: (menuItemId) => {
        set((state) => ({
          lines: state.lines.filter((l) => l.menuItemId !== menuItemId),
        }));
      },

      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId);
          return;
        }
        set((state) => ({
          lines: state.lines.map((l) =>
            l.menuItemId === menuItemId ? { ...l, quantity } : l
          ),
        }));
      },

      setLineNotes: (menuItemId, notes) => {
        set((state) => ({
          lines: state.lines.map((l) =>
            l.menuItemId === menuItemId ? { ...l, notes } : l
          ),
        }));
      },

      clearCart: () => set({ lines: [] }),
      setLastOrderId: (id) => set({ lastOrderId: id }),
    }),
    {
      name: "nfc-menu-cart",
    }
  )
);

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
}
