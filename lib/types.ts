export type OrderStatus = "new" | "preparing" | "delivered" | "cancelled";
export type WaiterCallStatus = "pending" | "acknowledged";

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_snapshot: number;
  quantity: number;
  notes: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  table_number: number;
  status: OrderStatus;
  notes: string | null;
  total: number;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRow[];
}

export interface WaiterCallRow {
  id: string;
  table_number: number;
  status: WaiterCallStatus;
  created_at: string;
  acknowledged_at: string | null;
}

/** A single line in the customer's cart, kept client-side until checkout. */
export interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

/** Singleton row of restaurant-wide config: Wi-Fi, review link, timing. */
export interface RestaurantSettings {
  id: number;
  restaurant_name: string;
  wifi_ssid: string | null;
  wifi_password: string | null;
  wifi_security: "WPA" | "WEP" | "nopass";
  google_review_url: string | null;
  review_delay_minutes: number;
}

/**
 * One customer "visit" at a table, created as soon as the NFC landing page
 * loads. Used as the anchor for the delayed review-request job and to hold
 * the contact info the customer opted to share (phone and/or a Web Push
 * subscription).
 */
export interface CustomerSession {
  id: string;
  table_number: number;
  phone_number: string | null;
  push_subscription: PushSubscriptionJSON | null;
  consent_marketing: boolean;
  interaction_started_at: string;
  meal_completed_at: string | null;
  review_requested_at: string | null;
}
