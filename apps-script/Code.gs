// ---- Change these two lines each month (and MONTH in CarTracking.jsx) ----
const SHEET_NAME = "November_Tracking";
const DEFAULT_TITLE = "Car tracker - November 2026";
// --------------------------------------------------------------------------

const COLOR = {
  heading: "#D9EAD3",
  amount870: "#F9CB9C",
  amount580: "#DD7E6B",
  bigTrip: "#B4A7D6",
  paid: "#93C47D",
};

const FIRST_ROW = 3;
const LAST_ROW = 66;

const HEADINGS = [
  "Date", "Day",
  "Trip 1", "Trip 2", "Trip 3", "Trip 4", "Trip 5", "Trip 6", "Trip 7", "Trip 8",
  "CNG 1", "CNG 2", "CNG 3",
  "Total trips", "CNG fills", "Paid count", "Trip amount", "CNG amount",
  "Profit", "Paid amount", "Remaining",
  "", "",
  "Yellanka count", "Escort count", "Yellanka amount",
];

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const out = (obj) =>
  ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

// Gets the current month's tab, creating and formatting it if needed.
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureSheetLayout(sh);
  return sh;
}

// Used to load and search across all monthly tracking tabs.
function getTrackingSheets(ss) {
  return ss.getSheets().filter((sheet) => /_Tracking$/i.test(sheet.getName()));
}

function ensureSheetLayout(sh) {
  if (!String(sh.getRange("A1").getValue()).trim()) {
    sh.getRange("A1").setValue(DEFAULT_TITLE);
  }

  const range = sh.getRange(2, 1, 1, HEADINGS.length);
  const existing = range.getValues()[0];
  range.setValues([HEADINGS.map((heading, i) => existing[i] || heading)]);
  sh.setFrozenRows(2);

  if (sh.getRange("A2").getBackground().toLowerCase() !== COLOR.heading.toLowerCase()) {
    applyFormatting(sh);
  }
}

function applyFormatting(sh) {
  const title = sh.getRange("A1:R1");
  title.breakApart();
  title.merge();
  title.setFontWeight("bold").setFontSize(16);

  sh.getRange(2, 1, 1, HEADINGS.length)
    .setBackground(COLOR.heading)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sh.setColumnWidths(1, HEADINGS.length, 105);

  const rows = LAST_ROW - FIRST_ROW + 1;
  sh.getRange(FIRST_ROW, 1, rows, 1).setNumberFormat("dd/mm/yyyy");
  sh.getRange(FIRST_ROW, 14, rows, 8).setHorizontalAlignment("right");
  sh.getRange(FIRST_ROW, 24, rows, 3).setHorizontalAlignment("right");

  const tripArea = sh.getRange(FIRST_ROW, 3, rows, 8);
  const rule = () => SpreadsheetApp.newConditionalFormatRule().setRanges([tripArea]);

  sh.setConditionalFormatRules([
    rule().whenTextEqualTo("Paid").setBackground(COLOR.paid).build(),
    rule().whenNumberEqualTo(870).setBackground(COLOR.amount870).build(),
    rule().whenNumberEqualTo(580).setBackground(COLOR.amount580).build(),
    rule().whenNumberGreaterThan(870).setBackground(COLOR.bigTrip).build(),
  ]);
}

// Run from the Apps Script editor to reapply the formatting.
function applyColors() {
  applyFormatting(getSheet());
}

const pad2 = (n) => ("0" + n).slice(-2);

