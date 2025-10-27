document.addEventListener('DOMContentLoaded', async () => {
    try {
      await authWrapper.init();
      await authWrapper.requireAuthOrRedirect('index.html');

      // Live session check every 60s
      setInterval(async () => {
        const session = await authWrapper.getSession();
        if (!session) {
          console.warn("Session expired, redirecting to login...");
          location.href = 'index.html';
        }
      }, 60000);

      // Redirect immediately if logout triggered
      authWrapper.on('logout', () => {
        console.warn("User logged out, redirecting to login...");
        location.href = 'index.html';
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
      await authWrapper.init();
      await authWrapper.requireAuthOrRedirect('index.html');

      // Live session check every 60s
      setInterval(async () => {
        const session = await authWrapper.getSession();
        if (!session) {
          console.warn("Session expired, redirecting to login...");
          location.href = 'index.html';
        }
      }, 60000);

      // Redirect immediately if logout triggered
      authWrapper.on('logout', () => {
        console.warn("User logged out, redirecting to login...");
        location.href = 'index.html';
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