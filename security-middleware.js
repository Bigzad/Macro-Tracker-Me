/**
 * SECURITY MIDDLEWARE (Unified Auth Compatible, Fallback Mode)
 * ------------------------------------------------------------
 * - Works with auth-manager.js unified system
 * - Attaches Supabase access_token only to Supabase REST API calls
 * - Retries once on 401 Unauthorized
 * - Operates in fallback mode (never blocks app)
 * - Registers itself in initManager (if present)
 * - Logs only warnings/errors (silent otherwise)
 */

;(function () {
  if (window.__SECURITY_MIDDLEWARE_READY__) return;
  const SUPABASE_URL = "https://xnpsjajyjtczlxciatfy.supabase.co";
  const ORIGINAL_FETCH = window.fetch;

  async function getAccessToken() {
    try {
      if (window.authWrapper && typeof window.authWrapper.getSession === "function") {
        const session = await window.authWrapper.getSession();
        return session?.access_token || null;
      }
      if (window.supabaseClient?.auth?.getSession) {
        const { data } = await window.supabaseClient.auth.getSession();
        return data?.session?.access_token || null;
      }
    } catch (err) {
      console.warn("[security-middleware] Failed to get access token:", err);
    }
    return null;
  }

  async function securedFetch(input, init = {}) {
    const url = typeof input === "string" ? input : input.url;
    const isSupabase = url.startsWith(SUPABASE_URL);
    let token = null;

    // Try to get token safely
    try {
      token = await getAccessToken();
    } catch (err) {
      console.warn("[security-middleware] Token retrieval failed:", err);
    }

    // Clone init safely
    const newInit = { ...init, headers: new Headers(init.headers || {}) };
    if (isSupabase && token) {
      newInit.headers.set("Authorization", `Bearer ${token}`);
    } else if (isSupabase && !token) {
      console.warn("[security-middleware] No token available for Supabase request (fallback mode).");
    }

    let response = await ORIGINAL_FETCH(input, newInit);
    if (isSupabase && response.status === 401 && token) {
      console.warn("[security-middleware] 401 detected, retrying once with refreshed token...");
      const refreshed = await getAccessToken();
      if (refreshed && refreshed !== token) {
        newInit.headers.set("Authorization", `Bearer ${refreshed}`);
        response = await ORIGINAL_FETCH(input, newInit);
      }
    }
    return response;
  }

  try {
    // Patch fetch globally
    window.originalFetchStored = ORIGINAL_FETCH;
    window.fetch = securedFetch;
    window.__SECURITY_MIDDLEWARE_READY__ = true;

    // Register with initManager if available
    if (window.initManager && typeof window.initManager.registerComponent === "function") {
      window.initManager.registerComponent("securityMiddleware", true);
    }
  } catch (err) {
    console.error("[security-middleware] Initialization failed:", err);
  }
})();
