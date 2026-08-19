-- ============================================================================
-- NFC Table Ordering — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type order_status as enum ('new', 'preparing', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type waiter_call_status as enum ('pending', 'acknowledged');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tables (physical restaurant tables, keyed by the number encoded in the NFC tag)
-- ----------------------------------------------------------------------------
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  table_number int not null unique,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Menu categories (Starters, Mains, Desserts, Drinks, ...)
-- ----------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Menu items
-- ----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists menu_items_category_idx on public.menu_items(category_id);

-- ----------------------------------------------------------------------------
-- Orders + line items
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  table_number int not null,
  status order_status not null default 'new',
  notes text,
  total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_table_idx on public.orders(table_number);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  price_snapshot numeric(10, 2) not null,
  quantity int not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- "Call Waiter" alerts
-- ----------------------------------------------------------------------------
create table if not exists public.waiter_calls (
  id uuid primary key default gen_random_uuid(),
  table_number int not null,
  status waiter_call_status not null default 'pending',
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create index if not exists waiter_calls_status_idx on public.waiter_calls(status);

-- ----------------------------------------------------------------------------
-- Restaurant-wide settings (singleton row) — Wi-Fi credentials shown on the
-- welcome screen, the Google review link, and how long to wait before
-- sending the review request.
-- ----------------------------------------------------------------------------
create table if not exists public.restaurant_settings (
  id int primary key default 1,
  restaurant_name text not null default 'Our Restaurant',
  wifi_ssid text,
  wifi_password text,
  wifi_security text not null default 'WPA', -- 'WPA' | 'WEP' | 'nopass'
  google_review_url text,
  review_delay_minutes int not null default 30,
  -- Deployed URL of the Next.js app (e.g. https://order.yourrestaurant.com),
  -- no trailing slash. When set, the review-request job links to
  -- {app_base_url}/review?table=N — the in-app rating screen — instead of
  -- straight to google_review_url, so a rough visit becomes private
  -- feedback rather than a public 1-star review. Falls back to linking
  -- directly to google_review_url when left blank.
  app_base_url text,
  updated_at timestamptz not null default now(),
  constraint restaurant_settings_singleton check (id = 1)
);

insert into public.restaurant_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists restaurant_settings_set_updated_at on public.restaurant_settings;
create trigger restaurant_settings_set_updated_at
  before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Customer sessions — one row per visit, created the moment the NFC landing
-- page loads. This is the growth/retention anchor:
--   * interaction_started_at -> when they first scanned the tag
--   * meal_completed_at      -> set automatically once their order is
--                               marked "delivered" (see trigger below)
--   * phone_number / push_subscription -> opt-in contact info captured on
--     the welcome screen (e.g. "connect to Wi-Fi + get your receipt")
--   * review_requested_at    -> stamped by the scheduled job once the
--                               30-minute-later review request has been sent
-- ----------------------------------------------------------------------------
create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  table_number int not null,
  phone_number text,
  push_subscription jsonb,
  consent_marketing boolean not null default false,
  interaction_started_at timestamptz not null default now(),
  meal_completed_at timestamptz,
  review_requested_at timestamptz,
  review_status text not null default 'pending' -- 'pending' | 'sent' | 'failed' | 'skipped'
);

create index if not exists customer_sessions_table_idx on public.customer_sessions(table_number);
create index if not exists customer_sessions_due_idx
  on public.customer_sessions(review_requested_at)
  where review_requested_at is null;

-- Audit trail of outbound review-request attempts (SMS / push).
create table if not exists public.review_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_session_id uuid not null references public.customer_sessions(id) on delete cascade,
  channel text not null, -- 'sms' | 'push'
  status text not null,  -- 'sent' | 'failed'
  provider_response text,
  sent_at timestamptz not null default now()
);

-- When an order for a table is marked "delivered", stamp meal_completed_at
-- on the most recent open session for that table. This becomes the anchor
-- for the 30-minute review timer instead of the initial scan time, so the
-- request lands shortly after the meal — not mid-meal.
create or replace function public.mark_meal_completed()
returns trigger as $$
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    update public.customer_sessions
    set meal_completed_at = now()
    where table_number = new.table_number
      and meal_completed_at is null
      and review_requested_at is null
      and id = (
        select id from public.customer_sessions
        where table_number = new.table_number
          and review_requested_at is null
        order by interaction_started_at desc
        limit 1
      );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists orders_mark_meal_completed on public.orders;
create trigger orders_mark_meal_completed
  after update on public.orders
  for each row execute function public.mark_meal_completed();

-- ----------------------------------------------------------------------------
-- updated_at trigger for orders
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RPC: create_order — atomically inserts an order + its line items.
-- Prices are re-read from menu_items server-side (never trusted from the
-- client) so the total cannot be tampered with. Called from the /api/orders
-- route using the service-role key.
-- ----------------------------------------------------------------------------
create or replace function public.create_order(
  p_table_number int,
  p_notes text,
  p_items jsonb -- [{ "menu_item_id": "uuid", "quantity": 2, "notes": "no onions" }, ...]
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_menu_item public.menu_items;
  v_total numeric(10,2) := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  insert into public.orders (table_number, notes, status, total)
  values (p_table_number, p_notes, 'new', 0)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item
    from public.menu_items
    where id = (v_item->>'menu_item_id')::uuid
      and is_available = true;

    if not found then
      raise exception 'Menu item % is not available', (v_item->>'menu_item_id');
    end if;

    insert into public.order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity, notes)
    values (
      v_order.id,
      v_menu_item.id,
      v_menu_item.name,
      v_menu_item.price,
      greatest((v_item->>'quantity')::int, 1),
      v_item->>'notes'
    );

    v_total := v_total + (v_menu_item.price * greatest((v_item->>'quantity')::int, 1));
  end loop;

  update public.orders set total = v_total where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.waiter_calls enable row level security;

-- Menu is public read-only for anyone (customers browsing without login).
drop policy if exists "public read categories" on public.menu_categories;
create policy "public read categories" on public.menu_categories
  for select using (is_active = true);

drop policy if exists "public read menu items" on public.menu_items;
create policy "public read menu items" on public.menu_items
  for select using (is_available = true);

drop policy if exists "public read tables" on public.restaurant_tables;
create policy "public read tables" on public.restaurant_tables
  for select using (is_active = true);

-- Orders / order_items / waiter_calls are written by the server (service
-- role, which bypasses RLS) via API routes. Authenticated staff (admin
-- dashboard) can read and update everything in real time.
drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders" on public.orders
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders
  for update using (auth.role() = 'authenticated');

drop policy if exists "staff read order items" on public.order_items;
create policy "staff read order items" on public.order_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff read waiter calls" on public.waiter_calls;
create policy "staff read waiter calls" on public.waiter_calls
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff update waiter calls" on public.waiter_calls;
create policy "staff update waiter calls" on public.waiter_calls
  for update using (auth.role() = 'authenticated');

drop policy if exists "staff manage menu" on public.menu_items;
create policy "staff manage menu" on public.menu_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff manage categories" on public.menu_categories;
create policy "staff manage categories" on public.menu_categories
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table public.restaurant_settings enable row level security;
alter table public.customer_sessions enable row level security;
alter table public.review_notifications enable row level security;

-- Wi-Fi credentials + review link must be readable by anyone on the welcome
-- screen (no auth yet at that point).
drop policy if exists "public read settings" on public.restaurant_settings;
create policy "public read settings" on public.restaurant_settings
  for select using (true);

drop policy if exists "staff manage settings" on public.restaurant_settings;
create policy "staff manage settings" on public.restaurant_settings
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- customer_sessions / review_notifications are written by the server
-- (service role via /api/customer-session and the review-request Edge
-- Function) and only ever read by authenticated staff.
drop policy if exists "staff read sessions" on public.customer_sessions;
create policy "staff read sessions" on public.customer_sessions
  for select using (auth.role() = 'authenticated');

drop policy if exists "staff read notifications" on public.review_notifications;
create policy "staff read notifications" on public.review_notifications
  for select using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Realtime — required so the admin dashboard receives live INSERT/UPDATE
-- events for new orders, status changes and waiter calls.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.waiter_calls;

-- ============================================================================
-- Scheduled trigger: "30 minutes after the meal, ask for a review"
--
-- Supabase runs Postgres with pg_cron + pg_net available. This schedules a
-- job that, every minute, calls the `send-review-requests` Edge Function
-- (supabase/functions/send-review-requests). The function does the actual
-- work (finding due sessions, sending SMS/push, stamping review_requested_at)
-- — the cron job here is just the "clock".
--
-- Setup (run once, after deploying the Edge Function):
--   1. `supabase functions deploy send-review-requests`
--   2. Replace the two placeholders below with your project ref and the
--      function's service-role invocation secret, then run this block.
-- ============================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-review-requests-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-review-requests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To inspect scheduled runs: select * from cron.job_run_details order by start_time desc limit 20;
-- To remove the schedule:    select cron.unschedule('send-review-requests-every-minute');
