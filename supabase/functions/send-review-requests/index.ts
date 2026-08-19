// Supabase Edge Function: send-review-requests
//
// Invoked every minute by the pg_cron + pg_net schedule at the bottom of
// supabase/schema.sql. Finds every customer_sessions row whose 30-minute
// (configurable) window has elapsed since the anchor timestamp
// (meal_completed_at if the order was marked delivered, otherwise
// interaction_started_at) and no review request has gone out yet, then:
//   - texts them via Twilio if they left a phone number, or
//   - sends a Web Push notification (VAPID, no payload — see app/sw.js)
//     if they enabled push instead.
// The link routes through our own /review rating screen when app_base_url
// is configured (rating first, then a positive visit continues on to
// Google), falling back to the Google listing directly otherwise. Delivery
// attempts are logged to review_notifications and the session is stamped
// so it's never sent twice.
//
// Deploy:   supabase functions deploy send-review-requests
// Secrets:  supabase secrets set \
//             SUPABASE_URL=... \
//             SUPABASE_SERVICE_ROLE_KEY=... \
//             CRON_SHARED_SECRET=... \
//             TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... \
//             VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
//
// This function has verify_jwt = false (see supabase/config.toml) because
// it's called by pg_net with a plain bearer token, not an end-user Supabase
// session — so it checks CRON_SHARED_SECRET itself instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SHARED_SECRET = Deno.env.get("CRON_SHARED_SECRET"); // optional but recommended

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

interface CustomerSession {
  id: string;
  table_number: number;
  phone_number: string | null;
  push_subscription: { endpoint: string; keys?: Record<string, string> } | null;
}

Deno.serve(async (req) => {
  if (CRON_SHARED_SECRET) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${CRON_SHARED_SECRET}` && auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: settings } = await supabase
    .from("restaurant_settings")
    .select("google_review_url, review_delay_minutes, restaurant_name, app_base_url")
    .eq("id", 1)
    .maybeSingle();

  const delayMinutes = settings?.review_delay_minutes ?? 30;
  const restaurantName = settings?.restaurant_name ?? "us";

  if (!settings?.google_review_url) {
    return Response.json({ ok: true, skipped: "no google_review_url configured" });
  }

  // Prefer routing through our own /review page (rating first, then a
  // positive visit continues on to Google) over linking straight to the
  // public listing — see components/customer/ReviewScreen.tsx.
  function buildLink(tableNumber: number): string {
    if (settings!.app_base_url) {
      return `${settings!.app_base_url.replace(/\/$/, "")}/review?table=${tableNumber}`;
    }
    return settings!.google_review_url!;
  }

  const cutoff = new Date(Date.now() - delayMinutes * 60_000).toISOString();

  // Anchor is meal_completed_at when we have it (order delivered), else
  // fall back to interaction_started_at (initial NFC scan).
  const { data: due, error } = await supabase
    .from("customer_sessions")
    .select("id, table_number, phone_number, push_subscription")
    .is("review_requested_at", null)
    .or("phone_number.not.is.null,push_subscription.not.is.null")
    .or(`meal_completed_at.lte.${cutoff},and(meal_completed_at.is.null,interaction_started_at.lte.${cutoff})`);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const sessions = (due ?? []) as CustomerSession[];
  const results: Array<{ id: string; channel: string; status: string }> = [];

  for (const session of sessions) {
    const link = buildLink(session.table_number);
    const message = `Thanks for dining with ${restaurantName}! We'd love your feedback: ${link}`;
    let outcome: { channel: "sms" | "push"; status: "sent" | "failed"; response?: string } | null = null;

    if (session.phone_number && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER) {
      outcome = await sendSms(session.phone_number, message);
    } else if (session.push_subscription && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      outcome = await sendPush(session.push_subscription, VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }

    if (!outcome) {
      // No usable channel / missing provider secrets — mark skipped so we
      // don't retry it every minute forever.
      await supabase
        .from("customer_sessions")
        .update({ review_requested_at: new Date().toISOString(), review_status: "skipped" })
        .eq("id", session.id);
      results.push({ id: session.id, channel: "none", status: "skipped" });
      continue;
    }

    await supabase.from("review_notifications").insert({
      customer_session_id: session.id,
      channel: outcome.channel,
      status: outcome.status,
      provider_response: outcome.response ?? null,
    });

    await supabase
      .from("customer_sessions")
      .update({
        review_requested_at: new Date().toISOString(),
        review_status: outcome.status,
      })
      .eq("id", session.id);

    results.push({ id: session.id, channel: outcome.channel, status: outcome.status });
  }

  return Response.json({ ok: true, processed: results.length, results });
});

// ----------------------------------------------------------------------------
// SMS via Twilio
// ----------------------------------------------------------------------------
async function sendSms(to: string, body: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER!, Body: body }),
  });

  const text = await res.text();
  return { channel: "sms" as const, status: res.ok ? ("sent" as const) : ("failed" as const), response: text.slice(0, 500) };
}

// ----------------------------------------------------------------------------
// Web Push via VAPID (RFC 8292), no payload — see app/sw.js/route.ts, which
// fetches the review link fresh at push time instead of decrypting a body.
// ----------------------------------------------------------------------------
async function sendPush(
  subscription: { endpoint: string; keys?: Record<string, string> },
  subject: string,
  publicKey: string,
  privateKey: string
) {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
    const jwt = await buildVapidJwt(audience, subject, privateKey);

    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt}, k=${publicKey}`,
        TTL: "600",
        "Content-Length": "0",
      },
    });

    return {
      channel: "push" as const,
      status: res.ok ? ("sent" as const) : ("failed" as const),
      response: `${res.status}`,
    };
  } catch (e) {
    return { channel: "push" as const, status: "failed" as const, response: String(e) };
  }
}

async function buildVapidJwt(audience: string, subject: string, privateKeyB64Url: string) {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const unsigned =
    base64UrlEncode(encoder.encode(JSON.stringify(header))) +
    "." +
    base64UrlEncode(encoder.encode(JSON.stringify(payload)));

  const key = await importVapidPrivateKey(privateKeyB64Url);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned));

  return unsigned + "." + base64UrlEncode(new Uint8Array(signature));
}

async function importVapidPrivateKey(privateKeyB64Url: string) {
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY!);
  const privateKeyBytes = base64UrlDecode(privateKeyB64Url);

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
    ext: true,
  };

  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
