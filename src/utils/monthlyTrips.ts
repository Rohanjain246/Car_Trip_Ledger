// @ts-expect-error api.js is a JavaScript module without a declaration file.
import { loadSheet } from "../components/api.js";

export type MonthlyTripData = {
  escort: number;
  nonEscort: number;
  other: number;
  invalidAmountCount: number;
};

type SheetTrip = { amount: number };
type SheetCng = { amount: number } | number;
type SheetEntry = { date: string; trips: SheetTrip[]; cng: SheetCng[] };
type SheetResponse = { entries: SheetEntry[] };

export type MonthlyAmountData = {
  month: string;
  tripAmount: number;
  cngAmount: number;
};

export const currentMonthKey = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
})();

const firstRecordMonth = "2026-06";
const [firstRecordYear, firstMonthNumber] = firstRecordMonth.split("-").map(Number);
const [currentYear, currentMonthNumber] = currentMonthKey.split("-").map(Number);
const firstMonthIndex = firstRecordYear * 12 + firstMonthNumber - 1;
const currentMonthIndex = currentYear * 12 + currentMonthNumber - 1;

export const monthlyTripMonthOptions = Array.from(
  { length: Math.max(0, currentMonthIndex - firstMonthIndex + 1) },
  (_, offset) => {
    const index = firstMonthIndex + offset;
    const year = Math.floor(index / 12);
    const month = index % 12;
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  },
);

const monthlyTripCache = new Map<string, MonthlyTripData>();
const monthlyTripRequests = new Map<string, Promise<MonthlyTripData>>();
let sheetEntriesCache: SheetEntry[] | null = null;
let sheetEntriesRequest: Promise<SheetEntry[]> | null = null;

function getSheetEntries(forceRefresh = false): Promise<SheetEntry[]> {
  if (forceRefresh) {
    sheetEntriesCache = null;
    sheetEntriesRequest = null;
  }
  if (sheetEntriesCache) return Promise.resolve(sheetEntriesCache);
  if (sheetEntriesRequest) return sheetEntriesRequest;

  const request = (loadSheet() as Promise<SheetResponse>)
    .then((sheet) => {
      if (!Array.isArray(sheet.entries)) {
        throw new Error("Tracker response did not contain a valid entries list.");
      }
      if (sheet.entries.some((entry) => !entry || typeof entry.date !== "string"
        || !Array.isArray(entry.trips) || !Array.isArray(entry.cng))) {
        throw new Error("Tracker response contains an invalid monthly record.");
      }
      sheetEntriesCache = sheet.entries;
      return sheet.entries;
    })
    .finally(() => {
      if (sheetEntriesRequest === request) sheetEntriesRequest = null;
    });
  sheetEntriesRequest = request;
  return request;
}

export function getCachedMonthlyTripData(monthKey: string): MonthlyTripData | null {
  return monthlyTripCache.get(monthKey) ?? null;
}

export function getMonthlyTripData(
  monthKey: string,
  forceRefresh = false,
): Promise<MonthlyTripData> {
  const cached = monthlyTripCache.get(monthKey);
  if (!forceRefresh && cached) return Promise.resolve(cached);
  const pending = monthlyTripRequests.get(monthKey);
  if (!forceRefresh && pending) return pending;

  const request = getSheetEntries(forceRefresh)
    .then((entries) => {
      const currentEntries = entries.filter((entry) => entry.date.startsWith(monthKey));
      const data: MonthlyTripData = { escort: 0, nonEscort: 0, other: 0, invalidAmountCount: 0 };
      for (const entry of currentEntries) {
        for (const trip of entry.trips) {
          const amount = trip.amount;
          if (amount == null || String(amount).trim() === "" || !Number.isFinite(Number(amount))) {
            data.invalidAmountCount += 1;
          } else if (Number(amount) === 870) {
            data.escort += 1;
          } else if (Number(amount) === 580) {
            data.nonEscort += 1;
          } else {
            data.other += 1;
          }
        }
      }
      monthlyTripCache.set(monthKey, data);
      return data;
    })
    .finally(() => {
      if (monthlyTripRequests.get(monthKey) === request) {
        monthlyTripRequests.delete(monthKey);
      }
    });
  monthlyTripRequests.set(monthKey, request);
  return request;
}

export async function getMonthlyAmountData(forceRefresh = false): Promise<MonthlyAmountData[]> {
  const entries = await getSheetEntries(forceRefresh);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthlyTotals = new Map<string, MonthlyAmountData>();
  for (const entry of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || entry.date > today) continue;
    const month = entry.date.slice(0, 7);
    let totals = monthlyTotals.get(month);
    if (!totals) {
      totals = { month, tripAmount: 0, cngAmount: 0 };
      monthlyTotals.set(month, totals);
    }
    for (const trip of entry.trips) {
      const amount = Number(trip.amount);
      if (Number.isFinite(amount)) totals.tripAmount += amount;
    }
    for (const fill of entry.cng) {
      const amount = Number(typeof fill === "object" ? fill.amount : fill);
      if (Number.isFinite(amount)) totals.cngAmount += amount;
    }
  }
  return [...monthlyTotals.values()].sort((left, right) => left.month.localeCompare(right.month));
}
