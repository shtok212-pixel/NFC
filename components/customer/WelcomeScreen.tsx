"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Wifi } from "lucide-react";
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
  const [showReengagement, setShowReengagement] = useState(false);

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
    <div className="safe-top relative flex min-h-[100dvh] flex-col overflow-hidden bg-ink-900 px-6 pb-8 text-white">
      {/* Ambient copper glow — quiet, not a gradient hero cliché: a single
          soft highlight behind the badge, nothing else competes with it. */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[70px]" />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 pt-8 text-center">
        <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[22px] bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_10px_26px_-8px_rgba(200,121,59,0.55)]">
          <Wifi className="h-8 w-8" strokeWidth={2} />
        </div>
        <div>
          <p className="text-[15px] font-medium text-white/50">
            You're seated at
          </p>
          <h1 className="mt-0.5 font-display text-[52px] font-semibold leading-[0.95] tracking-tight">
            Table {tableNumber}
          </h1>
        </div>
        <p className="max-w-[230px] text-[14.5px] leading-relaxed text-white/60">
          {settings?.restaurant_name ?? "Welcome"} — order whenever you're ready, it goes
          straight to the kitchen for this table.
        </p>
      </div>

      <div className="relative flex flex-col gap-3">
        {settings ? <WifiCard settings={settings} /> : null}

        {showReengagement ? (
          <ReengagementCard tableNumber={tableNumber} />
        ) : (
          <button
            onClick={() => setShowReengagement(true)}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-[13px] font-medium text-white/40 transition-colors hover:text-white/70"
          >
            Get a text with your receipt
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={onContinue}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-[15px] text-[15px] font-semibold text-white transition-colors active:bg-white/[0.1]"
        >
          View Menu
        </button>
      </div>
    </div>
  );
}
