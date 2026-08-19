import { NextResponse } from "next/server";

/**
 * Serves the Web Push service worker from a Route Handler instead of a
 * static /public/sw.js file so we can inline the (public) Supabase URL/anon
 * key at request time — the SW has no access to process.env otherwise.
 *
 * At push time (no payload — see supabase/functions/send-review-requests)
 * it fetches the live Google review link straight from Supabase so the
 * notification always points at the current link, then opens it on click.
 */
export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const script = `
const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let reviewUrl = "/";
      try {
        const res = await fetch(
          SUPABASE_URL + "/rest/v1/restaurant_settings?select=google_review_url&id=eq.1",
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY } }
        );
        const rows = await res.json();
        if (rows?.[0]?.google_review_url) reviewUrl = rows[0].google_review_url;
      } catch (e) {
        // Fall back to "/" if Supabase is unreachable — still shows the notification.
      }

      await self.registration.showNotification("How was your meal?", {
        body: "We'd love your feedback — tap to leave a quick review.",
        data: { url: reviewUrl },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
`.trim();

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache",
    },
  });
}
