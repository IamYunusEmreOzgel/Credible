const SUPABASE_URL = "https://ukjxnwrhwkatigkuigjn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3FfYy6BTuF5v8hLUXBywdg_d_P5_QM-";

window.credibleSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);