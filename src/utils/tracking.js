export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const TODAY = getLocalDateString();
export const MONTH = TODAY.slice(0, 7);
export const FIRST_RECORD_MONTH = "2026-06";
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const inr = (amount) => "₹" + Number(amount).toLocaleString("en-IN");
export const CURRENT_MONTH_LABEL = new Date(`${MONTH}-01T00:00:00`).toLocaleDateString("en", {
  month: "long",
  year: "numeric",
});

export function getMonthOptions(start, end) {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  const firstIndex = startYear * 12 + startMonth - 1;
  const lastIndex = endYear * 12 + endMonth - 1;

  return Array.from({ length: lastIndex - firstIndex + 1 }, (_, offset) => {
    const index = firstIndex + offset;
    const year = Math.floor(index / 12);
    const month = index % 12;
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    return {
      key,
      label: new Date(Date.UTC(year, month, 1)).toLocaleDateString("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      from: `${key}-01`,
      to: `${key}-${String(lastDay).padStart(2, "0")}`,
    };
  });
}

export const RECORD_MONTHS = MONTH >= FIRST_RECORD_MONTH
  ? getMonthOptions(FIRST_RECORD_MONTH, MONTH)
  : [];

let uid = 1;

export const newTrip = () => ({ id: uid++, amount: "", paid: false, note: "" });
export const newCng = () => ({ id: uid++, amount: "", note: "" });

export const prepareEntry = (entry) => ({
  ...entry,
  trips: (entry.trips || []).map((trip) => ({ ...trip, id: uid++, note: trip.note || "" })),
  cngs: (entry.cng || []).map((fill) => ({
    id: uid++,
    amount: typeof fill === "object" ? String(fill.amount ?? "") : String(fill),
    note: typeof fill === "object" ? fill.note || "" : "",
  })),
});
