"use client";

import { BellRing, Check } from "lucide-react";
import type { WaiterCallRow } from "@/lib/types";

export function WaiterCallAlerts({
  calls,
  onAcknowledge,
}: {
  calls: WaiterCallRow[];
  onAcknowledge: (call: WaiterCallRow) => void;
}) {
  if (calls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-amber-200 bg-amber-50 px-6 py-3">
      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-1.5 shadow-sm"
        >
          <BellRing className="h-4 w-4 animate-pulse2 text-amber-600" />
          <span className="text-sm font-semibold text-ink-900">Table {call.table_number}</span>
          <button
            onClick={() => onAcknowledge(call)}
            className="ml-1 flex items-center gap-1 rounded-full bg-ink-900 px-2 py-1 text-xs font-medium text-white"
          >
            <Check className="h-3 w-3" /> Acknowledge
          </button>
        </div>
      ))}
    </div>
  );
}
