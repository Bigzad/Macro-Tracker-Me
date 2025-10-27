// ========================
// 🥗 MEALS MODULE
// ========================
// Handles: add/delete meals, list rendering, reset, basic persistence

(function () {
  function $(id) { return document.getElementById(id); }

  // ---- Persistence helpers ----
  function saveData() {
    try {
      localStorage.setItem("meals", JSON.stringify(window.meals || []));
    } catch (e) {
      console.error("[meals] Failed to save meals:", e);
    }
  }
  function loadData() {
    try {
      const raw = localStorage.getItem("meals");
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) window.meals = arr;
    } catch (e) {
      console.error("[meals] Failed to load meals:", e);
      window.meals = [];
    }
  }

  // ---- Public: Add & delete ----
  window.addMeal = function addMeal() {
    const name = $("mealName")?.value?.trim();
    const calories = parseFloat($("mealCalories")?.value) || 0;
    const protein  = parseFloat($("mealProtein")?.value)  || 0;
    const carbs    = parseFloat($("mealCarbs")?.value)    || 0;
    const fat      = parseFloat($("mealFat")?.value)      || 0;

    if (!name) {
      console.warn("[meals] Missing meal name.");
      return;
    }

    const meal = {
      id: Date.now(),
      name,
      calories: calories || Math.round(protein*4 + carbs*4 + fat*9),
      protein, carbs, fat
    };

    window.meals.push(meal);

    // clear form
    ["mealName","mealCalories","mealProtein","mealCarbs","mealFat"].forEach(id => { if($(id)) $(id).value=""; });

    updateMealsList();
    window.updateProgress && window.updateProgress();
    saveData();
  };

  window.deleteMeal = function deleteMeal(id) {
    window.meals = (window.meals || []).filter(m => m.id !== id);
    updateMealsList();
    window.updateProgress && window.updateProgress();
    saveData();
  };

  // ---- Render list ----
  window.updateMealsList = function updateMealsList() {
    const list = $("mealsList");
    if (!list) return;

    list.innerHTML = "";

    if (!window.meals || window.meals.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-center py-4">No meals logged yet. Add your first meal above!</p>';
      return;
    }

    window.meals.forEach(meal => {
      const row = document.createElement("div");
      row.className = "meal-item flex items-center justify-between p-3 bg-white border rounded-lg";
      row.innerHTML = `
        <div>
          <div class="font-medium text-gray-800">${meal.name}</div>
          <div class="text-xs text-gray-500">${Math.round(meal.calories)} cal • ${meal.protein}g P • ${meal.carbs}g C • ${meal.fat}g F</div>
        </div>
        <button class="text-red-600 hover:text-red-700" aria-label="Delete" title="Delete">
          <i class="fas fa-trash"></i>
        </button>`;
      row.querySelector("button").addEventListener("click", () => window.deleteMeal(meal.id));
      list.appendChild(row);
    });
  };

  // ---- Reset day ----
  window.resetTracker = function resetTracker() {
    window.meals = [];
    saveData();
    updateMealsList();
    window.updateProgress && window.updateProgress();
  };

  // ---- Load meals on page open ----
  window.loadTodayMeals = function loadTodayMeals() {
    loadData();
    updateMealsList();
    window.updateProgress && window.updateProgress();
  };

  // Initial load
  loadData();
  // Render once on module load
  setTimeout(() => {
    updateMealsList();
    window.updateProgress && window.updateProgress();
  }, 0);
})();
