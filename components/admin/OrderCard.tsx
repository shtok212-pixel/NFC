"use client";

import { useEffect, useState } from "react";
import { ChefHat, CheckCircle2, Clock, ArrowRight, Ban } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderRow, OrderStatus } from "@/lib/types";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  preparing: "delivered",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  new: "Start Preparing",
  preparing: "Mark Delivered",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  new: "border-blue-200 bg-blue-50",
  preparing: "border-amber-200 bg-amber-50",
  delivered: "border-emerald-200 bg-emerald-50",
  cancelled: "border-black/10 bg-black/5 opacity-60",
};

function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    function update() {
      const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
      setElapsed(minutes <= 0 ? "just now" : `${minutes}m ago`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [createdAt]);
  return elapsed;
}

export function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: OrderRow;
  onAdvance: (order: OrderRow) => void;
  onCancel: (order: OrderRow) => void;
}) {
  const elapsed = useElapsed(order.created_at);
  const next = NEXT_STATUS[order.status];

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 shadow-card", STATUS_TONE[order.status])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900">Table {order.table_number}</p>
          <p className="flex items-center gap-1 text-xs text-ink-700/50">
            <Clock className="h-3 w-3" /> {elapsed}
          </p>
        </div>
        <span className="text-sm font-bold text-ink-900">{formatCurrency(order.total)}</span>
      </div>

      <ul className="flex flex-col gap-1 border-t border-black/5 pt-2 text-sm text-ink-800">
        {order.order_items?.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span>
              <span className="font-semibold">{item.quantity}×</span> {item.name_snapshot}
            </span>
            <span className="shrink-0 text-ink-700/50">
              {formatCurrency(item.price_snapshot * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {order.status !== "delivered" && order.status !== "cancelled" ? (
        <div className="flex gap-2 border-t border-black/5 pt-3">
          {next ? (
            <button
              onClick={() => onAdvance(order)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink-900 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
            >
              {order.status === "new" ? <ChefHat className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {NEXT_LABEL[order.status]}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <button
            onClick={() => onCancel(order)}
            aria-label="Cancel order"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-500 shadow-sm active:scale-90"
          >
            <Ban className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
