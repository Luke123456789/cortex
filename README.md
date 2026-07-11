# Cortex

Gamified revision app for James, rebuilt as a plain React + Supabase + Netlify
stack. Single reward mechanism: correct answers and completed challenges earn
minutes of screen time. Redeeming is a request/approve flow between James and
Dave — there is no live integration with Family Link.

## Stack

- React + Vite
- Supabase (Postgres + realtime) for the ledger and redemption requests
- Netlify for hosting and continuous deployment from GitHub

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase project URL and anon key
3. In the Supabase SQL editor, run `supabase/schema.sql` to create the tables
4. Set up the two accounts (see below)
5. `npm run dev`

## Accounts

There's no public sign-up screen on purpose — only two people should ever be
able to log in. Create both manually:

1. Supabase → Authentication → Users → Add user. Do this twice, once for
   yourself and once for James, each with an email and a password you set.
   Tick "Auto confirm user" so there's no email verification step to deal
   with.
2. Copy each user's UUID from that same Users list.
3. In the SQL editor:

```sql
insert into public.profiles (id, role, display_name) values
  ('DAVE_AUTH_UUID_HERE', 'parent', 'Dave'),
  ('JAMES_AUTH_UUID_HERE', 'student', 'James');
```

That's it — role is now tied to the actual logged-in account, checked by the
database on every read and write via RLS. A student account physically
cannot log a `spend` ledger entry or approve a redemption request, and a
parent account cannot log an `earn` entry, regardless of what the frontend
code does or doesn't stop them from clicking.

Worth turning off while you're in Supabase's Auth settings: Authentication →
Providers → Email → disable "Allow new users to sign up". There's no sign-up
form in the app, but there's no reason to leave the door open at the API
level either.

## Deploying

Push to GitHub, connect the repo in Netlify (build command `npm run build`,
publish directory `dist`), and add the two `VITE_SUPABASE_*` environment
variables in Netlify's site settings. Every push to main redeploys.

## How the redeem flow works right now

1. James taps **Redeem** on the home screen and picks how many minutes he wants
2. That writes a row to `redemption_requests` with `status = 'pending'`
3. A push notification fires to Dave's device (see below)
4. Dave actions it manually (adds bonus time in Family Link, unlocks the phone,
   whatever) outside the app
5. Dave approves the request on `/parent`, which logs a `spend` ledger entry
   and drops James's balance

## Push notifications

Notifications go over the browser's native Web Push API — no third-party
notification service, nothing to sign up for. This means:

- It only works over HTTPS (Netlify gives you this automatically) and only
  once the app has been loaded at least once so the service worker registers
- On Android, notifications work in a normal browser tab, no install needed
- On iOS, Safari only delivers web push to a PWA that's been added to the
  home screen first (Share → Add to Home Screen) — this is an Apple
  restriction, not something the app can work around

### One-time setup

1. **Generate a VAPID key pair.** I've already generated one for you:

   ```
   Public:  BL6H1Iis1Yc261J7_OfgYM3zBO95gjh19F_N6l9m6-yHH383jZHkQwt9DFQX52TLSKaYW5JXkstdi_qKppCDRo0
   Private: _7xEdEuvOs9WVXvwAvOtPafEljwn7ZQUwi8Bq4Mfjio
   ```

   The public key goes in Netlify. The private key must **never** appear in
   Netlify or in git — it only ever lives as a Supabase Edge Function secret.

2. **Netlify** → Site configuration → Environment variables → add
   `VITE_VAPID_PUBLIC_KEY` with the public key above. Redeploy.

3. **Supabase** → Edge Functions → Secrets → add three secrets:
   - `VAPID_PUBLIC_KEY` — same public key as above
   - `VAPID_PRIVATE_KEY` — the private key above
   - `VAPID_SUBJECT` — `mailto:` plus your own email address (required by
     the push spec so push services can contact you if something's misusing
     the key)
   - `REDEMPTION_WEBHOOK_SECRET` — make up any long random string yourself,
     e.g. `openssl rand -hex 32` in a terminal, or just mash the keyboard.
     This stops anyone else from calling the function directly.

4. **Deploy the Edge Function.** In Supabase: Edge Functions → Deploy a new
   function → Via Editor → name it `notify-redemption` → paste in the
   contents of `supabase/functions/notify-redemption/index.ts` → Deploy.

5. **Wire up the trigger.** Supabase → Database → Webhooks → Create a new
   webhook:
   - Table: `redemption_requests`
   - Events: `Insert`
   - Type: HTTP request → your `notify-redemption` function's URL
   - Add an HTTP header: `x-webhook-secret` = the same value you set for
     `REDEMPTION_WEBHOOK_SECRET`

6. **Run the updated `schema.sql`** in the SQL editor (adds the
   `push_subscriptions` table) if you haven't already.

7. On Dave's phone, open the site, go to `/parent`, and tap **Enable
   notifications on this device**. James does the same thing on his own
   device from the home screen (`/`) — subscriptions are tagged `parent` or
   `student` so each device only gets notified about what's relevant to it.

From then on:
- New request → pushes to `parent` devices (`notify-redemption`)
- Approved or denied → pushes to `student` devices (`notify-redemption-resolved`)

### Second Edge Function + trigger

Repeat steps 4–5 above for a second function:

- Deploy `supabase/functions/notify-redemption-resolved/index.ts` as a new
  function named `notify-redemption-resolved`, with the same three secrets
  already in place from the first function (no need to re-add them, they're
  shared across all your Edge Functions in the project)
- Wire it up with SQL rather than the dashboard's trigger dialog (the "Pick a
  function" list there only shows Postgres functions, not Edge Functions):

```sql
create or replace function public.notify_redemption_resolved()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://mkmzesmzwjcfxtvayvlz.supabase.co/functions/v1/notify-redemption-resolved',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'PASTE_YOUR_REDEMPTION_WEBHOOK_SECRET_HERE'
    ),
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'redemption_requests',
      'record', to_jsonb(new),
      'old_record', to_jsonb(old)
    )
  );
  return new;
end;
$$;

drop trigger if exists redemption_request_resolved on public.redemption_requests;

create trigger redemption_request_resolved
after update on public.redemption_requests
for each row execute function public.notify_redemption_resolved();
```

Same as before, remember to turn off "Enforce JWT Verification" on the
`notify-redemption-resolved` function itself.

## Folder structure

```
src/
  components/   BalanceCard, LedgerList, ChallengeList, RedeemModal
  pages/        Home.jsx (James's screen), Parent.jsx (Dave's approval screen)
  hooks/        useLedger.js - fetches entries + balance, subscribes to realtime changes
  lib/          supabaseClient.js
  styles/       theme.css - the ledger/passbook design tokens
supabase/
  schema.sql
```
