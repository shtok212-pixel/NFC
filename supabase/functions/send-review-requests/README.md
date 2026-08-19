# send-review-requests

Scheduled Edge Function that closes the retention loop: **N minutes after a
table's meal is marked delivered** (or after their initial scan, if no order
was ever marked delivered), it texts or pushes them a link straight to the
Google review page.

## How it's triggered

`supabase/schema.sql` schedules a `pg_cron` job that calls this function's
HTTPS endpoint once a minute via `pg_net`. The cron job is just the clock —
all the logic (who's due, what to send, logging, idempotency) lives here.

## Deploy

```bash
supabase functions deploy send-review-requests

supabase secrets set \
  SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY \
  CRON_SHARED_SECRET=$(openssl rand -hex 32)

# SMS (pick one channel, or configure both — SMS is preferred per-session
# when a phone number was captured, falling back to push otherwise):
supabase secrets set \
  TWILIO_ACCOUNT_SID=... \
  TWILIO_AUTH_TOKEN=... \
  TWILIO_FROM_NUMBER=+15551234567

# Web Push (generate once with `npx web-push generate-vapid-keys`):
supabase secrets set \
  VAPID_PUBLIC_KEY=... \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:you@yourrestaurant.com
```

Then also set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value as `VAPID_PUBLIC_KEY`)
in the Next.js app's env — it's needed client-side to create the push
subscription.

## Wire up the cron job

Edit the `cron.schedule(...)` block at the bottom of `supabase/schema.sql`:
replace `YOUR-PROJECT-REF` and `YOUR-SERVICE-ROLE-KEY` (or better, the
`CRON_SHARED_SECRET` you generated above), then run that block in the SQL
editor. It only needs to be run once.

## Test it manually

```bash
curl -i -X POST \
  https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-review-requests \
  -H "Authorization: Bearer YOUR-CRON_SHARED_SECRET"
```

Seed a session that's already due to see it fire immediately:

```sql
insert into public.customer_sessions (table_number, phone_number, interaction_started_at)
values (1, '+15550000000', now() - interval '31 minutes');
```

## Notes

- Prices/messages are never trusted from the client — this function reads
  `restaurant_settings.google_review_url` and `review_delay_minutes` fresh
  from the database on every run.
- Every attempt (success or failure) is logged to `review_notifications`,
  and the session's `review_requested_at` is stamped immediately so it's
  never sent twice, even if the cron job overlaps itself.
- Web Push here intentionally sends **no encrypted payload** — the service
  worker (`app/sw.js/route.ts`) fetches the live review link from Supabase
  the moment the push arrives instead. That avoids implementing full RFC
  8291 payload encryption while still landing a real, clickable
  notification.
