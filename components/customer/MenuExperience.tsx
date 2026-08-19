"use client";

import { useEffect, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { WelcomeScreen } from "@/components/customer/WelcomeScreen";
import { MenuList } from "@/components/customer/MenuList";
import { CartBar } from "@/components/customer/CartBar";
import { CartDrawer } from "@/components/customer/CartDrawer";
import { CallWaiterFab } from "@/components/customer/CallWaiterFab";
import { OrderStatusBanner } from "@/components/customer/OrderStatusBanner";
import { useCartStore } from "@/store/useCartStore";
import type { MenuCategoryWithItems, RestaurantSettings } from "@/lib/types";

export function MenuExperience({
  tableNumber,
  categories,
  settings,
}: {
  tableNumber: number;
  categories: MenuCategoryWithItems[];
  settings: RestaurantSettings | null;
}) {
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const storedTableNumber = useCartStore((s) => s.tableNumber);
  const lines = useCartStore((s) => s.lines);

  // Lock the session to this table number the moment the NFC link is opened.
  useEffect(() => {
    setTableNumber(tableNumber);
  }, [tableNumber, setTableNumber]);

  const [showWelcome, setShowWelcome] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Wait for the store to actually confirm the table lock before rendering
  // the menu, so a stale cart from a different table never flashes.
  if (storedTableNumber !== tableNumber) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink-900">
        <UtensilsCrossed className="h-8 w-8 animate-pulse2 text-white/50" />
      </div>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        tableNumber={tableNumber}
        settings={settings}
        onContinue={() => setShowWelcome(false)}
      />
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#f7f7f8]">
      <header className="flex items-center justify-between border-b border-black/5 bg-white px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">
            {settings?.restaurant_name ?? "Menu"}
          </p>
          <p className="text-sm font-bold text-ink-900">Table {tableNumber}</p>
        </div>
      </header>

      {activeOrderId ? (
        <OrderStatusBanner orderId={activeOrderId} onDismiss={() => setActiveOrderId(null)} />
      ) : null}

      <MenuList categories={categories} />

      <CallWaiterFab hasCartBar={lines.length > 0} />
      <CartBar onOpen={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onOrderPlaced={(orderId) => {
          setCartOpen(false);
          setActiveOrderId(orderId);
        }}
      />
    </div>
  );
}
