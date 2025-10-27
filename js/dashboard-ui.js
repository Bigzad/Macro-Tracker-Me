// ========================
// 🧭 UI & SIDEBAR / UNITS
// ========================

(function () {
  function $(id) { return document.getElementById(id); }

  // Sidebar
  window.toggleSidebar = function toggleSidebar() {
    const menu = $("sidebar-menu");
    const overlay = $("sidebar-overlay");
    if (!menu || !overlay) return;
    menu.classList.toggle("sidebar-open");
    overlay.classList.toggle("sidebar-overlay-visible");
    document.body.classList.toggle("sidebar-no-scroll");
  };

  window.closeSidebar = function closeSidebar() {
    const menu = $("sidebar-menu");
    const overlay = $("sidebar-overlay");
    if (!menu || !overlay) return;
    menu.classList.remove("sidebar-open");
    overlay.classList.remove("sidebar-overlay-visible");
    document.body.classList.remove("sidebar-no-scroll");
  };

  // Units
  window.changeUnitSystem = function changeUnitSystem() {
    // Persist selected unit system; form labels remain as-is (imperial defaults in UI)
    const desktop = $("unitSystem");
    const mobile  = $("unitSystemMobile") || $("mobile-unit-system");
    const value = (desktop && desktop.value) || (mobile && mobile.value) || "imperial";
    localStorage.setItem("unitSystem", value);
  };
  window.changeUnitSystemMobile = function changeUnitSystemMobile() {
    window.changeUnitSystem();
  };

  // Restore saved unit system
  (function restoreUnits() {
    const saved = localStorage.getItem("unitSystem");
    if (!saved) return;
    const selects = ["unitSystem","unitSystemMobile","mobile-unit-system"].map($(id=>id));
    const s1 = $("unitSystem"); if (s1) s1.value = saved;
    const s2 = $("unitSystemMobile"); if (s2) s2.value = saved;
    const s3 = $("mobile-unit-system"); if (s3) s3.value = saved;
  })();
})();
