"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — safe to use in client components. Uses the
 * public anon key, so it is bound by the RLS policies in supabase/schema.sql
 * (public menu reads, authenticated-only writes to orders/waiter_calls).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
