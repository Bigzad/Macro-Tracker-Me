// ========================
// 📚 RECIPES MODULE
// ========================
// Handles recipe search/filter, add custom recipe, clear custom, and
// "show more/less" behavior in the grid.

(function () {
  function $(id) { return document.getElementById(id); }

  // Basic in-memory + localStorage recipe store
  window.recipes = window.recipes || [];
  window.customRecipes = window.customRecipes || [];

  function saveCustomRecipes() {
    try { localStorage.setItem("customRecipes", JSON.stringify(window.customRecipes||[])); }
    catch(e){ console.error("[recipes] Failed to save custom recipes:", e); }
  }
  function loadCustomRecipes() {
    try {
      const raw = localStorage.getItem("customRecipes");
      const arr = raw ? JSON.parse(raw) : [];
      window.customRecipes = Array.isArray(arr) ? arr : [];
    } catch(e){
      console.error("[recipes] Failed to load custom recipes:", e);
      window.customRecipes = [];
    }
  }

  function recipeCard(r) {
    const card = document.createElement("div");
    card.className = "recipe-card bg-white p-4 rounded-lg border shadow-sm";
    card.setAttribute("data-category", r.category || "");
    card.setAttribute("data-calories", r.calories || 0);
    card.innerHTML = `
      <div class="font-bold text-gray-800 mb-1">${r.name}</div>
      <div class="text-sm text-gray-600 mb-2">${r.servings || ""}</div>
      <div class="text-xs text-gray-500 mb-2">${r.calories} cal • ${r.protein}g P • ${r.carbs}g C • ${r.fat}g F</div>
      <div class="mt-2">
        <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">Add to Planner</button>
      </div>`;
    card.querySelector("button").addEventListener("click", () => {
      // Add to "breakfast" by default (user can move later) — or copy into tracker
      window.planner = window.planner || {};
      const day = window.currentDay || "monday";
      if (!window.planner[day]) window.planner[day] = { breakfast: [], lunch: [], dinner: [] };
      if (!window.planner[day].breakfast) window.planner[day].breakfast = [];
      window.planner[day].breakfast.push({
        id: Date.now(),
        name: r.name,
        calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat
      });
      try { localStorage.setItem("planner", JSON.stringify(window.planner)); } catch(e){}
      if (window.selectDay) window.selectDay(day); // re-render
    });
    return card;
  }

  function renderRecipes(list) {
    const grid = $("recipesContainer");
    const showMore = $("showMoreContainer");
    if (!grid) return;
    grid.innerHTML = "";
    const MAX = 9;
    list.forEach((r, idx) => {
      const card = recipeCard(r);
      if (idx >= MAX) card.classList.add("hidden","_extra");
      grid.appendChild(card);
    });
    if (list.length > MAX) {
      showMore?.classList.remove("hidden");
      $("hiddenCount") && ( $("hiddenCount").textContent = String(list.length - MAX) );
    } else {
      showMore?.classList.add("hidden");
    }
  }

  // ---------------- Public API ----------------
  window.toggleRecipeDisplay = function toggleRecipeDisplay() {
    const grid = $("recipesContainer");
    if (!grid) return;
    const extras = grid.querySelectorAll("._extra");
    let anyShown = false;
    extras.forEach(el => {
      if (el.classList.contains("hidden")) { el.classList.remove("hidden"); anyShown = true; }
      else { el.classList.add("hidden"); }
    });
    $("showMoreBtn") && ( $("showMoreBtn").innerHTML = anyShown
      ? '<i class="fas fa-chevron-up mr-2"></i>Show Less'
      : `<i class="fas fa-chevron-down mr-2"></i>Show More Recipes (<span id="hiddenCount">${extras.length}</span> hidden)`);
  };

  window.toggleAddRecipeForm = function toggleAddRecipeForm() {
    const form = $("addRecipeForm");
    if (!form) return;
    form.classList.toggle("hidden");
  };

  window.saveCustomRecipe = function saveCustomRecipe() {
    const name = $("newRecipeName")?.value?.trim();
    const category = $("newRecipeCategory")?.value || "custom";
    const calories = Number($("newRecipeCalories")?.value || 0);
    const protein  = Number($("newRecipeProtein")?.value || 0);
    const carbs    = Number($("newRecipeCarbs")?.value || 0);
    const fat      = Number($("newRecipeFat")?.value || 0);
    const servings = $("newRecipeServings")?.value || "";
    const ingredients = $("newRecipeIngredients")?.value || "";
    const instructions = $("newRecipeInstructions")?.value || "";

    if (!name) return;

    const rec = { name, category, calories, protein, carbs, fat, servings, ingredients, instructions };
    window.customRecipes.push(rec);
    saveCustomRecipes();

    // Reset form and hide
    ["newRecipeName","newRecipeCalories","newRecipeProtein","newRecipeCarbs","newRecipeFat","newRecipeServings","newRecipeIngredients","newRecipeInstructions"].forEach(id => {
      if ($(id)) $(id).value = "";
    });
    window.toggleAddRecipeForm();
    // Re-filter to include custom
    window.filterRecipes();
  };

  window.clearCustomRecipes = function clearCustomRecipes() {
    window.customRecipes = [];
    saveCustomRecipes();
    window.filterRecipes();
  };

  window.filterRecipes = function filterRecipes() {
    const q = ($("recipeSearch")?.value || "").toLowerCase();
    const cat = $("recipeFilter")?.value || "";
    const cal = $("caloryRange")?.value || "";

    // The app didn't ship with a built-in recipe dataset; we merge custom only.
    const base = (window.recipes || []).concat(window.customRecipes || []);

    const list = base.filter(r => {
      if (q && !String(r.name || "").toLowerCase().includes(q)) return false;
      if (cat && String(r.category || "") !== cat) return false;
      if (cal) {
        const c = Number(r.calories || 0);
        if (cal === "0-300" && !(c < 300)) return false;
        if (cal === "300-500" && !(c >=300 && c <=500)) return false;
        if (cal === "500-700" && !(c > 500 && c <=700)) return false;
        if (cal === "700+" && !(c > 700)) return false;
      }
      return true;
    });

    renderRecipes(list);
  };

  // ---------------- Boot ----------------
  loadCustomRecipes();
  // initial render (empty unless user adds)
  renderRecipes((window.recipes || []).concat(window.customRecipes || []));
})();