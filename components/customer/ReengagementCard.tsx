"use client";

import { useState } from "react";
import { Bell, MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/store/useCartStore";
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/push";

/**
 * Captures a way to reach the customer again after they leave: a phone
 * number (for an order confirmation text today, and the review-request SMS
 * ~30 minutes after their meal — see supabase/functions/send-review-requests)
 * or, if they'd rather not share a number, a Web Push subscription instead.
 *
 * Entirely optional — dismissing it just marks the prompt "answered" so it
 * doesn't nag on every render, without blocking ordering.
 */
export function ReengagementCard({ tableNumber }: { tableNumber: number }) {
  // Select the function itself (not its result) — calling it belongs in
  // event handlers, never during render, since it can synchronously write
  // to the store.
  const ensureSessionId = useCartStore((s) => s.ensureSessionId);
  const hasAnswered = useCartStore((s) => s.hasAnsweredReengagement);
  const setHasAnswered = useCartStore((s) => s.setHasAnsweredReengagement);

  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [pushStatus, setPushStatus] = useState<"idle" | "asking" | "enabled" | "denied">("idle");

  if (hasAnswered) return null;

  async function saveSession(payload: Record<string, unknown>) {
    const sessionId = ensureSessionId();
    await fetch("/api/customer-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tableNumber, ...payload }),
    }).catch(() => null);
  }

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setStatus("saving");
    await saveSession({ phoneNumber: phone.trim(), consentMarketing: true });
    setStatus("done");
    setHasAnswered(true);
  }

  async function enablePush() {
    if (!isPushSupported()) {
      setPushStatus("denied");
      return;
    }
    setPushStatus("asking");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined,
      });
      await saveSession({ pushSubscription: subscription.toJSON(), consentMarketing: true });
      setPushStatus("enabled");
      setHasAnswered(true);
    } catch {
      setPushStatus("denied");
    }
  }

  function dismiss() {
    void saveSession({});
    setHasAnswered(true);
  }

  return (
    <div className="relative rounded-2xl border border-black/10 bg-white p-4 shadow-card">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-ink-700/40 hover:text-ink-700"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="pr-6 text-sm font-semibold text-ink-900">Stay in the loop</p>
      <p className="mt-1 text-sm text-ink-700/70">
        Get a text with your receipt, or enable notifications — either way we'll follow up
        after your meal.
      </p>

      {status === "done" ? (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" /> Thanks — you're all set.
        </div>
      ) : (
        <form onSubmit={submitPhone} className="mt-3 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-black/10 px-3">
            <MessageCircle className="h-4 w-4 shrink-0 text-ink-700/40" />
            <input
              type="tel"
              inputMode="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-700/40"
            />
          </div>
          <Button type="submit" size="md" disabled={status === "saving" || !phone.trim()}>
            Send
          </Button>
        </form>
      )}

      {status !== "done" && (
        <button
          onClick={enablePush}
          disabled={pushStatus === "asking" || pushStatus === "enabled"}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-black/5 py-2.5 text-sm font-medium text-ink-800 disabled:opacity-60"
        >
          <Bell className="h-4 w-4" />
          {pushStatus === "enabled"
            ? "Notifications enabled"
            : pushStatus === "denied"
              ? "Notifications unavailable"
              : "Enable notifications instead"}
        </button>
      )}
    </div>
  );
}
