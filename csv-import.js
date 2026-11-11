(() => {
  "use strict";

  const HEADERS = [
    "Číslo ponoru",
    "Datum",
    "Čas",
    "Lokalita",
    "Max hloubka (m)",
    "Délka (min)",
    "Počasí",
    "Vodní plocha",
    "Voda",
    "Vstup",
    "Proud",
    "Teplota vody (°C)",
    "Max teplota vody (°C)",
    "Teplota vzduchu (°C)",
    "Viditelnost (m)",
    "Dekompresní ponor"
  ];

  const FIELD_ALIASES = {
    diveNumber: ["cislo ponoru", "dive number", "dive_number", "dive_no", "dive"],
    date: ["datum", "date"],
    location: ["lokalita", "location", "site", "site name", "site_name"],
    depth: ["max hloubka (m)", "max hloubka m", "max_depth_m", "max_depth", "depth"],
    duration: ["delka (min)", "delka min", "duration_min", "duration", "duration minutes"],

    weather: ["pocasi", "weather", "weather id", "weather_id"],
    waterBody: ["vodni plocha", "water body", "water_body", "water_body_id"],
    waterType: ["voda", "water type", "water_type", "water_type_id"],
    entry: ["vstup", "entry", "entry_id"],
    current: ["proud", "current", "current_id"],

    waterTemp: ["teplota vody", "teplota vody (c)", "water_temp_c", "water_temp"],
    waterTempMax: ["max teplota vody", "max teplota vody (c)", "water_temp_max_c", "max_water_temp_c"],
    airTemp: ["teplota vzduchu", "teplota vzduchu (c)", "air_temp_c", "air_temp"],
    visibility: ["viditelnost", "viditelnost (m)", "visibility_m", "visibility"],
    decompression: ["dekompresni ponor", "decompression dive", "decompression", "decompression_dive"],

    startTime: ["cas zacatku", "start_time", "start time", "time"]
  };

  function normalize(value) {
    return String(value ?? "")
      .replace(/^\uFEFF/, "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[°º]/g, "")
      .toLowerCase()
      .replace(/[_.()\/-]+/g, " ")
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

  function choiceLabel(value, map) {
    if (value === null || value === undefined || value === "") return "";
    const key = String(value);
    return map[key] ?? "";
  }

  function lookupByText(text, map) {
    const cleaned = String(text ?? "").trim();
    if (!cleaned) return null;

    const normalized = normalize(cleaned);
    for (const [id, label] of Object.entries(map)) {
      if (normalize(label) === normalized || normalize(String(id)) === normalized) {
        return Number(id);
      }
    }

    return null;
  }

  function parseChoice(value, field, rowNumber, map) {
    const text = String(value ?? "").trim();
    if (!text) return null;

    const found = lookupByText(text, map);
    if (found === null) {
      throw new Error(`Řádek ${rowNumber}: hodnota pro „${field}“ není platná.`);
    }

    return found;
  }

  function parseBoolean(value, field, rowNumber) {
    const text = String(value ?? "").trim();
    if (!text) return false;

    const normalized = normalize(text);
    if (["ano", "yes", "true", "1", "a", "y"].includes(normalized)) return true;
    if (["ne", "no", "false", "0", "n"].includes(normalized)) return false;

    throw new Error(`Řádek ${rowNumber}: hodnota pro „${field}“ musí být Ano/Ne.`);
  }

  function downloadCsv() {
    const rows = [HEADERS];
    const dives = [...(db.dives || [])].sort((a, b) => {
      const left = `${a.date || ""} ${a.startTime || ""}`;
      const right = `${b.date || ""} ${b.startTime || ""}`;
      return left.localeCompare(right);
    });

    for (const dive of dives) {
      const conditions = dive.conditions || {};

      rows.push([
        dive.diveNumber ?? "",
        dive.date ?? "",
        dive.startTime ?? "",
        locationName(dive),
        decimal(dive.maxDepthM),
        dive.durationMinutes ?? "",

        choiceLabel(conditions.weatherId, LOOKUPS.weather),
        choiceLabel(conditions.waterBodyId, LOOKUPS.waterBody),
        choiceLabel(conditions.waterTypeId, LOOKUPS.waterType),
        choiceLabel(conditions.entryId, LOOKUPS.entry),
        choiceLabel(conditions.currentId, LOOKUPS.current),

        decimal(conditions.waterTempC),
        decimal(conditions.waterTempMaxC),
        decimal(conditions.airTempC),
        decimal(conditions.visibilityM),

        dive.safety?.decompressionDive ? "Ano" : "Ne"
      ]);
    }

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
      if (
        date.getUTCFullYear() === Number(year) &&
        date.getUTCMonth() === Number(month) - 1 &&
        date.getUTCDate() === Number(day)
      ) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      return null;
    }

    match = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!match) return null;
    const [, dayText, monthText, year] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const date = new Date(Date.UTC(Number(year), month - 1, day));

    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

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
      const labels = {
        diveNumber: "Číslo ponoru",
        date: "Datum",
        location: "Lokalita",
        depth: "Max. hloubka (m)",
        duration: "Délka (min)"
      };
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
        if (!Number.isInteger(diveNumber) || diveNumber < 1) {
          throw new Error(`Řádek ${rowNumber}: číslo ponoru musí být celé kladné číslo.`);
        }

        const date = parseDate(cell(rows[i], "date"));
        if (!date) {
          throw new Error(`Řádek ${rowNumber}: datum musí být platné a ve formátu RRRR-MM-DD nebo DD.MM.RRRR.`);
        }

        const siteName = String(cell(rows[i], "location")).trim();
        if (!siteName) {
          throw new Error(`Řádek ${rowNumber}: chybí lokalita.`);
        }

        const maxDepthM = parseNumber(cell(rows[i], "depth"), "Max. hloubka (m)", rowNumber, true);
        if (maxDepthM < 0) {
          throw new Error(`Řádek ${rowNumber}: hloubka nemůže být záporná.`);
        }

        const durationMinutes = parseNumber(cell(rows[i], "duration"), "Délka (min)", rowNumber, true);
        if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
          throw new Error(`Řádek ${rowNumber}: délka musí být kladný počet celých minut.`);
        }

        const weatherId = indexes.weather === undefined ? null : parseChoice(cell(rows[i], "weather"), "Počasí", rowNumber, LOOKUPS.weather);
        const waterBodyId = indexes.waterBody === undefined ? null : parseChoice(cell(rows[i], "waterBody"), "Vodní plocha", rowNumber, LOOKUPS.waterBody);
        const waterTypeId = indexes.waterType === undefined ? null : parseChoice(cell(rows[i], "waterType"), "Voda", rowNumber, LOOKUPS.waterType);
        const entryId = indexes.entry === undefined ? null : parseChoice(cell(rows[i], "entry"), "Vstup", rowNumber, LOOKUPS.entry);
        const currentId = indexes.current === undefined ? null : parseChoice(cell(rows[i], "current"), "Proud", rowNumber, LOOKUPS.current);

        const waterTempC = indexes.waterTemp === undefined ? null : parseNumber(cell(rows[i], "waterTemp"), "Teplota vody (°C)", rowNumber);
        const waterTempMaxC = indexes.waterTempMax === undefined ? null : parseNumber(cell(rows[i], "waterTempMax"), "Max. teplota vody (°C)", rowNumber);
        const airTempC = indexes.airTemp === undefined ? null : parseNumber(cell(rows[i], "airTemp"), "Teplota vzduchu (°C)", rowNumber);
        const visibilityM = indexes.visibility === undefined ? null : parseNumber(cell(rows[i], "visibility"), "Viditelnost (m)", rowNumber);

        const decompressionDive = indexes.decompression === undefined ? false : parseBoolean(cell(rows[i], "decompression"), "Dekompresní ponor", rowNumber);

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
            weatherId,
            waterBodyId,
            waterTypeId,
            entryId,
            currentId,
            waterTempC,
            waterTempMaxC,
            airTempC,
            visibilityM
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
          safety: {
            decompressionDive
          },
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
    const exportJson = document.getElementById("exportData");
    if (!exportJson) return;
    let exportButton = document.getElementById("exportCsv");
    let input = document.getElementById("importCsv");
    if (!exportButton || !input) {
      exportButton = document.createElement("button"); exportButton.id = "exportCsv"; exportButton.type = "button";
      exportButton.className = "secondary wide"; exportButton.textContent = "Exportovat CSV";
      const importLabel = document.createElement("label"); importLabel.className = "upload"; importLabel.append("Importovat CSV");
      input = document.createElement("input"); input.id = "importCsv"; input.type = "file";
      input.accept = ".csv,text/csv,text/tab-separated-values,.tsv"; importLabel.appendChild(input);
      const help = document.createElement("p"); help.className = "hint";
      help.textContent = "CSV obsahuje údaje o ponorech pro Excel a další tabulkové aplikace.";
      exportJson.insertAdjacentElement("afterend", exportButton); exportButton.insertAdjacentElement("afterend", importLabel);
      importLabel.insertAdjacentElement("afterend", help);
    }
    if (exportButton.dataset.csvBound !== "1") { exportButton.addEventListener("click", downloadCsv); exportButton.dataset.csvBound = "1"; }
    if (input.dataset.csvBound !== "1") {
      input.addEventListener("change", async event => {
        const file = event.target.files?.[0]; if (!file) return;
        try { await importCsv(file); } catch (error) { alert(error?.message || "Import CSV se nezdařil."); }
        finally { event.target.value = ""; }
      });
      input.dataset.csvBound = "1";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createCsvControls, { once: true });
  } else {
    createCsvControls();
  }
})();
