/* ============================================================
   Atlas — Supabase Client Configuration
   ============================================================
   Replace SUPABASE_URL and SUPABASE_ANON_KEY with the values
   from your Supabase project:
     Project Settings → API → Project URL / anon public key
   ============================================================ */

const SUPABASE_URL  = 'https://uxapzlnsprrojekbvkmy.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_CMC-kVTb1Mb_Y2NfjP-LmQ_8xt9ywA4';

// Supabase JS v2 is loaded via CDN in each HTML page.
// This file just exposes the initialised client as `db`.
const db = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession:     true,
        autoRefreshToken:   true,
        detectSessionInUrl: true,
        storageKey:         'atlas-auth',
      },
    })
  : null;
