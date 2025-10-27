// app-logic.js — Fully Cleaned and Reconstructed Version (Async Safe, No Top-Level Await)


// --- App Initialization Function ---
window.initApp = async function () {
  try {
    console.info("[initApp] Initializing app UI...");

    // Retrieve authenticated user info from Supabase
    const { data: { user } = {} } = await window.supabaseClient.auth.getUser();

    // If user found, greet them in the console and page
    if (user && user.email) {
      console.info(`[initApp] Welcome, ${user.email}`);
      const banner = document.createElement('div');
      banner.textContent = `Welcome, ${user.email}`;
      banner.style.position = 'fixed';
      banner.style.top = '10px';
      banner.style.right = '10px';
      banner.style.padding = '10px 16px';
      banner.style.background = '#3F5B48';
      banner.style.color = 'white';
      banner.style.fontWeight = '600';
      banner.style.borderRadius = '8px';
      banner.style.zIndex = '9999';
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 5000);
    } else {
      console.warn("[initApp] No user info found.");
    }

    // Additional app logic placeholder
    console.info("[initApp] Dashboard modules ready.");
  } catch (err) {
    console.error("[initApp] Initialization error:", err);
  }
};


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
