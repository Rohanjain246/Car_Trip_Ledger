// @ts-expect-error api.js is a JavaScript module without a declaration file.
import { loadSheet } from "../components/api.js";

export type MonthlyTripData = {
  escort: number;
  nonEscort: number;
  other: number;
  invalidAmountCount: number;
};

type SheetTrip = { amount: number };
type SheetEntry = { date: string; trips: SheetTrip[] };
type SheetResponse = { entries: SheetEntry[] };

export const currentMonthKey = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
})();

const monthlyTripCache = new Map<string, MonthlyTripData>();
const monthlyTripRequests = new Map<string, Promise<MonthlyTripData>>();

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

  const request = (loadSheet() as Promise<SheetResponse>)
    .then((sheet) => {
      if (!Array.isArray(sheet.entries)) {
        throw new Error("Tracker response did not contain a valid entries list.");
      }

      const currentEntries = sheet.entries.filter((entry) => entry.date.startsWith(monthKey));
      const data: MonthlyTripData = { escort: 0, nonEscort: 0, other: 0, invalidAmountCount: 0 };
      for (const entry of currentEntries) {
        if (!Array.isArray(entry.trips)) {
          throw new Error(`Tracker response contains invalid trips for ${entry.date}.`);
        }
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
