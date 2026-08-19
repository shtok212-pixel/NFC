"use client";

import { useState } from "react";
import { Check, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { RestaurantSettings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: RestaurantSettings }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function field<K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("restaurant_settings")
      .update({
        restaurant_name: form.restaurant_name,
        wifi_ssid: form.wifi_ssid,
        wifi_password: form.wifi_password,
        wifi_security: form.wifi_security,
        google_review_url: form.google_review_url,
        review_delay_minutes: form.review_delay_minutes,
        app_base_url: form.app_base_url,
      })
      .eq("id", 1);
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="mx-auto flex max-w-xl flex-col gap-5 p-6">
      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-700/60">
          Restaurant
        </h2>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink-700/70">Name</span>
          <input
            value={form.restaurant_name}
            onChange={(e) => field("restaurant_name", e.target.value)}
            className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-700/60">
          Guest Wi-Fi
        </h2>
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">Network name (SSID)</span>
            <input
              value={form.wifi_ssid ?? ""}
              onChange={(e) => field("wifi_ssid", e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">Password</span>
            <input
              value={form.wifi_password ?? ""}
              onChange={(e) => field("wifi_password", e.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">Security</span>
            <select
              value={form.wifi_security}
              onChange={(e) => field("wifi_security", e.target.value as RestaurantSettings["wifi_security"])}
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">Open (no password)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-700/60">
          Review Follow-up
        </h2>
        <div className="flex flex-col gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">Google review link</span>
            <input
              value={form.google_review_url ?? ""}
              onChange={(e) => field("google_review_url", e.target.value)}
              placeholder="https://g.page/r/..."
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">
              App URL <span className="font-normal text-ink-700/40">(optional)</span>
            </span>
            <input
              value={form.app_base_url ?? ""}
              onChange={(e) => field("app_base_url", e.target.value)}
              placeholder="https://order.yourrestaurant.com"
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            />
            <span className="mt-1 block text-xs text-ink-700/50">
              When set, the review request opens your <code>/review</code> rating screen first —
              only 4–5 star visits continue on to Google. Left blank, it links straight to Google.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink-700/70">
              Send request this many minutes after the meal
            </span>
            <input
              type="number"
              min={1}
              value={form.review_delay_minutes}
              onChange={(e) => field("review_delay_minutes", Number(e.target.value))}
              className="h-11 w-full rounded-xl border border-black/10 px-3 outline-none focus:border-ink-900"
            />
          </label>
          <p className="text-xs text-ink-700/50">
            Requires the <code>send-review-requests</code> Edge Function + scheduled job — see
            supabase/functions/send-review-requests/README.md.
          </p>
        </div>
      </div>

      <Button type="submit" variant="secondary" size="lg" disabled={saving} className="self-start">
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
      </Button>
    </form>
  );
}
