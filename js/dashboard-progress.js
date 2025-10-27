// ========================
// 📊 PROGRESS (7‑day) MODULE + TREND CHART
// ========================

(function () {
  function $(id) { return document.getElementById(id); }

  function todayKey(d=new Date()) { return d.toISOString().slice(0,10); }

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

  // ---- Public APIs ----
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
    updateAverages();
    renderTrend();
  };

  window.refreshMacroProgress = function refreshMacroProgress() {
    updateAverages();
    renderTrend();
  };

  window.clearMacroProgress = function clearMacroProgress() {
    window.macroHistory = [];
    saveHistory();
    updateAverages();
    renderTrend();
  };

  window.clearAllProgressData = function clearAllProgressData() {
    // Clears macroHistory and meals (progress components)
    window.macroHistory = [];
    try { localStorage.removeItem("macroHistory"); } catch(e){}
    if (Array.isArray(window.meals)) {
      window.meals = [];
      try { localStorage.setItem("meals", "[]"); } catch(e){}
    }
    if (window.updateMealsList) window.updateMealsList();
    if (window.updateProgress) window.updateProgress();
    updateAverages();
    renderTrend();
  };

  window.setProgressGoal = function setProgressGoal() {
    const weight = Number($("targetWeight")?.value || 0);
    const date = $("targetDate")?.value || "";
    try { localStorage.setItem("progressGoal", JSON.stringify({ weight, date })); } catch(e){}
    // Basic goal progress: count entries in macroHistory
    const entries = (window.macroHistory||[]).length;
    $("goalProgressPercent") && ( $("goalProgressPercent").textContent = (entries ? Math.min(100, entries * 10) : 0) + "%" );
    $("goalStatusText") && ( $("goalStatusText").textContent = date ? "Goal set" : "Set goal" );
  };

  // ---- Averages into the small cards ----
  function updateAverages() {
    const h = window.macroHistory || [];
    if (!h.length) {
      ["avgProtein","avgCarbs","avgFat"].forEach(id => { if($(id)) $(id).textContent = "0g"; });
      return;
    }
    const n = Math.min(7, h.length);
    const recent = h.slice(-n);
    const sum = recent.reduce((a,x)=>{
      a.protein += x.protein||0; a.carbs += x.carbs||0; a.fat += x.fat||0; return a;
    }, {protein:0,carbs:0,fat:0});
    $("avgProtein") && ( $("avgProtein").textContent = Math.round(sum.protein/n) + "g" );
    $("avgCarbs")   && ( $("avgCarbs").textContent   = Math.round(sum.carbs/n)   + "g" );
    $("avgFat")     && ( $("avgFat").textContent     = Math.round(sum.fat/n)     + "g" );
  }

  // ---- Trend Chart (calories last 7 days) ----
  let trendChart = null;
  function ensureTrendChart() {
    const canvas = $("macroTotalsChart");
    if (!canvas) return null;
    if (trendChart) return trendChart;
    trendChart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: { labels: [], datasets: [{ label: "Calories", data: [], borderWidth: 2, fill: false }] },
      options: { responsive: true, plugins: { legend: { display: false } }, animation: false }
    });
    return trendChart;
  }

  function renderTrend() {
    const chart = ensureTrendChart();
    if (!chart) return;
    const h = (window.macroHistory||[]).slice(-7);
    chart.data.labels = h.map(x => x.date.slice(5)); // MM-DD
    chart.data.datasets[0].data = h.map(x => x.calories || 0);
    chart.update("none");
  }

  // ---- Boot ----
  loadHistory();
  updateAverages();
  renderTrend();
})();