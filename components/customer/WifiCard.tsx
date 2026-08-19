"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Wifi, Copy, Check } from "lucide-react";
import type { RestaurantSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Builds the standard `WIFI:` URI that phone cameras auto-detect and offer
 *  to join, so a QR scan is a genuine one-tap connect (no typing). This is
 *  also the only *real* one-tap join mechanism available from a web page —
 *  there's no browser API that joins a network for the user directly — so
 *  the primary action below opens straight to it instead of hiding it. */
function buildWifiUri(settings: RestaurantSettings): string {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  const security = settings.wifi_security === "nopass" ? "nopass" : settings.wifi_security;
  const pass = settings.wifi_security === "nopass" ? "" : `P:${esc(settings.wifi_password ?? "")};`;
  return `WIFI:T:${security};S:${esc(settings.wifi_ssid ?? "")};${pass};`;
}

/**
 * The welcome screen's primary call to action. Collapsed, it's a single
 * large pill button. Tapping it expands a connect panel (QR to scan with
 * the camera, plus a tap-to-copy password as a fallback) and the button
 * itself flips to a "connected" state — mirroring how joining Wi-Fi from
 * a lock-screen prompt actually feels on iOS.
 */
export function WifiCard({ settings }: { settings: RestaurantSettings }) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
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
    <div className="flex flex-col gap-3">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!connected) setConnected(true);
        }}
        className={cn(
          "flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-[18px] text-[16px] font-bold tracking-tight text-ink-900 shadow-[0_14px_30px_-12px_rgba(200,121,59,0.65)] transition-transform active:scale-[0.97]",
          connected
            ? "bg-gradient-to-br from-sage-500 to-sage-600 shadow-[0_14px_30px_-12px_rgba(124,160,133,0.55)]"
            : "bg-gradient-to-br from-brand-400 to-brand-600"
        )}
      >
        {connected ? <Check className="h-[19px] w-[19px]" /> : <Wifi className="h-[19px] w-[19px]" />}
        {connected ? `Connected · ${settings.wifi_ssid}` : "Connect to Free Wi-Fi"}
      </button>

      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={buildWifiUri(settings)} size={150} />
            </div>
            <p className="text-center text-xs text-white/60">
              Scan with your camera app to join automatically
            </p>
            {settings.wifi_password ? (
              <button
                onClick={copyPassword}
                className="flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-left"
              >
                <span>
                  <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    Password
                  </span>
                  <span className="font-mono text-sm text-white">{settings.wifi_password}</span>
                </span>
                {copied ? (
                  <Check className="h-4 w-4 shrink-0 text-sage-500" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-white/50" />
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
