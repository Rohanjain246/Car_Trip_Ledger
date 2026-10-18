import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_TRIPS, MAX_CNG, calcEntry, summarize } from "./calc.js";
import { loadSheet, saveEntry, updateEntry } from "./api.js";
import "./CarTrackingForm.css";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TODAY = getLocalDateString();
const MONTH = TODAY.slice(0, 7);
const FIRST_RECORD_MONTH = "2026-06";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const CURRENT_MONTH_LABEL = new Date(`${MONTH}-01T00:00:00`).toLocaleDateString("en", {
  month: "long",
  year: "numeric",
});

function getMonthOptions(start, end) {
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

const RECORD_MONTHS = MONTH >= FIRST_RECORD_MONTH
  ? getMonthOptions(FIRST_RECORD_MONTH, MONTH)
  : [];

let uid = 1;
const newTrip = () => ({ id: uid++, amount: "", paid: false, note: "" });
const newCng = () => ({ id: uid++, amount: "", note: "" });

const prepareEntry = (entry) => ({
  ...entry,
  trips: (entry.trips || []).map((trip) => ({ ...trip, id: uid++, note: trip.note || "" })),
  cngs: (entry.cng || []).map((fill) => ({
    id: uid++,
    amount: typeof fill === "object" ? String(fill.amount ?? "") : String(fill),
    note: typeof fill === "object" ? fill.note || "" : "",
  })),
});

function Stats({ items }) {
  return (
    <dl className="stats">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ThemeToggle({ theme, onToggle }) {
  const targetTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${targetTheme} mode`}
      title={`Switch to ${targetTheme} mode`}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
          <path d="M16 3v4m-2-2h4" />
        </svg>
      )}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

function PalettePicker({ palette, onChange }) {
  return (
    <div className="palette-picker" role="group" aria-label="Choose color palette">
      <button
        type="button"
        className="palette-choice classic-choice"
        aria-pressed={palette === "classic"}
        onClick={() => onChange("classic")}
      >
        <span aria-hidden="true" />
        Classic
      </button>
      <button
        type="button"
        className="palette-choice maroon-choice"
        aria-pressed={palette === "maroon"}
        onClick={() => onChange("maroon")}
      >
        <span aria-hidden="true" />
        Maroon
      </button>
    </div>
  );
}

export default function CarTracker() {
  const [date, setDate] = useState(TODAY);
  const [day, setDay] = useState(() => DAYS[new Date(`${TODAY}T00:00:00`).getDay()]);
  const [trips, setTrips] = useState([newTrip()]);
  const [cngs, setCngs] = useState([newCng()]);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const recordDialog = useRef(null);
  const [recordsFrom, setRecordsFrom] = useState("");
  const [recordsTo, setRecordsTo] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("car-tracker-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [palette, setPalette] = useState(() => {
    const savedPalette = localStorage.getItem("car-tracker-palette");
    return savedPalette === "classic" ? "classic" : "maroon";
  });

  useEffect(() => {
    localStorage.setItem("car-tracker-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("car-tracker-palette", palette);
  }, [palette]);

  const refresh = async () => {
    try {
      const sheet = await loadSheet();
      setEntries(sheet.entries);
    } catch (error) {
      setMsg({
        type: "err",
        text: error instanceof Error
          ? `Could not load saved entries: ${error.message}`
          : "Could not load saved entries. Check VITE_SCRIPT_URL in .env.local.",
      });
    } finally {
      setInitialLoading(false);
    }
  };
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (selectedRecord && recordDialog.current && !recordDialog.current.open) {
      recordDialog.current.showModal();
    }
  }, [selectedRecord]);

  const live = useMemo(() => calcEntry(trips, cngs.map((c) => c.amount)), [trips, cngs]);
  const editLive = useMemo(
    () => editing && calcEntry(editing.trips, editing.cngs.map((c) => c.amount)),
    [editing]
  );
  const rows = useMemo(
    () => entries
      .map((e) => ({ ...e, ...calcEntry(e.trips, e.cng) }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );
  const hasRecordRange = Boolean(recordsFrom && recordsTo);
  const validRecordRange = hasRecordRange && recordsFrom <= recordsTo;
  const visibleRows = useMemo(
    () => validRecordRange
      ? rows.filter((row) => row.date >= recordsFrom && row.date <= recordsTo)
      : [],
    [rows, recordsFrom, recordsTo, validRecordRange]
  );
  const selectedTotals = useMemo(() => summarize(visibleRows), [visibleRows]);
  const monthRows = useMemo(() => rows.filter((row) => row.date.startsWith(MONTH)), [rows]);
  const month = useMemo(() => summarize(monthRows), [monthRows]);
  const monthLabel = CURRENT_MONTH_LABEL;
  const selectedDateLabel = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : "Select a date";

  const onDate = (e) => {
    const v = e.target.value;
    setDate(v);
    if (v) setDay(DAYS[new Date(`${v}T00:00:00`).getDay()]);
  };
  const setTrip = (id, patch) => setTrips(trips.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const delTrip = (id) => setTrips(trips.length > 1 ? trips.filter((t) => t.id !== id) : [newTrip()]);
  const setCng = (id, amount) => setCngs(cngs.map((c) => (c.id === id ? { ...c, amount } : c)));
  const delCng = (id) => setCngs(cngs.length > 1 ? cngs.filter((c) => c.id !== id) : [newCng()]);
  const setEditTrip = (id, patch) => setEditing((current) => ({
    ...current,
    trips: current.trips.map((trip) => trip.id === id ? { ...trip, ...patch } : trip),
  }));
  const delEditTrip = (id) => setEditing((current) => ({
    ...current,
    trips: current.trips.length > 1
      ? current.trips.filter((trip) => trip.id !== id)
      : [newTrip()],
  }));
  const setEditCng = (id, patch) => setEditing((current) => ({
    ...current,
    cngs: current.cngs.map((fill) => fill.id === id ? { ...fill, ...patch } : fill),
  }));
  const delEditCng = (id) => setEditing((current) => ({
    ...current,
    cngs: current.cngs.length > 1
      ? current.cngs.filter((fill) => fill.id !== id)
      : [newCng()],
  }));

  const fail = (text) => setMsg({ type: "err", text });

  const save = async () => {
    if (!date) return fail("Choose a date.");
    if (!live.totalTrips && !live.cngFills) return fail("Add at least one trip or CNG fill.");
    if (entries.some((e) => e.date === date)) return fail("This date is already saved. Edit it in the sheet.");

    setBusy(true);
    try {
      await saveEntry({
        date,
        day,
        trips: trips.filter((t) => t.amount !== "").map((t) => ({
          amount: Number(t.amount), paid: t.paid, note: t.note,
        })),
        cng: cngs.filter((c) => c.amount !== "").map((c) => Number(c.amount)),
        cngNotes: cngs.filter((c) => c.amount !== "").map((c) => c.note),
      });
      setMsg({ type: "ok", text: `Saved ${date} to the sheet.` });
      setDate(""); setDay(""); setTrips([newTrip()]); setCngs([newCng()]);
      setTimeout(refresh, 1500);
    } catch {
      fail("Could not save. Check your internet and try again.");
    }
    setBusy(false);
  };

  const updateSavedEntry = async () => {
    if (!editing) return;
    if (!editLive.totalTrips && !editLive.cngFills) return fail("Add at least one trip or CNG fill.");

    setBusy(true);
    try {
      await updateEntry({
        date: editing.date,
        day: editing.day,
        trips: editing.trips.filter((trip) => trip.amount !== "").map((trip) => ({
          amount: Number(trip.amount), paid: trip.paid, note: trip.note,
        })),
        cng: editing.cngs.filter((fill) => fill.amount !== "").map((fill) => Number(fill.amount)),
        cngNotes: editing.cngs.filter((fill) => fill.amount !== "").map((fill) => fill.note),
      });
      setEntries((current) => current.map((entry) => entry.date === editing.date
        ? { ...entry, day: editing.day, trips: editing.trips, cng: editing.cngs }
        : entry));
      setEditing(null);
      setMsg({ type: "ok", text: `Updated ${editing.date}.` });
      setTimeout(refresh, 1500);
    } catch {
      fail("Could not update. Check your internet and try again.");
    }
    setBusy(false);
  };

  const startEditing = (entry) => {
    setEditing(prepareEntry(entry));
    setMsg({ type: "", text: "" });
  };

  const handleRecordRowKeyDown = (event, entry) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedRecord(entry);
    }
  };

  if (initialLoading) {
    return (
      <main className="ct ct-loading" data-theme={theme} data-palette={palette} aria-live="polite" aria-busy="true">
        <header className="loading-topbar">
          <span className="loading-brand">CAR TRACKER</span>
          <div className="header-actions">
            <PalettePicker palette={palette} onChange={setPalette} />
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
          </div>
        </header>
        <div className="loading-scene">
          <div className="loading-sun" />
          <div className="loading-hill loading-hill-back" />
          <div className="loading-hill loading-hill-front" />
          <div className="loading-road">
            <span className="road-dash" />
            <span className="road-dash" />
            <span className="road-dash" />
            <svg className="loading-car" viewBox="0 0 180 92" role="img" aria-label="Car driving">
              <path d="M24 56 35 32c3-7 9-11 17-11h55c8 0 14 3 19 10l17 25 13 5c5 2 8 6 8 12v7H15v-9c0-7 3-11 9-13Z" fill="currentColor" />
              <path d="m49 35-8 18h36V29H54c-2 0-4 2-5 6Zm37-6v24h49l-14-20c-2-3-5-4-9-4H86Z" fill="var(--car-glass)" />
              <path d="M20 61h139" stroke="var(--car-highlight)" strokeWidth="4" strokeLinecap="round" />
              <circle cx="48" cy="76" r="13" fill="var(--car-wheel)" />
              <circle cx="48" cy="76" r="5" fill="var(--car-hub)" />
              <circle cx="137" cy="76" r="13" fill="var(--car-wheel)" />
              <circle cx="137" cy="76" r="5" fill="var(--car-hub)" />
              <path d="M24 58h9m125 0h9" stroke="var(--car-light)" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="loading-copy">
          <span className="loading-kicker">YOUR DAILY DRIVE</span>
          <h1>Getting your records ready</h1>
          <p>Connecting to your tracker and gathering your journeys…</p>
          <div className="loading-progress"><span /></div>
          <span className="loading-caption">Just a moment</span>
        </div>
      </main>
    );
  }

  return (
    <main className="ct" data-theme={theme} data-palette={palette}>
      <header className="app-header">
        <div>
          <span className="app-eyebrow">YOUR DAILY DRIVE</span>
          <h1>Car tracker · {CURRENT_MONTH_LABEL}</h1>
        </div>
        <div className="header-actions">
          <PalettePicker palette={palette} onChange={setPalette} />
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
        </div>
      </header>

      <section className="card">
        <div className="two">
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" min={`${MONTH}-01`} max={TODAY} value={date} onChange={onDate} />
            <p className="date-full" aria-live="polite">{selectedDateLabel}</p>
          </div>
          <div>
            <label htmlFor="day">Day</label>
            <input id="day" value={day} onChange={(e) => setDay(e.target.value)} placeholder="e.g. Monday" />
          </div>
        </div>
      </section>

      <section className="card trip">
        <h2>
          <span className="section-title">
            <span className="section-icon trip-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 16.5 6.2 11l1.3-3.3A2.5 2.5 0 0 1 9.8 6h4.4a2.5 2.5 0 0 1 2.3 1.7l1.3 3.3 1.2 5.5V19h-2v-2H7v2H5v-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M7 12h10M8 15h.01M16 15h.01M9 6l1 5m5-5-1 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            Trips
          </span>
          <span>{live.totalTrips} · {inr(live.tripAmount)}</span>
        </h2>
        {trips.map((t, i) => (
          <div className="row" key={t.id}>
            <div>
              <label htmlFor={`t${t.id}`}>Trip {i + 1} amount</label>
              <div className="amount-control">
                <select
                  aria-label={`Choose preset amount for trip ${i + 1}`}
                  value={["580", "870"].includes(String(t.amount)) ? String(t.amount) : ""}
                  onChange={(e) => {
                    if (e.target.value) setTrip(t.id, { amount: e.target.value });
                  }}
                >
                  <option value="">Preset</option>
                  <option value="870">₹870</option>
                  <option value="580">₹580</option>
                </select>
                <input id={`t${t.id}`} type="text" inputMode="decimal" value={t.amount}
                  placeholder="Or enter amount"
                onChange={(e) => setTrip(t.id, { amount: e.target.value })} />
              </div>
              <label htmlFor={`tn${t.id}`}>Trip {i + 1} note</label>
              <input id={`tn${t.id}`} type="text" value={t.note}
                onChange={(e) => setTrip(t.id, { note: e.target.value })} placeholder="Optional note" />
            </div>
            <label className="paid">
              <input type="checkbox" checked={t.paid} onChange={(e) => setTrip(t.id, { paid: e.target.checked })} />
              Paid
            </label>
            <button type="button" className="x" aria-label={`Remove trip ${i + 1}`} onClick={() => delTrip(t.id)}>×</button>
          </div>
        ))}
        <button type="button" className="add" disabled={trips.length >= MAX_TRIPS}
          onClick={() => setTrips([...trips, newTrip()])}>
          + Add trip ({trips.length}/{MAX_TRIPS})
        </button>
      </section>

      <section className="card cng">
        <h2>
          <span className="section-title">
            <span className="section-icon cng-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M7 20V5.5A1.5 1.5 0 0 1 8.5 4h6A1.5 1.5 0 0 1 16 5.5V20M6 20h12M9 7h5v5H9zM16 8h1.5l1.5 2v5a1.5 1.5 0 0 0 3 0v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11.5 8.5 10 10.7h1.5l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            CNG
          </span>
          <span>{live.cngFills} · {inr(live.cngAmount)}</span>
        </h2>
        {cngs.map((c, i) => (
          <div className="row" key={c.id}>
            <div>
              <label htmlFor={`c${c.id}`}>CNG fill {i + 1}</label>
              <input id={`c${c.id}`} type="text" inputMode="decimal" min="0" value={c.amount}
                onChange={(e) => setCng(c.id, e.target.value)} />
              <label htmlFor={`cn${c.id}`}>CNG fill {i + 1} note</label>
              <input id={`cn${c.id}`} type="text" value={c.note}
                onChange={(e) => setCngs(cngs.map((fill) => fill.id === c.id
                  ? { ...fill, note: e.target.value } : fill))} placeholder="Optional note" />
            </div>
            <button type="button" className="x" aria-label={`Remove CNG fill ${i + 1}`} onClick={() => delCng(c.id)}>×</button>
          </div>
        ))}
        <button type="button" className="add" disabled={cngs.length >= MAX_CNG}
          onClick={() => setCngs([...cngs, newCng()])}>
          + Add CNG fill ({cngs.length}/{MAX_CNG})
        </button>
      </section>

      <section className="card">
        <h2>This entry</h2>
        <Stats items={[
          ["Profit (trips − CNG)", inr(live.profit)],
          ["Paid", inr(live.paidAmount)],
          ["Remaining to pay", inr(live.remaining)],
          ["Yellanka", `${live.yellankaCount} (${live.escortCount} escort)`],
        ]} />
      </section>

      <p className={`msg ${msg.type}`} role="status">{msg.text}</p>
      <button type="button" className="save" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save to sheet"}
      </button>

      <h2 className="gap">{monthLabel} totals <button className="link" onClick={refresh}>Refresh</button></h2>
      <section className="card">
        <Stats items={[
          ["Days worked", month.days],
          ["Total trips", month.totalTrips],
          ["Trip amount", inr(month.tripAmount)],
          ["CNG amount", inr(month.cngAmount)],
          ["Profit", inr(month.profit)],
          ["Paid", inr(month.paidAmount)],
          ["Remaining to pay", inr(month.remaining)],
          ["To pay without CNG", inr(month.toPayWithoutCng)],
          ["Yellanka trips", `${month.yellankaCount} (${month.escortCount} escort)`],
          ["Yellanka amount", inr(month.yellankaAmount)],
          ["Without Yellanka", inr(month.withoutYellanka)],
          ["Without Yellanka to pay", inr(month.withoutYellankaToPay)],
        ]} />
      </section>

      <h2 className="gap">Previous records</h2>
      <section className="card record-controls">
        <div>
          <label htmlFor="records-from">From</label>
          <input id="records-from" type="date" value={recordsFrom}
            onChange={(e) => setRecordsFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="records-to">To</label>
          <input id="records-to" type="date" value={recordsTo}
            onChange={(e) => setRecordsTo(e.target.value)} />
        </div>
        <button type="button" className="link" onClick={refresh}>Refresh records</button>
        {(recordsFrom || recordsTo) && (
          <button type="button" className="link" onClick={() => {
            setRecordsFrom("");
            setRecordsTo("");
          }}>
            Clear dates
          </button>
        )}
        <div className="month-shortcuts" aria-label="Choose a month">
          <span>Quick select month</span>
          <div>
            {RECORD_MONTHS.map((monthOption) => (
              <button
                key={monthOption.key}
                type="button"
                className="month-shortcut"
                aria-pressed={recordsFrom === monthOption.from && recordsTo === monthOption.to}
                onClick={() => {
                  setRecordsFrom(monthOption.from);
                  setRecordsTo(monthOption.to);
                }}
              >
                {monthOption.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {validRecordRange && (
        <section className="card">
          <h2>Selected range totals</h2>
          <p className="range-caption">{recordsFrom} to {recordsTo}</p>
          <Stats items={[
            ["Days worked", selectedTotals.days],
            ["Total trips", selectedTotals.totalTrips],
            ["Trip amount", inr(selectedTotals.tripAmount)],
            ["CNG amount", inr(selectedTotals.cngAmount)],
            ["Profit", inr(selectedTotals.profit)],
            ["Paid Amount", inr(selectedTotals.paidAmount)],
            ["Remaining to pay", inr(selectedTotals.remaining)],
            ["To pay without CNG", inr(selectedTotals.toPayWithoutCng)],
            ["Yellanka trips", `${selectedTotals.yellankaCount} (${selectedTotals.escortCount} escort)`],
            ["Yellanka amount", inr(selectedTotals.yellankaAmount)],
            ["Without Yellanka", inr(selectedTotals.withoutYellanka)],
            ["Without Yellanka to pay", inr(selectedTotals.withoutYellankaToPay)],
          ]} />
        </section>
      )}

      <section className="card wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Trips</th><th>Trip amt</th><th>CNG</th><th>Profit</th><th>Yellanka  (escort)</th><th>Action</th></tr>
          </thead>
          <tbody>
            {!hasRecordRange && (
              <tr><td colSpan="8">Choose both a From and To date to view records.</td></tr>
            )}
            {hasRecordRange && !validRecordRange && (
              <tr><td colSpan="8">The From date must be on or before the To date.</td></tr>
            )}
            {validRecordRange && visibleRows.length === 0 && (
              <tr><td colSpan="8">{rows.length ? "No records in this date range." : "No saved records yet."}</td></tr>
            )}
            {visibleRows.map((r) => (
              <tr
                key={r.date}
                className="record-row"
                tabIndex={0}
                role="button"
                aria-label={`View details for ${r.date}`}
                onClick={() => setSelectedRecord(r)}
                onKeyDown={(event) => handleRecordRowKeyDown(event, r)}
              >
                <td>{r.date.slice(8)}/{r.date.slice(5, 7)}/{r.date.slice(0, 4)}</td><td>{r.day}</td><td>{r.totalTrips}</td>
                <td>{inr(r.tripAmount)}</td><td>{inr(r.cngAmount)}</td><td>{inr(r.profit)}</td>
                <td>{r.yellankaCount} ({r.escortCount})</td>
                <td><button type="button" className="link" onClick={(event) => {
                  event.stopPropagation();
                  startEditing(r);
                }}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <dialog
        ref={recordDialog}
        className="record-dialog"
        aria-labelledby="record-dialog-title"
        onClose={() => setSelectedRecord(null)}
      >
        {selectedRecord && (
          <>
            <div className="record-dialog-header">
              <div>
                <span className="app-eyebrow">SAVED JOURNEY</span>
                <h2 id="record-dialog-title">Trip details</h2>
                <p>{selectedRecord.date} · {selectedRecord.day}</p>
              </div>
              <button
                type="button"
                className="dialog-close"
                aria-label="Close trip details"
                onClick={() => recordDialog.current?.close()}
              >
                ×
              </button>
            </div>

            <section className="detail-group">
              <h3>
                Trips
                <span className="detail-group-count">
                  {selectedRecord.totalTrips}
                  {selectedRecord.escortCount > 0 && ` · ${selectedRecord.escortCount} escort`}
                </span>
              </h3>
              {selectedRecord.trips.length === 0 ? (
                <p className="detail-empty">No trips recorded.</p>
              ) : selectedRecord.trips.map((trip, index) => (
                <div
                  className={`detail-line${Number(trip.amount) === 870 ? " detail-line-escort" : ""}`}
                  key={`trip-${index}`}
                >
                  <div>
                    <strong className="detail-trip-title">
                      Trip {index + 1}
                      {Number(trip.amount) === 870 && <span className="escort-badge">Escort</span>}
                    </strong>
                    <span>{trip.note || "No note"}</span>
                  </div>
                  <div className="detail-value">
                    <strong>{inr(trip.amount)}</strong>
                    <span>{trip.paid ? "Paid" : "Unpaid"}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="detail-group">
              <h3>
                CNG fills
                <span className="detail-group-count">{selectedRecord.cngFills}</span>
              </h3>
              {selectedRecord.cng.length === 0 ? (
                <p className="detail-empty">No CNG fills recorded.</p>
              ) : selectedRecord.cng.map((fill, index) => (
                <div className="detail-line" key={`cng-${index}`}>
                  <div>
                    <strong>CNG fill {index + 1}</strong>
                    <span>{typeof fill === "object" ? fill.note || "No note" : "No note"}</span>
                  </div>
                  <div className="detail-value">
                    <strong>{inr(typeof fill === "object" ? fill.amount : fill)}</strong>
                  </div>
                </div>
              ))}
            </section>

            <section className="detail-totals">
              <span>{selectedRecord.totalTrips} trips · {selectedRecord.cngFills} CNG fills</span>
              <strong>Profit {inr(selectedRecord.profit)}</strong>
            </section>

            <button type="button" className="save" onClick={() => {
              recordDialog.current?.close();
              startEditing(selectedRecord);
            }}>
              Edit this record
            </button>
          </>
        )}
      </dialog>

      {editing && (
        <section className="card edit-form">
          <h2>Edit entry · {editing.date}</h2>
          <label htmlFor="edit-day">Day</label>
          <input id="edit-day" value={editing.day}
            onChange={(e) => setEditing({ ...editing, day: e.target.value })} />

          <section className="card trip">
            <h2>
              <span className="section-title">
                <span className="section-icon trip-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 16.5 6.2 11l1.3-3.3A2.5 2.5 0 0 1 9.8 6h4.4a2.5 2.5 0 0 1 2.3 1.7l1.3 3.3 1.2 5.5V19h-2v-2H7v2H5v-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M7 12h10M8 15h.01M16 15h.01M9 6l1 5m5-5-1 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Trips
              </span>
              <span>{editLive.totalTrips} · {inr(editLive.tripAmount)}</span>
            </h2>
            {editing.trips.map((trip, i) => (
              <div className="edit-item" key={trip.id}>
                <div className="row">
                  <div>
                    <label htmlFor={`et${trip.id}`}>Trip {i + 1} amount</label>
                    <div className="amount-control">
                      <select
                        aria-label={`Choose preset amount for trip ${i + 1}`}
                        value={["580", "870"].includes(String(trip.amount)) ? String(trip.amount) : ""}
                        onChange={(e) => {
                          if (e.target.value) setEditTrip(trip.id, { amount: e.target.value });
                        }}
                      >
                        <option value="">Preset</option>
                        <option value="870">₹870</option>
                        <option value="580">₹580</option>
                      </select>
                      <input id={`et${trip.id}`} type="text" inputMode="decimal" value={trip.amount}
                        placeholder="Or enter amount"
                      onChange={(e) => setEditTrip(trip.id, { amount: e.target.value })} />
                    </div>
                  </div>
                  <label className="paid">
                    <input type="checkbox" checked={trip.paid}
                      onChange={(e) => setEditTrip(trip.id, { paid: e.target.checked })} />
                    Paid
                  </label>
                  <button type="button" className="x" aria-label={`Remove trip ${i + 1}`}
                    onClick={() => delEditTrip(trip.id)}>×</button>
                </div>
                <label htmlFor={`etn${trip.id}`}>Trip {i + 1} note</label>
                <input id={`etn${trip.id}`} type="text" value={trip.note}
                  onChange={(e) => setEditTrip(trip.id, { note: e.target.value })} placeholder="Optional note" />
              </div>
            ))}
            <button type="button" className="add" disabled={editing.trips.length >= MAX_TRIPS}
              onClick={() => setEditing({ ...editing, trips: [...editing.trips, newTrip()] })}>
              + Add trip ({editing.trips.length}/{MAX_TRIPS})
            </button>
          </section>

          <section className="card cng">
            <h2>
              <span className="section-title">
                <span className="section-icon cng-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 20V5.5A1.5 1.5 0 0 1 8.5 4h6A1.5 1.5 0 0 1 16 5.5V20M6 20h12M9 7h5v5H9zM16 8h1.5l1.5 2v5a1.5 1.5 0 0 0 3 0v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M11.5 8.5 10 10.7h1.5l-1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                CNG
              </span>
              <span>{editLive.cngFills} · {inr(editLive.cngAmount)}</span>
            </h2>
            {editing.cngs.map((fill, i) => (
              <div className="edit-item" key={fill.id}>
                <div className="row">
                  <div>
                    <label htmlFor={`ec${fill.id}`}>CNG fill {i + 1}</label>
                    <input id={`ec${fill.id}`} type="text" inputMode="decimal" value={fill.amount}
                      onChange={(e) => setEditCng(fill.id, { amount: e.target.value })} />
                  </div>
                  <button type="button" className="x" aria-label={`Remove CNG fill ${i + 1}`}
                    onClick={() => delEditCng(fill.id)}>×</button>
                </div>
                <label htmlFor={`ecn${fill.id}`}>CNG fill {i + 1} note</label>
                <input id={`ecn${fill.id}`} type="text" value={fill.note}
                  onChange={(e) => setEditCng(fill.id, { note: e.target.value })} placeholder="Optional note" />
              </div>
            ))}
            <button type="button" className="add" disabled={editing.cngs.length >= MAX_CNG}
              onClick={() => setEditing({ ...editing, cngs: [...editing.cngs, newCng()] })}>
              + Add CNG fill ({editing.cngs.length}/{MAX_CNG})
            </button>
          </section>
          <div className="edit-actions">
            <button type="button" className="save" disabled={busy} onClick={updateSavedEntry}>
              {busy ? "Saving…" : "Post changes"}
            </button>
            <button type="button" className="cancel" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </section>
      )}
    </main>
  );
}