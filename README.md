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
3. Dave actions it manually (adds bonus time in Family Link, unlocks the phone,
   whatever) outside the app
4. Dave approves the request on `/parent`, which logs a `spend` ledger entry
   and drops James's balance

There's no notification wired up yet — `/parent` is a polling page you'd check
manually. A next step would be a Supabase database webhook that pings Dave
(email, Telegram, Pushover) the moment a request is inserted.

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