// The sheet's real month/year, from the title ("... (01-06-2026 to 30-06-2026)"
// or "... June 2026") or, failing that, the tab name. Null if unknown.
function sheetPeriod(sh) {
  const title = String(sh.getRange(1, 1).getValue());
  const range = /\((\d{1,2})-(\d{1,2})-(\d{4})/.exec(title);
  if (range) return { month: Number(range[2]), year: Number(range[3]) };

  const text = (title + " " + sh.getName()).toLowerCase();
  const month = MONTH_NAMES.findIndex((name) => text.indexOf(name) !== -1) + 1;
  const year = /\b(20\d{2})\b/.exec(title);
  return month && year ? { month, year: Number(year[1]) } : null;
}

// Returns "yyyy-MM-dd" for any supported date value:
//  - "dd/mm/yyyy" or "dd-mm-yyyy" text
//  - "yyyy-mm-dd" text
//  - Date cells. Sheets parsed early-month dates as mm/dd, so a Date can have
//    day and month swapped (02/06/2026 stored as 6 Nov 2026, sometimes 2027).
//    When `period` is given and the Date's month is wrong but its day equals
//    the sheet's month, swap them back and use the sheet's year.
function dateKey(value, timeZone, period) {
  if (value instanceof Date) {
    const y = Number(Utilities.formatDate(value, timeZone, "yyyy"));
    const m = Number(Utilities.formatDate(value, timeZone, "M"));
    const d = Number(Utilities.formatDate(value, timeZone, "d"));
    if (period && m !== period.month && d === period.month) {
      return period.year + "-" + pad2(period.month) + "-" + pad2(m);
    }
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return iso[1] + "-" + pad2(iso[2]) + "-" + pad2(iso[3]);
  const dmy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s);
  if (dmy) return dmy[3] + "-" + pad2(dmy[2]) + "-" + pad2(dmy[1]);
  return s;
}

// One-time repair: run from the Apps Script editor. Rewrites every date cell in
// all *_Tracking tabs as a real date with the dd/mm/yyyy format, fixing the
// swapped day/month ones. Check the Logs for what changed.
function fixAllDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeZone = ss.getSpreadsheetTimeZone();

  for (const sh of getTrackingSheets(ss)) {
    const period = sheetPeriod(sh);
    for (let row = FIRST_ROW; row <= LAST_ROW; row += 2) {
      const cell = sh.getRange(row, 1);
      const value = cell.getValue();
      if (value === "") continue;

      const key = dateKey(value, timeZone, period);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        Logger.log(sh.getName() + " row " + row + ": unreadable date " + value);
        continue;
      }
      const fixed = Utilities.parseDate(key, timeZone, "yyyy-MM-dd");
      cell.setValue(fixed).setNumberFormat("dd/mm/yyyy");
      Logger.log(sh.getName() + " row " + row + ": " + value + " -> " + key);
    }
  }
}

