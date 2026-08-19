import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidTableNumber } from "@/lib/utils";

/**
 * Creates/updates the customer_sessions row for the current visit. Called:
 *   1. Once, silently, when the welcome screen loads (anchors
 *      interaction_started_at — the fallback start of the 30-minute timer).
 *   2. Again if the customer opts in with a phone number and/or subscribes
 *      to Web Push, so the review-request job has somewhere to send to.
 *
 * Written with the service-role key because customer_sessions holds contact
 * info that must never be readable by the public anon key (see RLS in
 * supabase/schema.sql — only "staff read sessions" exists, no public policy).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const tableNumber = Number(body.tableNumber);
  if (!isValidTableNumber(tableNumber)) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  const phoneNumber: string | null =
    typeof body.phoneNumber === "string" && body.phoneNumber.trim() ? body.phoneNumber.trim() : null;
  const pushSubscription = body.pushSubscription ?? null;
  const consentMarketing = Boolean(body.consentMarketing);

  const supabase = createServiceRoleClient();

  // Upsert: first call from a visit creates the row (anchoring the review
  // timer), later calls only patch in whatever contact info was just given.
  const { data: existing } = await supabase
    .from("customer_sessions")
    .select("id")
    .eq("id", body.sessionId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("customer_sessions").insert({
      id: body.sessionId,
      table_number: tableNumber,
      phone_number: phoneNumber,
      push_subscription: pushSubscription,
      consent_marketing: consentMarketing,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (phoneNumber || pushSubscription || consentMarketing) {
    const { error } = await supabase
      .from("customer_sessions")
      .update({
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        ...(pushSubscription ? { push_subscription: pushSubscription } : {}),
        ...(consentMarketing ? { consent_marketing: true } : {}),
      })
      .eq("id", body.sessionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
