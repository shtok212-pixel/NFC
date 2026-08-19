"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Wifi, Copy, Check, QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { RestaurantSettings } from "@/lib/types";

/** Builds the standard `WIFI:` URI that phone cameras auto-detect and offer
 *  to join, so a QR scan is a genuine one-tap connect (no typing). */
function buildWifiUri(settings: RestaurantSettings): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  const security = settings.wifi_security === "nopass" ? "nopass" : settings.wifi_security;
  const pass = settings.wifi_security === "nopass" ? "" : `P:${esc(settings.wifi_password ?? "")};`;
  return `WIFI:T:${security};S:${esc(settings.wifi_ssid ?? "")};${pass};`;
}

export function WifiCard({ settings }: { settings: RestaurantSettings }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!settings.wifi_ssid) return null;

  async function copyPassword() {
    if (!settings.wifi_password) return;
    try {
      await navigator.clipboard.writeText(settings.wifi_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — password is still visible on screen.
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Wifi className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">Free Wi-Fi</p>
          <p className="truncate text-sm text-ink-700/70">{settings.wifi_ssid}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQr((v) => !v)}
          aria-label="Show Wi-Fi QR code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </div>

      {showQr ? (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-black/5 pt-4">
          <div className="rounded-xl border border-black/10 bg-white p-3">
            <QRCodeSVG value={buildWifiUri(settings)} size={168} />
          </div>
          <p className="text-center text-xs text-ink-700/60">
            Scan with your camera app to join automatically
          </p>
        </div>
      ) : settings.wifi_password ? (
        <button
          onClick={copyPassword}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-left"
        >
          <span className="font-mono text-sm text-ink-800">{settings.wifi_password}</span>
          {copied ? (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 shrink-0 text-ink-700/50" />
          )}
        </button>
      ) : null}
    </div>
  );
}