function findEntryRow(sh, date, timeZone) {
  const period = sheetPeriod(sh);
  for (let row = FIRST_ROW; row <= LAST_ROW; row += 2) {
    const existingDate = sh.getRange(row, 1).getValue();
    if (existingDate !== "" && dateKey(existingDate, timeZone, period) === date) {
      return row;
    }
  }
  return null;
}

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const currentSheet = getSheet();
    SpreadsheetApp.flush();

    const timeZone = ss.getSpreadsheetTimeZone();
    const title = String(currentSheet.getRange(1, 1).getValue()).trim() || DEFAULT_TITLE;
    const headings = currentSheet.getRange(2, 1, 1, 21).getValues()[0]
      .map((heading, i) => String(heading).trim() || HEADINGS[i]);
    const entries = [];

    for (const sh of getTrackingSheets(ss)) {
      const period = sheetPeriod(sh);
      for (let row = FIRST_ROW; row <= LAST_ROW; row += 2) {
        const [top, bottom] = sh.getRange(row, 1, 2, 13).getValues();
        if (top[0] === "") continue;

        const tripNotes = sh.getRange(row, 3, 1, 8).getNotes()[0];
        const cngNotes = sh.getRange(row, 11, 1, 3).getNotes()[0];
        const trips = [];
        const cng = [];

        for (let i = 0; i < 8; i++) {
          const amount = top[2 + i];
          if (amount !== "") {
            trips.push({
              amount: Number(amount),
              paid: String(bottom[2 + i]).trim().toLowerCase() === "paid",
              note: tripNotes[i] || "",
            });
          }
        }

        for (let i = 0; i < 3; i++) {
          const amount = top[10 + i];
          if (amount !== "") {
            cng.push({
              amount: Number(amount),
              note: cngNotes[i] || "",
            });
          }
        }

        entries.push({
          date: dateKey(top[0], timeZone, period),
          day: String(top[1]).trim(),
          trips,
          cng,
        });
      }
    }

    entries.sort((a, b) => b.date.localeCompare(a.date));
    return out({ ok: true, title, headings, entries });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  let data;

  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return out({ ok: false, error: "Invalid JSON request: " + String(err) });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const timeZone = ss.getSpreadsheetTimeZone();

    if (!data.date) {
      return out({ ok: false, error: "A date is required" });
    }

    // Accept yyyy-mm-dd or dd/mm/yyyy from the client.
    data.date = dateKey(data.date, timeZone);

    let sh;
    let row;

    if (data.action === "update") {
      for (const candidateSheet of getTrackingSheets(ss)) {
        const foundRow = findEntryRow(candidateSheet, data.date, timeZone);
        if (foundRow) {
          sh = candidateSheet;
          row = foundRow;
          break;
        }
      }

      if (!row) {
        return out({ ok: false, error: "No saved entry found for " + data.date });
      }
    } else {
      sh = getSheet();

      for (let candidate = FIRST_ROW; candidate <= LAST_ROW; candidate += 2) {
        if (sh.getRange(candidate, 1).getValue() === "") {
          row = candidate;
          break;
        }
      }

      if (!row) {
        return out({ ok: false, error: "No free rows left in the sheet" });
      }
    }

    const paidRow = row + 1;
    // Always written as a real date, so an update also repairs a swapped date cell.
    const parsedDate = Utilities.parseDate(data.date, timeZone, "yyyy-MM-dd");

    sh.getRange(row, 1, 1, 2).setValues([[parsedDate, data.day || ""]]);
    sh.getRange(row, 1).setNumberFormat("dd/mm/yyyy");

    const trips = Array.isArray(data.trips) ? data.trips : [];
    const cng = Array.isArray(data.cng) ? data.cng : [];
    const cngNotesInput = Array.isArray(data.cngNotes) ? data.cngNotes : [];

    const tripAmounts = Array(8).fill("");
    const paidMarks = Array(8).fill("");
    const tripNotes = Array(8).fill("");

    trips.slice(0, 8).forEach((trip, i) => {
      tripAmounts[i] = trip.amount ?? "";
      paidMarks[i] = trip.paid ? "Paid" : "";
      tripNotes[i] = trip.note || "";
    });

    const cngAmounts = Array(3).fill("");
    const cngNotes = Array(3).fill("");

    cng.slice(0, 3).forEach((fill, i) => {
      if (fill && typeof fill === "object") {
        cngAmounts[i] = fill.amount ?? "";
        cngNotes[i] = fill.note || "";
      } else {
        cngAmounts[i] = fill ?? "";
        cngNotes[i] = cngNotesInput[i] || "";
      }
    });

    sh.getRange(row, 3, 1, 8).setValues([tripAmounts]);       // C..J
    sh.getRange(paidRow, 3, 1, 8).setValues([paidMarks]);     // C..J
    sh.getRange(row, 11, 1, 3).setValues([cngAmounts]);       // K..M

    // Store notes on their corresponding amount cells.
    sh.getRange(row, 3, 1, 8).setNotes([tripNotes]);          // C..J
    sh.getRange(row, 11, 1, 3).setNotes([cngNotes]);          // K..M

    // Rewrite formulas so edits also refresh all calculated values.
    sh.getRange(row, 14).setFormula(`=COUNT(C${row}:J${row})`);
    sh.getRange(row, 15).setFormula(`=COUNT(K${row}:M${row})`);
    sh.getRange(row, 16).setFormula(`=COUNTIF(C${paidRow}:J${paidRow},"Paid")`);
    sh.getRange(row, 17).setFormula(`=SUM(C${row}:J${row})`);
    sh.getRange(row, 18).setFormula(`=SUM(K${row}:M${row})`);
    sh.getRange(row, 19).setFormula(`=Q${row}-R${row}`);
    sh.getRange(paidRow, 20).setFormula(
      `=SUMIF(C${paidRow}:J${paidRow},"Paid",C${row}:J${row})`
    );
    sh.getRange(paidRow, 21).setFormula(`=S${row}-T${paidRow}`);
    sh.getRange(row, 24).setFormula(
      `=COUNTIF(C${row}:M${row},870)+COUNTIF(C${row}:M${row},580)`
    );
    sh.getRange(row, 25).setFormula(`=COUNTIF(C${row}:M${row},870)`);
    sh.getRange(row, 26).setFormula(
      `=SUMPRODUCT((C${row}:M${row}=870)*C${row}:M${row})+SUMPRODUCT((C${row}:M${row}=580)*C${row}:M${row})`
    );

    return out({
      ok: true,
      action: data.action === "update" ? "update" : "create",
      sheet: sh.getName(),
      row,
    });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
