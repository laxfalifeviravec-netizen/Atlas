/* ============================================================
   Atlas — Supabase Client Configuration
   ============================================================
   Replace SUPABASE_URL and SUPABASE_ANON_KEY with the values
   from your Supabase project:
     Project Settings → API → Project URL / anon public key
   ============================================================ */

const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY  = 'YOUR_ANON_PUBLIC_KEY';

// Supabase JS v2 is loaded via CDN in each HTML page.
// This file just exposes the initialised client as `db`.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
