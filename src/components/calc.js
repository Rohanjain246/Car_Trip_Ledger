// Same rules as the October_Tracking sheet formulas.
export const MAX_TRIPS = 8; // Trip 1..8
export const MAX_CNG = 3;   // CNG Fill 1..3
const YELLANKA_AMOUNTS = [580, 870]; // sheet counts these amounts as Yellanka trips
const YELLANKA_NON_ESCORT_AMOUNT = 580;
const ESCORT_AMOUNT = 870;           // sheet counts 870 as "Yellanka escort"

const sum = (a) => a.reduce((x, y) => x + y, 0);
const KEYS = [
  "totalTrips", "cngFills", "paidCount", "tripAmount", "cngAmount", "profit",
  "paidAmount", "remaining", "yellankaCount", "escortCount", "yellankaAmount",
  "yellankaNonEscortAmount", "yellankaEscortAmount", "otherTripsAmount",
];

// trips: [{ amount, paid }], cng: [amount, ...] (blank values are ignored)
export function calcEntry(trips, cng) {
  const t = trips
    .filter((r) => r.amount !== "" && r.amount != null)
    .map((r) => ({ amount: Number(r.amount), paid: !!r.paid }));
  const c = cng
    .filter((v) => v !== "" && v != null)
    .map((v) => Number(typeof v === "object" ? v.amount : v));

  const tripAmount = sum(t.map((r) => r.amount));
  const cngAmount = sum(c);
  const paidAmount = sum(t.filter((r) => r.paid).map((r) => r.amount));
  const y = t.filter((r) => YELLANKA_AMOUNTS.includes(r.amount));

  return {
    totalTrips: t.length,
    cngFills: c.length,
    paidCount: t.filter((r) => r.paid).length,
    tripAmount,
    cngAmount,
    profit: tripAmount - cngAmount,          // Total Profitable amount
    paidAmount,
    remaining: tripAmount - cngAmount - paidAmount, // Remaining Amount To Pay
    yellankaCount: y.length,
    escortCount: t.filter((r) => r.amount === ESCORT_AMOUNT).length,
    yellankaAmount: sum(y.map((r) => r.amount)),
    yellankaNonEscortAmount: sum(t.filter((r) => r.amount === YELLANKA_NON_ESCORT_AMOUNT).map((r) => r.amount)),
    yellankaEscortAmount: sum(t.filter((r) => r.amount === ESCORT_AMOUNT).map((r) => r.amount)),
    otherTripsAmount: sum(t.filter((r) => !YELLANKA_AMOUNTS.includes(r.amount)).map((r) => r.amount)),
  };
}

// Month totals (the "Total" row at the bottom of the sheet)
export function summarize(list) {
  const s = Object.fromEntries(KEYS.map((k) => [k, sum(list.map((r) => r[k]))]));
  return {
    ...s,
    days: list.length,
    toPayWithoutCng: s.tripAmount - s.paidAmount,
  };
}