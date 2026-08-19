"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChefHat, Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types";

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: "new", label: "Order received", icon: Clock },
  { status: "preparing", label: "Preparing", icon: ChefHat },
  { status: "delivered", label: "Delivered — enjoy!", icon: CheckCircle2 },
];

/** Live banner that tracks a single order's status via Supabase Realtime,
 *  so the customer sees "Preparing" / "Delivered" without refreshing. */
export function OrderStatusBanner({ orderId, onDismiss }: { orderId: string; onDismiss: () => void }) {
  const [status, setStatus] = useState<OrderStatus>("new");

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setStatus(payload.new.status as OrderStatus)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (status === "cancelled") return null;

  const activeIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-black/5 bg-white p-4 shadow-card animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-900">Order sent to the kitchen</p>
        <button onClick={onDismiss} aria-label="Dismiss" className="text-ink-700/40">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = i <= activeIndex;
          return (
            <div key={step.status} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  done ? "bg-emerald-500 text-white" : "bg-black/5 text-ink-700/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {i < STEPS.length - 1 ? (
                <div className={`h-0.5 flex-1 ${done ? "bg-emerald-500" : "bg-black/10"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs font-medium text-ink-700/70">{STEPS[activeIndex]?.label}</p>
    </div>
  );
}
