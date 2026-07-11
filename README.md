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
4. `npm run dev`

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
   notifications on this device**. That's the subscribe step — it stores the
   device's push subscription in `push_subscriptions` so the Edge Function
   knows where to send to.

From then on, every new redemption request pushes a notification straight to
that device.

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
