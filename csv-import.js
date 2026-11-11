(function () {
  const CSV_IMPORT_FIELDS = [
    "dive_number",
    "date",
    "max_depth_m",
    "duration_min",
    "air_temp_c",
    "water_temp_c",
    "start_time",
    "end_time"
  ];

  function csvToRows(text) {
    const rows = [];
    let current = "";
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i++;
        row.push(current);
        if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
        row = [];
        current = "";
      } else {
        current += char;
      }
    }

    if (current.length || row.length) {
      row.push(current);
      if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
    }

    return rows;
  }

  function normalizeCsvCell(value) {
    return String(value ?? "").trim();
  }

  function parseDateValue(value) {
    const s = normalizeCsvCell(value);
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
      const [d, m, y] = s.split(".");
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split("/");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  function parseTimeValue(value) {
    const s = normalizeCsvCell(value);
    if (!s) return null;
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
    return null;
  }

  function parseNumberValue(value) {
    const s = normalizeCsvCell(value).replace(",", ".");
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function exportCsv() {
    const header = [
      "dive_number",
      "date",
      "max_depth_m",
      "duration_min",
      "air_temp_c",
      "water_temp_c",
      "start_time",
      "end_time"
    ];

    const rows = [header];

    const dives = [...db.dives].sort((a, b) => {
      const left = `${b.date || ""}${b.startTime || ""}`;
      const right = `${a.date || ""}${a.startTime || ""}`;
      return left.localeCompare(right);
    });

    for (const dive of dives) {
      rows.push([
        dive.diveNumber ?? "",
        dive.date ?? "",
        dive.maxDepthM ?? "",
        dive.durationMinutes ?? "",
        dive.conditions?.airTempC ?? "",
        dive.conditions?.waterTempC ?? "",
        dive.startTime ?? "",
        ""
      ]);
    }

    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `diving-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function buildDiveFromCsvRow(row) {
    const record = {};
    for (let i = 0; i < CSV_IMPORT_FIELDS.length; i++) {
      record[CSV_IMPORT_FIELDS[i]] = row[i];
    }

    const diveNumber = parseNumberValue(record.dive_number);
    const date = parseDateValue(record.date);
    const maxDepthM = parseNumberValue(record.max_depth_m);
    const durationMin = parseNumberValue(record.duration_min);
    const airTempC = parseNumberValue(record.air_temp_c);
    const waterTempC = parseNumberValue(record.water_temp_c);
    const startTime = parseTimeValue(record.start_time);
    const endTime = parseTimeValue(record.end_time);

    if (diveNumber == null || !date || maxDepthM == null || durationMin == null) {
      throw new Error(`Chybějící povinné pole: ${JSON.stringify(record)}`);
    }

    const dive = {
      id: uid("dive"),
      diveNumber,
      date,
      startTime,
      durationMinutes: Math.round(durationMin),
      maxDepthM: Number(maxDepthM.toFixed(1)),
      siteId: null,
      siteName: "",
      siteCountry: "",
      siteRegion: "",
      conditions: {
        weatherId: null,
        waterBodyId: null,
        waterTypeId: null,
        entryId: null,
        currentId: null,
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
      importSource: "csv",
      importedAt: new Date().toISOString()
    };

    if (startTime && endTime) {
      const startMinutes = startTime.split(":").reduce((sum, part, idx) => {
        const num = Number(part);
        return sum + (idx === 0 ? num * 60 : num);
      }, 0);
      const endMinutes = endTime.split(":").reduce((sum, part, idx) => {
        const num = Number(part);
        return sum + (idx === 0 ? num * 60 : num);
      }, 0);
      const diff = endMinutes - startMinutes;
      if (diff > 0 && Math.abs(diff - durationMin) > 45) {
        console.warn("CSV: end_time neodpovídá duration_min", { startTime, endTime, durationMin, diff });
      }
    }

    return dive;
  }

  async function importCsvFile(file) {
    if (!file) throw new Error("Nebyl vybrán žádný CSV soubor.");
    const text = await file.text();
    const rows = csvToRows(text);

    if (rows.length < 2) throw new Error("CSV soubor neobsahuje žádné záznamy.");

    const header = rows[0].map(cell => normalizeCsvCell(cell).toLowerCase());
    const missing = CSV_IMPORT_FIELDS.filter(field => !header.includes(field));
    if (missing.length) {
      throw new Error(`CSV chybí sloupce: ${missing.join(", ")}`);
    }

    const validRows = [];
    const warnings = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        validRows.push(buildDiveFromCsvRow(rows[i]));
      } catch (error) {
        warnings.push(`Řádek ${i + 1}: ${error.message}`);
      }
    }

    if (!validRows.length) {
      throw new Error(warnings.join(" | ") || "Nenačetl se žádný platný ponor.");
    }

    const before = db.dives.length;
    for (const dive of validRows) {
      const exists = db.dives.some(existing => Number(existing.diveNumber) === Number(dive.diveNumber) && existing.date === dive.date);
      if (!exists) db.dives.push(dive);
    }

    save();
    renderDashboard();

    return {
      added: db.dives.length - before,
      skipped: validRows.length - (db.dives.length - before),
      warnings
    };
  }

  function initCsvImportExport() {
    const exportBtn = document.getElementById("exportCsv");
    const importInput = document.getElementById("importCsv");

    if (exportBtn) {
      exportBtn.addEventListener("click", exportCsv);
    }

    if (importInput) {
      importInput.addEventListener("change", async event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        try {
          const result = await importCsvFile(file);
          alert(`CSV import dokončen: přidáno ${result.added} ponorů.`);
        } catch (error) {
          alert(error.message || "Import CSV selhal.");
        } finally {
          event.target.value = "";
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCsvImportExport);
  } else {
    initCsvImportExport();
  }
})();
