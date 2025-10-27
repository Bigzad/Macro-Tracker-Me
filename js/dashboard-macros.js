// ========================
// 📦 MACRO / CHARTS MODULE (Colored Donuts)
// ========================
// Handles: daily target calculation, progress bars, donut charts (Chart.js)

(function () {
  window.dailyTargets = window.dailyTargets || { calories: 2000, protein: 150, carbs: 250, fat: 67 };
  window.meals = window.meals || [];
  window.charts = window.charts || { calories: null, protein: null, carbs: null, fat: null };

  function $(id) { return document.getElementById(id); }
  function pct(part, whole) { return Math.max(0, Math.min(100, whole ? (part / whole) * 100 : 0)); }

  // Color mapping
  const COLORS = {
    calories: "#3B82F6", // blue
    protein: "#EF4444",  // red
    carbs: "#22C55E",    // green
    fat: "#F59E0B"       // orange
  };

  function mkDonut(ctx, color) {
    return new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Progress", "Remaining"],
        datasets: [{
          data: [0, 100],
          backgroundColor: [color, "#E5E7EB"], // main color + light gray remainder
          borderWidth: 0
        }]
      },
      options: {
        cutout: "70%",
        plugins: { legend: { display: false } },
        animation: false
      }
    });
  }

  function ensureCharts() {
    if (!window.charts.calories) {
      const c = $("caloriesChart");
      if (c) window.charts.calories = mkDonut(c.getContext("2d"), COLORS.calories);
    }
    if (!window.charts.protein) {
      const c = $("proteinChart");
      if (c) window.charts.protein = mkDonut(c.getContext("2d"), COLORS.protein);
    }
    if (!window.charts.carbs) {
      const c = $("carbsChart");
      if (c) window.charts.carbs = mkDonut(c.getContext("2d"), COLORS.carbs);
    }
    if (!window.charts.fat) {
      const c = $("fatChart");
      if (c) window.charts.fat = mkDonut(c.getContext("2d"), COLORS.fat);
    }
  }

  // ---- Public: Calculate targets from form ----
  window.calculateMacros = function calculateMacros() {
    const age = parseFloat($("age")?.value) || 25;
    const gender = $("gender")?.value || "male";
    const weight = parseFloat($("weight")?.value) || 152.19;
    const height = parseFloat($("height")?.value) || 66.9291;
    const activity = parseFloat($("activity")?.value) || 1.55;
    const goal = parseFloat($("goal")?.value) || -500;

    const weightKg = weight * 0.453592;
    const heightCm = height * 2.54;

    let bmr;
    if (gender === "male") {
      bmr = 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
    } else {
      bmr = 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
    }

    const tdee = bmr * activity;
    const dailyCalories = Math.max(1200, Math.round(tdee + goal));

    const protein = Math.round((dailyCalories * 0.30) / 4);
    const carbs   = Math.round((dailyCalories * 0.40) / 4);
    const fat     = Math.round((dailyCalories * 0.30) / 9);

    window.dailyTargets = { calories: dailyCalories, protein, carbs, fat };

    $("dailyCalories") && ( $("dailyCalories").textContent = dailyCalories.toLocaleString() );
    $("proteinAmount") && ( $("proteinAmount").textContent = protein + "g" );
    $("carbsAmount")   && ( $("carbsAmount").textContent   = carbs + "g" );
    $("fatAmount")     && ( $("fatAmount").textContent     = fat   + "g" );

    localStorage.setItem("dailyTargets", JSON.stringify(window.dailyTargets));
    updateProgress();
  };

  window.updateProgress = function updateProgress() {
    ensureCharts();

    const totals = window.meals.reduce((acc, m) => {
      acc.calories += Number(m.calories || 0);
      acc.protein  += Number(m.protein  || 0);
      acc.carbs    += Number(m.carbs    || 0);
      acc.fat      += Number(m.fat      || 0);
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const bp = pct(totals.protein,  window.dailyTargets.protein);
    const bc = pct(totals.carbs,    window.dailyTargets.carbs);
    const bf = pct(totals.fat,      window.dailyTargets.fat);
    const bcal = pct(totals.calories, window.dailyTargets.calories);

    // Update bars and charts
    const updates = [
      ["proteinBar", bp],
      ["carbsBar", bc],
      ["fatBar", bf],
      ["caloriesBar", bcal]
    ];
    updates.forEach(([id, val]) => {
      const el = $(id);
      if (el) el.style.width = val + "%";
    });

    if (window.charts.calories) {
      window.charts.calories.data.datasets[0].data = [bcal, 100 - bcal];
      window.charts.calories.update("none");
    }
    if (window.charts.protein) {
      window.charts.protein.data.datasets[0].data = [bp, 100 - bp];
      window.charts.protein.update("none");
    }
    if (window.charts.carbs) {
      window.charts.carbs.data.datasets[0].data = [bc, 100 - bc];
      window.charts.carbs.update("none");
    }
    if (window.charts.fat) {
      window.charts.fat.data.datasets[0].data = [bf, 100 - bf];
      window.charts.fat.update("none");
    }

    $("dailyProgress") && ( $("dailyProgress").textContent = Math.round(bcal) + "%" );
  };

  (function restoreTargets() {
    try {
      const saved = JSON.parse(localStorage.getItem("dailyTargets") || "null");
      if (saved && typeof saved === "object") {
        window.dailyTargets = saved;
        $("dailyCalories") && ( $("dailyCalories").textContent = saved.calories.toLocaleString() );
        $("proteinAmount") && ( $("proteinAmount").textContent = saved.protein + "g" );
        $("carbsAmount")   && ( $("carbsAmount").textContent   = saved.carbs   + "g" );
        $("fatAmount")     && ( $("fatAmount").textContent     = saved.fat     + "g" );
      }
    } catch (e) {}
    setTimeout(updateProgress, 0);
  })();
})();