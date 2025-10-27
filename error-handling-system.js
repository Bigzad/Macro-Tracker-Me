/**
 * Global Error Handling System (Cleaned + Safe Version)
 * -----------------------------------------------------
 * Logs all global errors and unhandled promise rejections.
 * Displays UI notifications if showNotification() is available.
 * Does NOT reload or reinitialize any scripts.
 */

(function() {
  console.info("✅ Error handling system active (monitoring global errors)");

  let lastError = null;
  let lastTime = 0;

  function shouldNotify(msg) {
    const now = Date.now();
    if (msg === lastError && now - lastTime < 2000) return false;
    lastError = msg;
    lastTime = now;
    return true;
  }

  window.onerror = function (message, source, lineno, colno, error) {
    console.error("⚠️ Global Error:", message, "at", source + ":" + lineno + ":" + colno, error || "");
    if (typeof showNotification === "function" && shouldNotify(message)) {
      showNotification("App Error", message || "An unknown error occurred.", "error");
    }
  };

  window.onunhandledrejection = function (event) {
    console.error("⚠️ Unhandled Promise Rejection:", event.reason);
    if (typeof showNotification === "function" && shouldNotify(event.reason)) {
      showNotification("Unhandled Promise", event.reason?.message || event.reason || "A background error occurred.", "error");
    }
  };
})();
