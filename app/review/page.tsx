import { createClient } from "@/lib/supabase/server";
import { ReviewScreen } from "@/components/customer/ReviewScreen";
import type { RestaurantSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Landing page for the link in the review-request SMS/push (see
 * supabase/functions/send-review-requests) — rating happens here first,
 * and only then does a positive visit continue on to the public Google
 * listing. Table number is optional context carried through as `?table=`.
 */
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("restaurant_settings")
    .select("restaurant_name, google_review_url")
    .eq("id", 1)
    .maybeSingle();

  const settings = data as Pick<RestaurantSettings, "restaurant_name" | "google_review_url"> | null;
  const tableNumber = searchParams.table ? Number(searchParams.table) : undefined;

  return (
    <ReviewScreen
      restaurantName={settings?.restaurant_name ?? "us"}
      tableNumber={Number.isFinite(tableNumber) ? tableNumber : undefined}
      googleReviewUrl={settings?.google_review_url ?? null}
    />
  );
}
