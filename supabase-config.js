/* supabase-config.js — Single global client */
;(function () {
  if (window.supabaseClient && window.__SUPABASE_CLIENT_READY__) return;

  var SUPABASE_URL = "https://xnpsjajyjtczlxciatfy.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucHNqYWp5anRjemx4Y2lhdGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTQ4OTcsImV4cCI6MjA3Mzc5MDg5N30.DqwC4jIYskdU9iXX8c1pX6qkfX3Wvuwzx-VzySJ9YX0";

  if (!window.supabase) {
    console.error("[supabase-config] Expected @supabase/supabase-js v2 CDN before this file.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.__SUPABASE_CLIENT_READY__ = true;
  console.log("[supabase-config] Supabase client ready.");
})();