// ========================
// 🗓️ WEEKLY PLANNER MODULE
// ========================
// Stores per-day meal plans (breakfast/lunch/dinner + custom sections),
// renders the current day into the shared UI lists, and supports copying
// a day's plan into the Daily Macro Tracker.

(function () {
  // Days and default sections
  const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  const CORE_SECTIONS = ["breakfast","lunch","dinner"];

  function $(id) { return document.getElementById(id); }
  function text(el, v){ if(el) el.textContent = v; }
  function num(v){ return Number(v || 0); }

  // State persisted in localStorage
  window.planner = window.planner || null;
  window.currentDay = window.currentDay || "monday";
  window.customSections = window.customSections || []; // names (lowercase, slugged)

  // ---------------- Persistence ----------------
  function loadPlanner() {
    try {
      const p = JSON.parse(localStorage.getItem("planner") || "null");
      const d = localStorage.getItem("currentDay") || "monday";
      const cs = JSON.parse(localStorage.getItem("plannerCustomSections") || "[]");
      window.planner = p && typeof p === "object" ? p : {};
      window.currentDay = DAYS.includes(d) ? d : "monday";
      window.customSections = Array.isArray(cs) ? cs : [];
      // Ensure all days+sections exist
      DAYS.forEach(day => {
        if (!window.planner[day]) window.planner[day] = {};
        CORE_SECTIONS.concat(window.customSections).forEach(sec => {
          if (!window.planner[day][sec]) window.planner[day][sec] = [];
        });
      });
    } catch (e) {
      console.error("[planner] Failed to load planner:", e);
      window.planner = {};
      window.currentDay = "monday";
      window.customSections = [];
    }
  }

  function savePlanner() {
    try {
      localStorage.setItem("planner", JSON.stringify(window.planner || {}));
      localStorage.setItem("currentDay", window.currentDay);
      localStorage.setItem("plannerCustomSections", JSON.stringify(window.customSections || []));
    } catch (e) {
      console.error("[planner] Failed to save planner:", e);
    }
  }

  // ---------------- Helpers ----------------
  function slugize(name){
    return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g,"");
  }

  function sectionInputs(section) {
    return {
      meal: $(`${section}-meal`),
      calories: $(`${section}-calories`),
      protein: $(`${section}-protein`),
      carbs: $(`${section}-carbs`),
      fat: $(`${section}-fat`)
    };
  }

  function makeMealFromInputs(section){
    const inputs = sectionInputs(section);
    const name = inputs.meal?.value?.trim() || "";
    const calories = num(inputs.calories?.value);
    const protein  = num(inputs.protein?.value);
    const carbs    = num(inputs.carbs?.value);
    const fat      = num(inputs.fat?.value);
    if (!name) return null;
    return {
      id: Date.now(),
      name,
      calories: calories || Math.round(protein*4 + carbs*4 + fat*9),
      protein, carbs, fat
    };
  }

  function renderSectionList(section, items) {
    const container = $(`${section}-list`) || null;
    if (!container) return;
    container.innerHTML = "";
    if (!items || items.length === 0) return;

    items.forEach(m => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between py-1";
      row.setAttribute("data-meal","1");
      row.setAttribute("data-name", m.name);
      row.setAttribute("data-cal", m.calories);
      row.setAttribute("data-pro", m.protein);
      row.setAttribute("data-carb", m.carbs);
      row.setAttribute("data-fat", m.fat);
      row.innerHTML = `
        <div class="text-sm">
          <span class="meal-name font-medium">${m.name}</span>
          <span class="text-gray-500 ml-1">(${Math.round(m.calories)} cal)</span>
        </div>
        <button class="text-red-600 hover:text-red-700" title="Remove">
          <i class="fas fa-times"></i>
        </button>`;
      row.querySelector("button").addEventListener("click", () => {
        const arr = window.planner[window.currentDay][section];
        const idx = arr.findIndex(x => x.id === m.id);
        if (idx >= 0) { arr.splice(idx,1); savePlanner(); renderPlanner(); }
      });
      container.appendChild(row);
    });
  }

  function renderSummary(dayData) {
    const all = [].concat(
      dayData.breakfast || [],
      dayData.lunch || [],
      dayData.dinner || [],
      ...window.customSections.map(s => dayData[s] || [])
    );
    const totals = all.reduce((a,m)=>{
      a.calories += num(m.calories);
      a.protein  += num(m.protein);
      a.carbs    += num(m.carbs);
      a.fat      += num(m.fat);
      return a;
    }, {calories:0, protein:0, carbs:0, fat:0});

    text($("planned-calories"), Math.round(totals.calories));
    text($("planned-protein"), Math.round(totals.protein) + "g");
    text($("planned-carbs"),   Math.round(totals.carbs) + "g");
    text($("planned-fat"),     Math.round(totals.fat) + "g");
    text($("planned-meals"),   all.length);
  }

  function ensureCustomSectionDom(name) {
    // Custom sections are added below "addCustomSectionBar"
    const id = `${name}-section-card`;
    if ($(id)) return;
    const container = $("customSectionsContainer");
    if (!container) return;

    const card = document.createElement("div");
    card.id = id;
    card.className = "bg-white p-4 rounded-lg border";
    card.innerHTML = `
      <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-plus-circle mr-2"></i>${name[0].toUpperCase()+name.slice(1)}</h4>
      <div class="space-y-2 mb-3">
        <input type="text" id="${name}-meal" placeholder="Meal name" class="w-full p-2 text-sm border rounded">
        <div class="grid grid-cols-2 gap-2">
          <input type="number" id="${name}-calories" placeholder="Calories" class="p-2 text-sm border rounded" step="1">
          <input type="number" id="${name}-protein" placeholder="Protein (g)" class="p-2 text-sm border rounded" step="0.1">
          <input type="number" id="${name}-carbs" placeholder="Carbs (g)" class="p-2 text-sm border rounded" step="0.1">
          <input type="number" id="${name}-fat" placeholder="Fat (g)" class="p-2 text-sm border rounded" step="0.1">
        </div>
      </div>
      <button onclick="addPlannedMeal('${name}')" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium">
        <i class="fas fa-plus mr-1"></i>Add
      </button>
      <div id="${name}-list" class="mt-3 space-y-1"></div>
    `;
    container.appendChild(card);
  }

  // ---------------- Public API ----------------
  window.selectDay = function selectDay(day) {
    if (!DAYS.includes(day)) return;
    window.currentDay = day;
    savePlanner();
    const el = $("currentDay"); if (el) el.textContent = day.charAt(0).toUpperCase()+day.slice(1);
    // UI highlight
    DAYS.forEach(d => {
      const b = $(`btn-${d}`); if (b) b.classList.toggle("bg-blue-300", d===day);
    });
    renderPlanner();
  };

  window.addPlannedMeal = function addPlannedMeal(section) {
    section = slugize(section);
    if (!window.planner[window.currentDay][section]) {
      // Section may be a custom section
      if (!window.customSections.includes(section)) {
        window.customSections.push(section);
        DAYS.forEach(day => window.planner[day][section] = window.planner[day][section] || []);
        ensureCustomSectionDom(section);
      }
    }
    const meal = makeMealFromInputs(section);
    if (!meal) return;
    window.planner[window.currentDay][section].push(meal);
    savePlanner();
    renderPlanner();
  };

  window.clearMealPlan = function clearMealPlan() {
    // Clears all days to keep consistent with original "Clear Plan" button
    DAYS.forEach(d => {
      Object.keys(window.planner[d]).forEach(sec => window.planner[d][sec] = []);
    });
    savePlanner();
    renderPlanner();
  };

  window.copyToTracker = function copyToTracker() {
    const dayData = window.planner[window.currentDay] || {};
    const all = [].concat(
      dayData.breakfast || [],
      dayData.lunch || [],
      dayData.dinner || [],
      ...window.customSections.map(s => dayData[s] || [])
    );
    window.meals = window.meals || [];
    all.forEach(m => window.meals.push({
      id: Date.now() + Math.random(),
      name: `[${window.currentDay}] ${m.name}`,
      calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat
    }));
    if (window.updateMealsList) window.updateMealsList();
    if (window.updateProgress) window.updateProgress();
    localStorage.setItem("meals", JSON.stringify(window.meals));
  };

  window.toggleAddCustomSection = function toggleAddCustomSection() {
    const cfg = $("customSectionConfig");
    if (cfg) cfg.classList.toggle("hidden");
  };

  window.cancelAddCustomSection = function cancelAddCustomSection() {
    const cfg = $("customSectionConfig");
    const name = $("customSectionName");
    if (cfg) cfg.classList.add("hidden");
    if (name) name.value = "";
  };

  window.createCustomSection = function createCustomSection() {
    const input = $("customSectionName");
    const raw = input?.value?.trim();
    if (!raw) return;
    const slug = slugize(raw);
    if (CORE_SECTIONS.includes(slug)) return;
    if (!window.customSections.includes(slug)) {
      window.customSections.push(slug);
      DAYS.forEach(d => {
        if (!window.planner[d][slug]) window.planner[d][slug] = [];
      });
      ensureCustomSectionDom(slug);
      savePlanner();
      renderPlanner();
    }
    window.cancelAddCustomSection();
  };

  // ---------------- Render current day into UI ----------------
  function renderPlanner() {
    const dayData = window.planner[window.currentDay] || {};
    // core sections
    CORE_SECTIONS.forEach(sec => renderSectionList(sec, dayData[sec] || []));
    // ensure custom section DOM and render
    window.customSections.forEach(sec => { ensureCustomSectionDom(sec); renderSectionList(sec, dayData[sec] || []); });
    renderSummary(dayData);
  }

  // ---------------- Boot ----------------
  loadPlanner();
  // initial select and render
  window.selectDay(window.currentDay);
})();