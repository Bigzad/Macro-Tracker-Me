// ========================
// 📊 PROGRESS (7‑day) MODULE
// ========================

(function () {
  // This module provides a minimal functional baseline so your dashboard loads.
  // It records today's totals into macroHistory when called, and can clear data.

  function todayKey(d=new Date()) {
    return d.toISOString().slice(0,10);
  }

  function saveHistory() {
    try { localStorage.setItem("macroHistory", JSON.stringify(window.macroHistory||[])); }
    catch(e){ console.error("[progress] Failed to save macroHistory:", e); }
  }
  function loadHistory() {
    try {
      const raw = localStorage.getItem("macroHistory");
      const arr = raw ? JSON.parse(raw) : [];
      window.macroHistory = Array.isArray(arr) ? arr : [];
    } catch(e){
      console.error("[progress] Failed to load macroHistory:", e);
      window.macroHistory = [];
    }
  }

  // Public: append today's totals from window.meals
  window.saveDailyMacros = async function saveDailyMacros() {
    const totals = (window.meals||[]).reduce((a,m)=>{
      a.protein+=Number(m.protein||0); a.carbs+=Number(m.carbs||0); a.fat+=Number(m.fat||0);
      a.calories+=Number(m.calories||0); return a;
    }, {protein:0,carbs:0,fat:0,calories:0});
    const key = todayKey();
    const existing = (window.macroHistory||[]).find(x=>x.date===key);
    if (existing) Object.assign(existing, totals);
    else (window.macroHistory||[]).push({ date:key, ...totals });
    saveHistory();
  };

  window.clearMacroProgress = function clearMacroProgress() {
    window.macroHistory = [];
    saveHistory();
    // In a fuller build, you'd also clear charts/table; baseline leaves UI minimal.
  };

  loadHistory();
})();
