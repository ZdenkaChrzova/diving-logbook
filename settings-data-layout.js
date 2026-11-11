(() => {
  "use strict";

  function arrangeDataActions() {
    const exportJson = document.getElementById("exportData");
    const importJsonInput = document.getElementById("importData");
    const exportCsv = document.getElementById("exportCsv");
    const importCsvInput = document.getElementById("importCsv");

    // Wait until both add-ons have created their controls. Never hide or remove
    // any controls when an add-on has not loaded yet.
    if (!exportJson || !importJsonInput || !exportCsv || !importCsvInput) return false;
    if (document.getElementById("dataActions")) return true;

    const dataCard = exportJson.closest(".form-section");
    const importJson = importJsonInput.closest("label");
    const importCsv = importCsvInput.closest("label");
    if (!dataCard || !importJson || !importCsv) return false;

    const csvHelp = [...dataCard.querySelectorAll(".hint")]
      .find(element => element.textContent.trim().startsWith("CSV "));

    const actions = document.createElement("div");
    actions.id = "dataActions";
    actions.className = "data-actions";

    const jsonGroup = document.createElement("div");
    jsonGroup.className = "data-action-group";
    const jsonHeading = document.createElement("h4");
    jsonHeading.textContent = "JSON záloha";
    jsonGroup.append(jsonHeading);

    const csvGroup = document.createElement("div");
    csvGroup.className = "data-action-group";
    const csvHeading = document.createElement("h4");
    csvHeading.textContent = "CSV tabulka";
    csvGroup.append(csvHeading);

    // Insert the new wrapper into the card BEFORE moving any controls into it.
    // Inserting it relative to exportJson after moving exportJson creates a
    // DOM cycle and throws HierarchyRequestError.
    dataCard.insertBefore(actions, exportJson);
    actions.append(jsonGroup, csvGroup);

    jsonGroup.append(exportJson, importJson);
    csvGroup.append(exportCsv, importCsv);
    if (csvHelp) csvGroup.append(csvHelp);

    if (!document.getElementById("dataActionsStyles")) {
      const style = document.createElement("style");
      style.id = "dataActionsStyles";
      style.textContent = `
        .data-actions{display:grid;gap:20px}
        .data-action-group{display:grid;gap:10px;min-width:0}
        .data-action-group h4{margin:0}
        .data-action-group>button,.data-action-group>.upload{box-sizing:border-box;width:100%}
        .data-action-group>.hint{margin:2px 0 0}
      `;
      document.head.appendChild(style);
    }

    return true;
  }

  function start() {
    if (arrangeDataActions()) return;

    const settingsView = document.getElementById("settingsView");
    if (!settingsView || typeof MutationObserver !== "function") return;

    const observer = new MutationObserver(() => {
      if (arrangeDataActions()) observer.disconnect();
    });
    observer.observe(settingsView, { childList: true, subtree: true });

    // Retry once after initial rendering as a fallback for browsers/add-ons
    // where the controls were inserted before observer setup.
    setTimeout(() => {
      if (arrangeDataActions()) observer.disconnect();
    }, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
