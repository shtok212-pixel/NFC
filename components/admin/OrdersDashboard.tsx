"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OrderCard } from "@/components/admin/OrderCard";
import { WaiterCallAlerts } from "@/components/admin/WaiterCallAlerts";
import type { OrderRow, OrderStatus, WaiterCallRow } from "@/lib/types";

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "preparing", label: "Preparing" },
  { status: "delivered", label: "Delivered" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "delivered",
};

export function OrdersDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(); // last 12h
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    setOrders((data as OrderRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  const loadWaiterCalls = useCallback(async () => {
    const { data } = await supabase
      .from("waiter_calls")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setWaiterCalls((data as WaiterCallRow[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    loadOrders();
    loadWaiterCalls();

    const channel = supabase
      .channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => loadOrders())
      .on("postgres_changes", { event: "*", schema: "public", table: "waiter_calls" }, () =>
        loadWaiterCalls()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadOrders, loadWaiterCalls]);

  async function advanceOrder(order: OrderRow) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
  }

  async function cancelOrder(order: OrderRow) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o)));
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }

  async function acknowledgeCall(call: WaiterCallRow) {
    setWaiterCalls((prev) => prev.filter((c) => c.id !== call.id));
    await supabase
      .from("waiter_calls")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", call.id);
  }

  const activeOrders = orders.filter((o) => o.status !== "cancelled");

  return (
    <div className="flex flex-1 flex-col">
      <WaiterCallAlerts calls={waiterCalls} onAcknowledge={acknowledgeCall} />

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-ink-700/50">
          Loading orders...
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ink-700/40">
          <Inbox className="h-10 w-10" />
          <p className="text-sm">No orders yet — they'll appear here in real time.</p>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 p-6 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const columnOrders = activeOrders.filter((o) => o.status === col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700/60">
                    {col.label}
                  </h2>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-ink-700/60">
                    {columnOrders.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {columnOrders.map((order) => (
                    <OrderCard key={order.id} order={order} onAdvance={advanceOrder} onCancel={cancelOrder} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
