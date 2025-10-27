// === Initialization Manager (Unified + Cleaned) ===
// Ensures single instance, session validation, and dependency sync

if (!window.InitializationManager) {
  class InitializationManager {
    constructor() {
      if (window.initManager) return window.initManager;

      this.components = new Map();
      this.componentStatus = {
        supabaseClient: false,
        errorHandler: false,
        enhancedDB: false,
        networkMonitor: false,
        dbRecovery: false,
        authWrapper: false,
        safeJSON: false,
        securityMiddleware: false,
      };

      this.readyCallbacks = [];
      this.initialized = false;
      this.initializationStarted = false;
      this.sessionValidated = false;

      window.initManager = this;
      this._init();
    }

    _init() {
      if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", () => this.startInitialization());
      else setTimeout(() => this.startInitialization(), 0);
    }

    registerComponent(name, instance = null) {
      if (this.componentStatus.hasOwnProperty(name)) {
        this.componentStatus[name] = true;
        this.components.set(name, instance);
      }
    }

    isComponentReady(name) {
      return this.componentStatus[name] === true;
    }

    getComponent(name) {
      return this.components.get(name) || null;
    }

    delay(ms) {
      return new Promise(res => setTimeout(res, ms));
    }

    async startInitialization() {
      if (this.initializationStarted) return;
      this.initializationStarted = true;

      try {
        await this.initializePhases();
        this.initialized = true;
        this.executeReadyCallbacks();
      } catch (err) {
        console.error("Initialization failed:", err);
        this.executeReadyCallbacks(true);
      }
    }

    async initializePhases() {
      if (window.supabaseClient) this.registerComponent("supabaseClient", window.supabaseClient);
      await this.delay(200);

      if (window.errorHandler) this.registerComponent("errorHandler", window.errorHandler);
      if (window.enhancedDB) this.registerComponent("enhancedDB", window.enhancedDB);
      if (window.networkMonitor) this.registerComponent("networkMonitor", window.networkMonitor);
      await this.delay(200);

      for (let i = 0; i < 10; i++) {
        if (window.authWrapper) {
          this.registerComponent("authWrapper", window.authWrapper);
          break;
        }
        await this.delay(200);
      }

      if (!this.isComponentReady("authWrapper")) {
        console.warn("[InitializationManager] authWrapper not found — degraded mode.");
      }

      if (window.originalFetchStored) this.registerComponent("securityMiddleware", true);
      await this.delay(100);

      await this.validateSessionGate();
    }

    async validateSessionGate() {
      if (this.sessionValidated) return;
      let tries = 0;

      while ((!window.authWrapper || !window.supabaseClient) && tries < 20) {
        await this.delay(100);
        tries++;
      }

      const session =
        (window.authWrapper && (await window.authWrapper.getSession())) || null;

      if (!session) {
        console.warn("No active session found. Redirecting to login...");
        window.location.href = "index.html";
        return;
      }

      this.sessionValidated = true;
      this.executeReadyCallbacks();
      console.info("✅ Session validated by InitializationManager");
    }

    onReady(cb) {
      if (this.initialized) cb();
      else this.readyCallbacks.push(cb);
    }

    executeReadyCallbacks(degraded = false) {
      this.readyCallbacks.forEach(cb => {
        try {
          cb(degraded);
        } catch (e) {
          console.error("Error in ready callback:", e);
        }
      });
      this.readyCallbacks = [];
    }
  }

  window.InitializationManager = InitializationManager;
  window.initManager = new InitializationManager();

  window.safeGetSupabaseClient = () =>
    window.supabaseClient || console.warn("Supabase client not ready yet.");

  console.info("InitializationManager loaded (clean version)");
} else {
  console.info("InitializationManager already exists — resuming.");
  if (window.initManager && typeof window.initManager.startInitialization === "function") {
    window.initManager.startInitialization();
  }
}