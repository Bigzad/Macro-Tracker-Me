/**
 * INITIALIZATION SEQUENCE MANAGER (Unified Auth Compatible)
 * ----------------------------------------------------------
 * - Compatible with auth-manager.js unified system
 * - Automatically detects window.authWrapper (new system)
 * - Keeps backward-safe tracking for other components
 * - Minimal console output (only critical errors/warnings)
 */

class InitializationManager {
  constructor() {
    this.components = new Map();
    this.readyCallbacks = [];
    this.initialized = false;
    this.initializationStarted = false;

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

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.startInitialization());
    } else {
      setTimeout(() => this.startInitialization(), 0);
    }
  }

  registerComponent(name, instance = null) {
    if (this.componentStatus.hasOwnProperty(name)) {
      this.componentStatus[name] = true;
      this.components.set(name, instance);
      this.checkDependencies();
    } else {
      console.warn(`Unknown component registration: ${name}`);
    }
  }

  isComponentReady(name) {
    return this.componentStatus[name] === true;
  }

  getComponent(name) {
    return this.components.get(name) || null;
  }

  waitForComponents(componentNames, callback, timeout = 10000) {
    const checkReady = () => {
      const allReady = componentNames.every((n) => this.isComponentReady(n));
      if (allReady) {
        callback();
        return true;
      }
      return false;
    };
    if (checkReady()) return;
    const start = Date.now();
    const interval = setInterval(() => {
      if (checkReady()) clearInterval(interval);
      else if (Date.now() - start > timeout) {
        clearInterval(interval);
        console.warn(`Timeout waiting for components: ${componentNames.join(", ")}`);
        callback(true);
      }
    }, 100);
  }

  async startInitialization() {
    if (this.initializationStarted) return;
    this.initializationStarted = true;

    try {
      await this.initializePhase1();
      await this.initializePhase2();
      await this.initializePhase3();
      await this.initializePhase4();
      this.initialized = true;
      this.executeReadyCallbacks();
    } catch (err) {
      console.error("Initialization failed:", err);
      this.executeReadyCallbacks(true);
    }
  }

  async initializePhase1() {
    if (typeof window.supabase !== "undefined" && window.supabaseClient) {
      this.registerComponent("supabaseClient", window.supabaseClient);
    }
    await this.delay(300);
  }

  async initializePhase2() {
    if (window.errorHandler) this.registerComponent("errorHandler", window.errorHandler);
    if (window.JSON && window.JSON.safeParse)
      this.registerComponent("safeJSON", window.JSON);
    await this.delay(150);
  }

  async initializePhase3() {
    if (window.enhancedDB) this.registerComponent("enhancedDB", window.enhancedDB);
    if (window.networkMonitor) this.registerComponent("networkMonitor", window.networkMonitor);
    if (window.dbRecovery) this.registerComponent("dbRecovery", window.dbRecovery);
    await this.delay(200);
  }

  async initializePhase4() {
    // Detect new unified auth wrapper gracefully
    const tryRegisterAuth = () => {
      if (window.authWrapper) {
        this.registerComponent("authWrapper", window.authWrapper);
        return true;
      }
      return false;
    };

    // Attempt detection up to 10 times (over 2s)
    let attempts = 0;
    while (!tryRegisterAuth() && attempts < 10) {
      await this.delay(200);
      attempts++;
    }

    if (!this.isComponentReady("authWrapper")) {
      console.warn("authWrapper not found after timeout (degraded mode).");
    }

    if (window.originalFetchStored) this.registerComponent("securityMiddleware", true);
    await this.delay(150);
  }

  onReady(cb) {
    if (this.initialized) cb();
    else this.readyCallbacks.push(cb);
  }

  executeReadyCallbacks(degraded = false) {
    this.readyCallbacks.forEach((cb) => {
      try {
        cb(degraded);
      } catch (e) {
        console.error("Error in ready callback:", e);
      }
    });
    this.readyCallbacks = [];
  }

  getSystemStatus() {
    const ready = Object.values(this.componentStatus).filter(Boolean).length;
    const total = Object.keys(this.componentStatus).length;
    return {
      initialized: this.initialized,
      readiness: Math.round((ready / total) * 100),
      componentStatus: { ...this.componentStatus },
    };
  }

  createSafeAccessor(globalName, fallback = null) {
    return () => {
      const comp = window[globalName];
      if (comp) return comp;
      console.warn(`${globalName} not available, using fallback`);
      return fallback;
    };
  }

  delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  checkDependencies() {
    if (!this.initializationStarted) return;
    // No verbose logging — silent unless critical.
  }
}

// Global exposure
window.initManager = new InitializationManager();
window.safeGetSupabaseClient = window.initManager.createSafeAccessor("supabaseClient", null);
window.safeGetErrorHandler = window.initManager.createSafeAccessor("errorHandler", {
  logError: () => console.error,
  validateInput: () => ({ valid: true }),
});
window.safeGetEnhancedDB = window.initManager.createSafeAccessor("enhancedDB", {
  enhancedJSONParse: JSON.parse,
  enhancedJSONStringify: JSON.stringify,
  enhancedLocalStorage: localStorage,
});

console.info("Initialization Manager (unified auth version) loaded.");
