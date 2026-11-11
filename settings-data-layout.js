(() => {
  "use strict";

  function arrangeDataActions() {
    const exportJson = document.getElementById("exportData");
    const importJsonInput = document.getElementById("importData");
    const exportCsv = document.getElementById("exportCsv");
    const importCsvInput = document.getElementById("importCsv");

    if (!exportJson || !importJsonInput || !exportCsv || !importCsvInput) return;
    if (document.getElementById("dataActions")) return;

    const dataCard = exportJson.closest(".form-section");
    if (!dataCard) return;

    const importJson = importJsonInput.closest("label");
    const importCsv = importCsvInput.closest("label");
    if (!importJson || !importCsv) return;

    const csvHelp = [...dataCard.querySelectorAll(".hint")]
      .find(element => element.textContent.trim().startsWith("CSV "));

    const actions = document.createElement("div");
    actions.id = "dataActions";
    actions.className = "data-actions";

    const jsonGroup = document.createElement("div");
    jsonGroup.className = "data-action-group";
    const jsonHeading = document.createElement("h4");
    jsonHeading.textContent = "JSON záloha";
    jsonGroup.append(jsonHeading, exportJson, importJson);

    const csvGroup = document.createElement("div");
    csvGroup.className = "data-action-group";
    const csvHeading = document.createElement("h4");
    csvHeading.textContent = "CSV tabulka";
    csvGroup.append(csvHeading, exportCsv, importCsv);
    if (csvHelp) csvGroup.append(csvHelp);

    actions.append(jsonGroup, csvGroup);
    exportJson.parentNode.insertBefore(actions, exportJson);

    const style = document.createElement("style");
    style.textContent = `
      .data-actions{display:grid;gap:20px}
      .data-action-group{display:grid;gap:10px;min-width:0}
      .data-action-group h4{margin:0}
      .data-action-group>button,.data-action-group>.upload{box-sizing:border-box;width:100%}
      .data-action-group>.hint{margin:2px 0 0}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrangeDataActions, { once: true });
  } else {
    arrangeDataActions();
  }
})();
