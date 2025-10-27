// app-logic.js — Fixed Version (Safe Async + Initialization Guard)

(async () => {
  try {
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized.");
      return;
    }

    console.info("[app-logic] Starting app initialization...");

    let waitCount = 0;
    while ((!window.initManager || !window.initManager.sessionValidated) && waitCount < 50) {
      await new Promise(r => setTimeout(r, 100));
      waitCount++;
    }

    if (!window.initManager || !window.initManager.sessionValidated) {
      console.warn("[app-logic] Session not validated by InitializationManager — redirecting to login.");
      window.location.href = "index.html";
      return;
    }

    const { data: { session } = {} } = await window.supabaseClient.auth.getSession();

    if (!session) {
      console.warn("[app-logic] No active session found. Redirecting...");
      window.location.href = "index.html";
      return;
    }

    console.info("✅ Session validated, initializing app...");

    if (typeof window.initApp === "function") {
      await window.initApp();
      console.info("[app-logic] App initialized successfully.");
    } else {
      console.warn("[app-logic] initApp() not found.");
    }

  } catch (err) {
    console.error("[app-logic] Initialization error:", err);
    window.location.href = "index.html";
  }
})();