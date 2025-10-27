// Wait for Supabase to restore session
    const session = await authWrapper.getSession();

    if (!session) {
      console.warn("No active session found. Redirecting...");
      location.href = "index.html";
      return;
    }

    console.info("✅ Session validated, initializing app...");
    
    if (typeof initApp === "function") initApp();
  } catch (err) {
    console.error("Auth initialization error:", err);
    location.href = "index.html";
  }
});
    } catch (err) {
      console.error("Auth initialization error:", err);
      location.href = 'index.html';
    }
  });

// Safe InitializationManager wrapper (singleton guard)
  if (!window.InitializationManager) {
    class InitializationManager {
      constructor() {
        if (window.initManager) return window.initManager;
        window.initManager = this;
        this.ready = false;
      }
    }
    window.InitializationManager = InitializationManager;
  }
  if (!window.initManager) window.initManager = new window.InitializationManager();

// Wait for Supabase to restore session
    const session = await authWrapper.getSession();

    if (!session) {
      console.warn("No active session found. Redirecting...");
      location.href = "index.html";
      return;
    }

    console.info("✅ Session validated, initializing app...");
    
    if (typeof initApp === "function") initApp();
  } catch (err) {
    console.error("Auth initialization error:", err);
    location.href = "index.html";
  }
});
    } catch (err) {
      console.error("Auth initialization error:", err);
      location.href = 'index.html';
    }
  });

// Safe InitializationManager wrapper (singleton guard)
  if (!window.InitializationManager) {
    class InitializationManager {
      constructor() {
        if (window.initManager) return window.initManager;
        window.initManager = this;
        this.ready = false;
      }
    }
    window.InitializationManager = InitializationManager;
  }
  if (!window.initManager) window.initManager = new window.InitializationManager();
document.addEventListener("DOMContentLoaded", async () => {
  let tries = 0;
  while ((!window.initManager || !window.initManager.sessionValidated) && tries < 50) {
    await new Promise(r => setTimeout(r, 100));
    tries++;
  }
  if (!window.initManager || !window.initManager.sessionValidated) {
    console.warn("Session not validated by InitializationManager; aborting app init.");
    return;
  }
  try {
    if (typeof window.initApp === "function") {
      await window.initApp();
    }
  } catch (e) {
    console.error("App initialization failed:", e);
  }
});
