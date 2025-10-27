// ========================
// 📤 EXPORTS MODULE
// ========================
// Handles: PDF & CSV export for Weekly Meal Planner

(function () {
  function $(id) { return document.getElementById(id); }

  // Collect planner data from DOM lists
  function collectPlanner() {
    const dayIds = ["breakfast","lunch","dinner"];
    const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    const data = {};
    days.forEach(d => {
      data[d] = { breakfast: [], lunch: [], dinner: [] };
      dayIds.forEach(slot => {
        const container = $(`${d}-${slot}-list`) || $(`${slot}-list`) || null;
        if (!container) return;
        container.querySelectorAll("[data-meal]").forEach(el => {
          data[d][slot].push({
            name: el.getAttribute("data-name") || el.querySelector(".meal-name")?.textContent || "",
            calories: Number(el.getAttribute("data-cal") || 0),
            protein: Number(el.getAttribute("data-pro") || 0),
            carbs: Number(el.getAttribute("data-carb") || 0),
            fat: Number(el.getAttribute("data-fat") || 0),
          });
        });
      });
    });
    return data;
  }

  // ---- CSV ----
  window.exportMealPlanCSV = function exportMealPlanCSV() {
    const plan = collectPlanner();
    const rows = [["Day","Section","Meal","Calories","Protein","Carbs","Fat"]];

    Object.entries(plan).forEach(([day, blocks]) => {
      Object.entries(blocks).forEach(([section, items]) => {
        items.forEach(m => rows.push([day, section, m.name, m.calories, m.protein, m.carbs, m.fat]));
      });
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meal-plan.csv";
    a.click();
  };

  // ---- PDF (jsPDF) ----
  window.exportMealPlanPDF = function exportMealPlanPDF() {
    function proceed() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Weekly Meal Plan", 14, 16);
      const plan = collectPlanner();
      let y = 26;
      Object.entries(plan).forEach(([day, blocks]) => {
        doc.setFontSize(12);
        doc.text(day.toUpperCase(), 14, y); y += 6;
        ["breakfast","lunch","dinner"].forEach(sec => {
          const items = blocks[sec] || [];
          if (items.length === 0) return;
          doc.setFontSize(11);
          doc.text(`• ${sec}:`, 18, y); y += 6;
          items.forEach(m => {
            const line = `${m.name} — ${m.calories} cal | ${m.protein}g P / ${m.carbs}g C / ${m.fat}g F`;
            doc.setFontSize(10);
            doc.text(line, 24, y);
            y += 5;
            if (y > 280) { doc.addPage(); y = 20; }
          });
        });
        y += 2;
      });
      doc.save("meal-plan.pdf");
    }
    if (typeof window.jspdf === "undefined") {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = proceed;
      document.head.appendChild(s);
    } else {
      proceed();
    }
  };

  // Grocery list dropdown handler (simple no-op close)
  window.toggleGroceryDropdown = function toggleGroceryDropdown() {
    const el = document.getElementById("groceryDropdown");
    if (!el) return;
    el.classList.toggle("hidden");
  };

  // Example web-format grocery export (minimal)
  window.exportGroceryList = function exportGroceryList(format) {
    if (format === "html") {
      const w = window.open("", "_blank");
      w.document.write("<h1>Grocery List</h1><p>(Populate from your planner data)</p>");
      w.document.close();
    } else {
      // In real app, produce a styled PDF; here we reuse exportMealPlanPDF for brevity
      window.exportMealPlanPDF();
    }
  };
})();
