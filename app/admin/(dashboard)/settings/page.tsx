import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/SettingsForm";
import type { RestaurantSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle();

  const initial: RestaurantSettings =
    (data as RestaurantSettings) ?? {
      id: 1,
      restaurant_name: "Our Restaurant",
      wifi_ssid: null,
      wifi_password: null,
      wifi_security: "WPA",
      google_review_url: null,
      review_delay_minutes: 30,
    };

  return <SettingsForm initial={initial} />;
}
