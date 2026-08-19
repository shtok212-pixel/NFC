"use client";

import { useEffect } from "react";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { WifiCard } from "@/components/customer/WifiCard";
import { ReengagementCard } from "@/components/customer/ReengagementCard";
import { useCartStore } from "@/store/useCartStore";
import type { RestaurantSettings } from "@/lib/types";

export function WelcomeScreen({
  tableNumber,
  settings,
  onContinue,
}: {
  tableNumber: number;
  settings: RestaurantSettings | null;
  onContinue: () => void;
}) {
  const ensureSessionId = useCartStore((s) => s.ensureSessionId);

  // Anchor the 30-minute review timer the moment the welcome screen loads —
  // fire-and-forget, never blocks rendering.
  useEffect(() => {
    const sessionId = ensureSessionId();
    fetch("/api/customer-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tableNumber }),
    }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  return (
    <div className="safe-top flex min-h-[100dvh] flex-col bg-ink-900 px-6 pb-8 text-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500">
          <UtensilsCrossed className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-widest text-white/50">
            {settings?.restaurant_name ?? "Welcome"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">Table {tableNumber}</h1>
        </div>
        <p className="max-w-xs text-sm text-white/60">
          Your order will be sent straight to the kitchen for this table. Browse the menu below
          whenever you're ready.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {settings ? <WifiCard settings={settings} /> : null}
        <ReengagementCard tableNumber={tableNumber} />
        <Button size="lg" className="w-full" onClick={onContinue}>
          View Menu
        </Button>
      </div>
    </div>
  );
}
