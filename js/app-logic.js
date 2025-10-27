document.addEventListener("DOMContentLoaded", async () => {
  try {
    await new Promise(res => setTimeout(res, 500)); // Wait for Supabase to restore session
    const session = await authWrapper.getSession();

    if (!session) {
      console.warn("No active session found. Redirecting...");
      location.href = "index.html";
      return;
    }

    console.info("✅ Session validated, initializing app...");
    await authWrapper.requireAuthOrRedirect('index.html');
    if (typeof initApp === "function") initApp();
  } catch (err) {
    console.error("Auth initialization error:", err);
    location.href = "index.html";
  }
});
