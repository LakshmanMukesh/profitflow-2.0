const SUPABASE_URL = "https://pfuvmsqrgczjcywnniwb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdXZtc3FyZ2N6amN5d25uaXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODU0MjcsImV4cCI6MjA5Nzg2MTQyN30.xmLbR2q7Bna7nLRsa0J8_iDGu-0PNLoqrHpv1MKgwW8";

const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

window.supabaseClient = supabaseClient;