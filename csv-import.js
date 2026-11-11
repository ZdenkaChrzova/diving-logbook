(() => {
  "use strict";

  // This add-on is loaded by the service worker after app.js. The existing app
  // owns `db`, `save`, `uid`, and the `siteOf` lookup; we intentionally reuse
  // those so all imported rows use the existing v1.3.2 local database.
  const HEADERS = [
    "Číslo ponoru",
    "Datum",
    "Lokalita",
    "Max. hloubka (m)",
    "Délka (min)",
    "Teplota vzduchu (°C)",
    "Teplota vody (°C)",
    "Čas začátku"
  ];

  const FIELD_ALIASES = {
    diveNumber: ["cislo ponoru", "dive number", "dive_number", "dive_no", "dive"],
    date: ["datum", "date"],
    location: ["lokalita", "location", "site", "site name", "site_name"],
    depth: ["max hloubka (m)", "max hloubka m", "max_depth_m", "max_depth", "depth"],
    duration: ["delka (min)", "delka min", "duration_min", "duration", "duration minutes"],
    airTemp: ["teplota vzduchu (c)", "teplota vzduchu c", "teplota vzduchu", "air_temp_c", "air_temp"],
    waterTemp: ["teplota vody (c)", "teplota vody c", "teplota vody", "water_temp_c", "water_temp"],
    startTime: ["cas zacatku", "start_time", "start time", "time"]
  };

  function normalize(value) {
    return String(value ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/°/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function detectDelimiter(line) {
    let quoted = false;
    const counts = { "\t": 0, ";": 0, ",": 0 };
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && Object.prototype.hasOwnProperty.call(counts, ch)) {
        counts[ch]++;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const source = String(text ?? "").replace(/^\uFEFF/, "");

    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      const next = source[i + 1];
      if (ch === '"') {
        if (quoted && next === '"') {
          cell += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && ch === delimiter) {
        row.push(cell);
        cell = "";
      } else if (!quoted && (ch === "\n" || ch === "\r")) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell);
        if (row.some(value => String(value).trim() !== "")) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
    if (quoted) throw new Error("CSV obsahuje uvozovku bez uzavření.");
    if (cell.length || row.length) {
      row.push(cell);
      if (row.some(value => String(value).trim() !== "")) rows.push(row);
    }
    return rows;
  }

  function parseCsv(text) {
    const firstLine = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] || "";
    return parseDelimited(text, detectDelimiter(firstLine));
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function decimal(value) {
    if (value === null || value === undefined || value === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? String(number).replace(".", ",") : "";
  }

  function locationName(dive) {
    const site = dive.siteId != null ? siteOf(dive.siteId) : null;
    return site?.name || dive.siteName || "";
  }

  function downloadCsv() {
    const rows = [HEADERS];
    const dives = [...(db.dives || [])].sort((a, b) => {
      const left = `${a.date || ""} ${a.startTime || ""}`;
      const right = `${b.date || ""} ${b.startTime || ""}`;
      return left.localeCompare(right);
    });

    for (const dive of dives) {
      rows.push([
        dive.diveNumber ?? "",
        dive.date ?? "",
        locationName(dive),
        decimal(dive.maxDepthM),
        dive.durationMinutes ?? "",
        decimal(dive.conditions?.airTempC),
        decimal(dive.conditions?.waterTempC),
        dive.startTime ?? ""
      ]);
    }

    // Semicolon-delimited CSV is Excel-friendly in Czech locales and allows
    // decimal commas in values. UTF-8 BOM helps desktop Excel detect encoding.
    const content = "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `diving-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function parseDate(value) {
    const text = String(value ?? "").trim();
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)) return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      return null;
    }
    match = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!match) return null;
    const [, dayText, monthText, year] = match;
    const day = Number(dayText), month = Number(monthText);
    const date = new Date(Date.UTC(Number(year), month - 1, day));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function parseNumber(value, field, rowNumber, required = false) {
    const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
    if (!text) {
      if (required) throw new Error(`Řádek ${rowNumber}: chybí „${field}“.`);
      return null;
    }
    const number = Number(text);
    if (!Number.isFinite(number)) throw new Error(`Řádek ${rowNumber}: „${field}“ není platné číslo.`);
    return number;
  }

  function parseTime(value, rowNumber) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) {
      throw new Error(`Řádek ${rowNumber}: čas začátku musí být ve formátu HH:MM.`);
    }
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }

  function siteIdForImport(name, pendingSites) {
    const normalizedName = normalize(name);
    const existing = Object.entries(db.sites || {}).find(([, site]) => normalize(site?.name) === normalizedName);
    if (existing) return Number(existing[0]);
    const pending = pendingSites.find(site => normalize(site.name) === normalizedName);
    if (pending) return pending.id;

    // Negative IDs mark locally imported locations without assigning or
    // overwriting an SSI Site ID.
    const numericIds = Object.keys(db.sites || {}).map(Number).filter(Number.isFinite);
    const pendingIds = pendingSites.map(site => site.id);
    const lowest = Math.min(0, ...numericIds, ...pendingIds);
    return lowest - 1;
  }

  function resolveFieldIndexes(header) {
    const indexes = {};
    header.forEach((value, index) => {
      const key = normalize(value);
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.some(alias => normalize(alias) === key)) indexes[field] = index;
      }
    });
    return indexes;
  }

  async function importCsv(file) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("CSV soubor neobsahuje žádné řádky s ponory.");

    const indexes = resolveFieldIndexes(rows[0]);
    const required = ["diveNumber", "date", "location", "depth", "duration"];
    const missing = required.filter(field => indexes[field] === undefined);
    if (missing.length) {
      const labels = { diveNumber: "Číslo ponoru", date: "Datum", location: "Lokalita", depth: "Max. hloubka (m)", duration: "Délka (min)" };
      throw new Error(`V CSV chybí povinné sloupce: ${missing.map(field => labels[field]).join(", ")}.`);
    }

    const pendingSites = [];
    const parsedDives = [];
    const warnings = [];
    const cell = (row, field) => row[indexes[field]] ?? "";

    for (let i = 1; i < rows.length; i++) {
      const rowNumber = i + 1;
      try {
        const diveNumber = parseNumber(cell(rows[i], "diveNumber"), "Číslo ponoru", rowNumber, true);
        if (!Number.isInteger(diveNumber) || diveNumber < 1) throw new Error(`Řádek ${rowNumber}: číslo ponoru musí být celé kladné číslo.`);
        const date = parseDate(cell(rows[i], "date"));
        if (!date) throw new Error(`Řádek ${rowNumber}: datum musí být platné a ve formátu RRRR-MM-DD nebo DD.MM.RRRR.`);
        const siteName = String(cell(rows[i], "location")).trim();
        if (!siteName) throw new Error(`Řádek ${rowNumber}: chybí lokalita.`);
        const maxDepthM = parseNumber(cell(rows[i], "depth"), "Max. hloubka (m)", rowNumber, true);
        if (maxDepthM < 0) throw new Error(`Řádek ${rowNumber}: hloubka nemůže být záporná.`);
        const durationMinutes = parseNumber(cell(rows[i], "duration"), "Délka (min)", rowNumber, true);
        if (!Number.isInteger(durationMinutes) || durationMinutes < 1) throw new Error(`Řádek ${rowNumber}: délka musí být kladný počet celých minut.`);
        const airTempC = indexes.airTemp === undefined ? null : parseNumber(cell(rows[i], "airTemp"), "Teplota vzduchu (°C)", rowNumber);
        const waterTempC = indexes.waterTemp === undefined ? null : parseNumber(cell(rows[i], "waterTemp"), "Teplota vody (°C)", rowNumber);
        const startTime = indexes.startTime === undefined ? null : parseTime(cell(rows[i], "startTime"), rowNumber);
        const siteId = siteIdForImport(siteName, pendingSites);
        if (!(String(siteId) in (db.sites || {})) && !pendingSites.some(site => site.id === siteId)) {
          pendingSites.push({ id: siteId, name: siteName });
        }

        parsedDives.push({
          id: uid("dive"),
          diveNumber,
          date,
          startTime,
          durationMinutes,
          maxDepthM,
          siteId,
          conditions: {
            weatherId: null,
            waterBodyId: null,
            waterTypeId: null,
            entryId: null,
            currentId: null,
            surfaceId: null,
            waterTempC,
            waterTempMaxC: null,
            airTempC,
            visibilityM: null
          },
          equipment: {
            weightKg: null,
            suit: "",
            tankVolumeL: null,
            tankMaterial: "",
            gas: "",
            startPressureBar: null,
            endPressureBar: null
          },
          safety: { decompressionDive: false },
          buddyIds: [],
          buddies: [],
          notes: "",
          marineLife: "",
          rating: null,
          attachments: [],
          import: {
            source: "csv",
            importedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        warnings.push(error.message);
      }
    }

    if (!parsedDives.length) {
      throw new Error(warnings.slice(0, 8).join("\n") || "Nenašel se žádný platný ponor.");
    }

    const seen = new Set((db.dives || []).map(dive => `${Number(dive.diveNumber)}|${dive.date}`));
    const unique = [];
    let duplicates = 0;
    for (const dive of parsedDives) {
      const key = `${dive.diveNumber}|${dive.date}`;
      if (seen.has(key)) {
        duplicates++;
        continue;
      }
      seen.add(key);
      unique.push(dive);
    }

    const message = [
      `Načteno platných řádků: ${parsedDives.length}.`,
      `Nových ponorů k přidání: ${unique.length}.`,
      `Duplicit k přeskočení: ${duplicates}.`,
      warnings.length ? `Chybných řádků k přeskočení: ${warnings.length}.` : ""
    ].filter(Boolean).join("\n");
    if (!confirm(`${message}\n\nImport přidává záznamy a nemaže ani nenahrazuje stávající data. Pokračovat?`)) return;

    if (unique.length === 0) {
      alert("Žádné nové ponory nebyly přidány; všechny platné řádky už v deníku jsou.");
      return;
    }

    for (const site of pendingSites) {
      db.sites[String(site.id)] = {
        ssiId: site.id,
        name: site.name,
        country: "",
        region: "",
        latitude: null,
        longitude: null
      };
    }
    db.dives.push(...unique);
    save();
    if (typeof renderSettings === "function") renderSettings();

    const result = [`Přidáno ponorů: ${unique.length}.`, `Přeskočeno duplicit: ${duplicates}.`];
    if (warnings.length) result.push(`Přeskočeno chybných řádků: ${warnings.length}.`, warnings.slice(0, 5).join("\n"));
    alert(result.join("\n"));
  }

  function createCsvControls() {
    const settingsView = document.getElementById("settingsView");
    const exportJson = document.getElementById("exportData");
    if (!settingsView || !exportJson || document.getElementById("exportCsv")) return;

    const dataCard = exportJson.closest(".form-section") || exportJson.parentElement;
    const exportButton = document.createElement("button");
    exportButton.id = "exportCsv";
    exportButton.type = "button";
    exportButton.className = "secondary wide";
    exportButton.textContent = "Exportovat CSV";
    exportButton.addEventListener("click", downloadCsv);

    const importLabel = document.createElement("label");
    importLabel.className = "upload";
    importLabel.append("Importovat CSV");
    const input = document.createElement("input");
    input.id = "importCsv";
    input.type = "file";
    input.accept = ".csv,text/csv,text/tab-separated-values,.tsv";
    input.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await importCsv(file);
      } catch (error) {
        alert(error?.message || "Import CSV se nezdařil.");
      } finally {
        event.target.value = "";
      }
    });
    importLabel.appendChild(input);

    const help = document.createElement("p");
    help.className = "hint";
    help.textContent = "CSV obsahuje číslo, datum, lokalitu, hloubku, délku, teploty a čas začátku. Import pouze přidává nové ponory; úplnou zálohu včetně příloh ukládej jako JSON.";

    exportJson.insertAdjacentElement("afterend", exportButton);
    exportButton.insertAdjacentElement("afterend", importLabel);
    importLabel.insertAdjacentElement("afterend", help);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createCsvControls, { once: true });
  } else {
    createCsvControls();
  }
})();
