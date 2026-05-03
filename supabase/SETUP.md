# Atlas — Supabase Setup Guide

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region closest to your users (e.g. US East).
3. Set a strong database password and save it.

## 2. Run the schema

In the Supabase dashboard, go to **Database → SQL Editor** and run the contents of `schema.sql`.

This creates:
- `profiles` — one row per user, auto-created on sign-up
- `roads` — all mapped US driving roads
- `road_reviews` — community reviews (1 per user per road)
- `saved_routes` — bookmarked roads per user
- `contact_messages` — contact form submissions
- `road_conditions` — crowdsourced real-time alerts

Row Level Security is enabled on all tables.

## 3. Seed the roads

Still in SQL Editor, run the contents of `seed.sql`.

This inserts all 45 US driving roads into the `roads` table.

## 4. Configure the frontend

Open `config.js` and replace the placeholder values:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_PUBLIC_KEY';
```

Find these values in **Project Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_KEY`

## 5. Configure Auth

In **Authentication → Settings**:
- Set **Site URL** to your deployed domain (or `http://localhost:3000` for local dev)
- Enable **Email confirmations** (recommended for production)
- Optionally disable email confirmations for local testing

## 6. Test locally

Open `index.html` in a browser (use a local server, e.g. `npx serve .`).

- Click **Sign In** → the auth modal should appear
- Create an account → check your email for confirmation
- Sign in → your email should appear in the nav
- On the All Roads map, click a road → a **Save** button appears

## Table overview

| Table | Read | Write |
|---|---|---|
| profiles | Public | Own row only |
| roads | Public | Admin only |
| road_reviews | Public | Authenticated (own) |
| saved_routes | Own only | Own only |
| contact_messages | — | Anyone (insert) |
| road_conditions | Public | Authenticated |
