// app-logic.js — Fully Cleaned and Reconstructed Version (Async Safe, No Top-Level Await)

(async () => {
  try {
    // Ensure Supabase client is ready
    if (!window.supabaseClient) {
      console.error("Supabase client not initialized.");
      return;
    }

    console.info("[app-logic] Starting app initialization...");

    // Wait for InitializationManager to be ready
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

    // Retrieve Supabase session safely
    const sessionData = await window.supabaseClient.auth.getSession();
    const session = sessionData?.data?.session || null;

    if (!session) {
      console.warn("[app-logic] No active session found. Redirecting...");
      window.location.href = "index.html";
      return;
    }

    console.info("✅ Session validated, initializing app...");

    // Initialize the app if initApp() exists
    if (typeof window.initApp === "function") {
      try {
        await window.initApp();
        console.info("[app-logic] App initialized successfully.");
      } catch (initErr) {
        console.error("[app-logic] Error inside initApp():", initErr);
      }
    } else {
      console.warn("[app-logic] initApp() not found.");
    }

  } catch (err) {
    console.error("[app-logic] Initialization error:", err);
    window.location.href = "index.html";
  }
})(); // End of IIFE
