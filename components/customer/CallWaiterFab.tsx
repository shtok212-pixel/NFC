"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";

export function CallWaiterFab({ hasCartBar }: { hasCartBar: boolean }) {
  const tableNumber = useCartStore((s) => s.tableNumber);
  const [status, setStatus] = useState<"idle" | "sending" | "called">("idle");

  async function callWaiter() {
    if (!tableNumber || status !== "idle") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/waiter-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber }),
      });
      if (!res.ok) throw new Error();
      setStatus("called");
      setTimeout(() => setStatus("idle"), 20000);
    } catch {
      setStatus("idle");
    }
  }

  return (
    <button
      onClick={callWaiter}
      disabled={status !== "idle"}
      className={cn(
        "safe-bottom fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-float transition-all active:scale-90",
        hasCartBar ? "bottom-24" : "bottom-6",
        status === "called" ? "bg-emerald-500 text-white" : "bg-brand-500 text-white"
      )}
      aria-label="Call waiter"
    >
      {status === "called" ? (
        <Check className="h-6 w-6" />
      ) : (
        <BellRing className={cn("h-6 w-6", status === "sending" && "animate-pulse2")} />
      )}
    </button>
  );
}
