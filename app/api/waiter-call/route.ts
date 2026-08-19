import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidTableNumber } from "@/lib/utils";

/** Creates a "call waiter" alert for a table. Server-side (service role)
 *  for the same reason as /api/orders — no public insert policy on the
 *  underlying table, so unauthenticated customers go through here. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tableNumber = Number(body?.tableNumber);

  if (!isValidTableNumber(tableNumber)) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("waiter_calls")
    .insert({ table_number: tableNumber, status: "pending" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
