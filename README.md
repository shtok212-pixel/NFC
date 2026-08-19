# NFC Table Ordering

A mobile-first digital menu + ordering system for restaurants. Customers tap
an NFC tag at their table, land on a menu locked to that table number, order
straight from their phone, and can call a waiter with one tap. Staff run a
real-time kitchen/floor dashboard from `/admin`.

Built with **Next.js 14 (App Router)**, **Tailwind CSS**, **Supabase**
(Postgres + Auth + Realtime + Edge Functions), and **Zustand**.

## Feature overview

- **NFC routing** — the tag encodes `/menu?table=N`; the app locks the
  session (cart, table number) to that table until a different table is
  scanned.
- **Customer app** — welcome screen, categorized menu, cart, checkout,
  live order-status tracking, "Call Waiter" FAB.
- **Guest Wi-Fi on the welcome screen** — SSID/password shown with a
  one-tap-copy password and a scannable `WIFI:` QR code.
- **Automated review requests** — customers can optionally leave a phone
  number or enable Web Push on the welcome screen; a scheduled job then
  texts/pushes them a link a configurable number of minutes (default 30)
  after their meal is marked delivered. That link opens `/review` — a
  bold 5-star rating screen — first; only 4–5 star visits continue on to
  your Google Business page, so a rough visit becomes private feedback
  instead of a public 1-star review. Set an **App URL** in
  `/admin/settings` to enable this routing; leave it blank to link
  straight to Google instead.
- **Admin dashboard** (`/admin`, Supabase-Auth gated) — real-time
  New → Preparing → Delivered board grouped by table, live "Call Waiter"
  alerts, and a settings page for Wi-Fi/review configuration.

## Project structure

```
app/
  page.tsx                   Landing screen ("scan the tag on your table")
  menu/page.tsx               Table-locked menu (reads ?table=)
  review/page.tsx              5-star rating screen (the review-request link opens here)
  admin/login/page.tsx         Staff sign-in
  admin/(dashboard)/           Auth-gated dashboard shell
    page.tsx                    Orders board
    settings/page.tsx            Wi-Fi / review settings
  api/orders/route.ts          Places an order (service role, atomic RPC)
  api/waiter-call/route.ts     Raises a "call waiter" alert
  api/customer-session/route.ts Captures the visit anchor + opt-in contact info
  sw.js/route.ts               Web Push service worker (served dynamically)
components/
  customer/                   WelcomeScreen, MenuList, MenuItemCard, CartDrawer, ...
  admin/                       OrdersDashboard, OrderCard, WaiterCallAlerts, ...
  ui/                          Small shared primitives (Button, Badge)
store/useCartStore.ts          Zustand cart + session state (persisted)
lib/                           Supabase clients, shared types, utils
supabase/
  schema.sql                   Full DB schema, RLS policies, RPC, cron schedule
  seed.sql                     Sample categories/items/tables/settings
  functions/send-review-requests/  Edge Function for the 30-minute review trigger
```

## Database schema (Supabase / Postgres)

Run `supabase/schema.sql` in the Supabase SQL editor, then `supabase/seed.sql`
for sample data. Summary of the tables it creates:

| Table                 | Purpose |
|------------------------|---------|
| `restaurant_tables`    | Physical tables, keyed by the number in the NFC URL |
| `menu_categories`      | Starters / Mains / Desserts / Drinks, etc. |
| `menu_items`           | Dishes — price, description, image, availability |
| `orders`               | One row per submitted cart; `status`: new → preparing → delivered |
| `order_items`          | Line items, with price/name **snapshotted** at order time |
| `waiter_calls`         | "Call Waiter" alerts, `status`: pending → acknowledged |
| `restaurant_settings`  | Singleton row: Wi-Fi creds, Google review URL, review delay |
| `customer_sessions`    | One row per visit — anchors the review timer, holds opt-in phone/push |
| `review_notifications` | Audit log of every review-request SMS/push attempt |

Row Level Security: the menu and Wi-Fi settings are public-read; orders,
waiter calls, and customer sessions are written only by the server (service
role) and readable/updatable only by authenticated staff — see the policies
at the bottom of `schema.sql` for the exact rules.

Prices are **never trusted from the client** — `/api/orders` calls the
`create_order` Postgres function, which re-reads each item's price from
`menu_items` and computes the total server-side.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project's URL/keys
npm run dev
```

1. Create a Supabase project, then run `supabase/schema.sql` followed by
   `supabase/seed.sql` in the SQL editor.
2. In **Authentication → Users**, manually create one staff account
   (email + password) — that's the "simple authentication" for `/admin`.
   There's no public sign-up flow by design.
3. Visit `http://localhost:3000/menu?table=1` to see the customer app, and
   `http://localhost:3000/admin` to sign in to the dashboard.

### Wiring up the 30-minute review trigger

The Wi-Fi card and phone/push capture work out of the box. The scheduled
send does not — it needs an Edge Function deployed and a cron job pointed
at it. Full instructions:
**`supabase/functions/send-review-requests/README.md`**.

Short version:
```bash
supabase functions deploy send-review-requests
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... CRON_SHARED_SECRET=...
supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
# then edit + run the `cron.schedule(...)` block at the bottom of schema.sql
```
Set your Wi-Fi credentials and Google review link from **/admin/settings**
(or directly in `restaurant_settings`).

## Programming the NFC tags

Write each table's tag with a standard NDEF URI record pointing at:

```
https://your-domain.com/menu?table=12
```

Any NFC-writing app (e.g. NFC Tools) can do this from a phone — no app
install required for guests, since tapping an NDEF URI tag just opens the
link in the browser.

## Deployment

Deploy the Next.js app to Vercel (or any Node host) with the same env vars
as `.env.local`, and deploy the Edge Function + cron schedule to your
Supabase project as described above.
