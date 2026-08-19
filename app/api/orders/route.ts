import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isValidTableNumber } from "@/lib/utils";

interface IncomingItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

/**
 * Places an order. Runs server-side with the service-role key so it can:
 *   - re-read prices from menu_items via the create_order RPC (never trust
 *     the client-submitted price), and
 *   - insert the order + order_items atomically even though the customer
 *     is unauthenticated (RLS has no public insert policy on `orders`).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const tableNumber = Number(body?.tableNumber);
  const items: IncomingItem[] = Array.isArray(body?.items) ? body.items : [];

  if (!isValidTableNumber(tableNumber)) {
    return NextResponse.json({ error: "Invalid table number" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }
  if (items.some((i) => !i.menuItemId || !Number.isFinite(i.quantity) || i.quantity <= 0)) {
    return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("create_order", {
    p_table_number: tableNumber,
    p_notes: null,
    p_items: items.map((i) => ({
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      notes: i.notes ?? null,
    })),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
