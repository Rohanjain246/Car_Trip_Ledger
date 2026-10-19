import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_TRIPS, MAX_CNG, calcEntry, summarize } from "./calc.js";
import { loadSheet, saveEntry, updateEntry } from "./api.js";
import Stats from "./Stats";
import RecordDetailsDialog from "./RecordDetailsDialog";
import RecordTable from "./RecordTable";
import EditEntryForm from "./EditEntryForm";
import TrackerLoadingScreen from "./TrackerLoadingScreen";
import {
  CURRENT_MONTH_LABEL,
  DAYS,
  MONTH,
  RECORD_MONTHS,
  TODAY,
  inr,
  newCng,
  newTrip,
  prepareEntry,
} from "../utils/tracking.js";
import "./CarTrackingForm.css";

export default function CarTracker({ isAdmin = false, theme, palette }) {
  const [date, setDate] = useState(TODAY);
  const [day, setDay] = useState(() => DAYS[new Date(`${TODAY}T00:00:00`).getDay()]);
  const [trips, setTrips] = useState([newTrip()]);
  const [cngs, setCngs] = useState([newCng()]);
  const [entries, setEntries] = useState([]);
  const [summaryMonth, setSummaryMonth] = useState(MONTH);
  const [editing, setEditing] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const recordDialog = useRef(null);
  const [recordsFrom, setRecordsFrom] = useState("");
  const [recordsTo, setRecordsTo] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const hasPartialRecordRange = Boolean(recordsFrom || recordsTo) && !hasRecordRange;
  const hasAdminRecordSelection = validRecordRange;
  const visibleRows = useMemo(
    () => validRecordRange
      ? rows.filter((row) => row.date >= recordsFrom && row.date <= recordsTo)
      : recordsFrom || recordsTo
        ? []
        : isAdmin
          ? []
          : rows.filter((row) => row.date.startsWith(summaryMonth)),
    [rows, recordsFrom, recordsTo, validRecordRange, isAdmin, summaryMonth]
  );
  const selectedTotals = useMemo(() => summarize(visibleRows), [visibleRows]);
  const monthRows = useMemo(
    () => rows.filter((row) => row.date.startsWith(summaryMonth)),
    [rows, summaryMonth]
  );
  const month = useMemo(() => summarize(monthRows), [monthRows]);
  const monthLabel = RECORD_MONTHS.find((monthOption) => monthOption.key === summaryMonth)?.label
    || CURRENT_MONTH_LABEL;
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
    if (trips.some((trip) => trip.amount !== "" && !Number.isFinite(Number(trip.amount)))
      || cngs.some((fill) => fill.amount !== "" && !Number.isFinite(Number(fill.amount)))) {
      return fail("Trip and CNG amounts must be valid numbers.");
    }
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
    if (editing.trips.some((trip) => trip.amount !== "" && !Number.isFinite(Number(trip.amount)))
      || editing.cngs.some((fill) => fill.amount !== "" && !Number.isFinite(Number(fill.amount)))) {
      return fail("Trip and CNG amounts must be valid numbers.");
    }
    if (!editLive.totalTrips && !editLive.cngFills) return fail("Add at least one trip or CNG fill.");

    setBusy(true);
    try {
      await updateEntry({
        date: editing.date,
        sheet: editing.sheet,
        day: editing.day,
        trips: editing.trips.filter((trip) => trip.amount !== "").map((trip) => ({
          amount: Number(trip.amount), paid: trip.paid, note: trip.note,
        })),
        cng: editing.cngs.filter((fill) => fill.amount !== "").map((fill) => Number(fill.amount)),
        cngNotes: editing.cngs.filter((fill) => fill.amount !== "").map((fill) => fill.note),
      });
      setEntries((current) => current.map((entry) => entry.date === editing.date
        && entry.sheet === editing.sheet
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

  if (initialLoading) {
    return <TrackerLoadingScreen theme={theme} palette={palette} />;
  }

  return (
    <main className="ct" data-theme={theme} data-palette={palette}>
      <header className="app-header">
        <div>
          <span className="app-eyebrow">YOUR DAILY DRIVE</span>
          <h1>Car tracker · {CURRENT_MONTH_LABEL}</h1>
        </div>
      </header>

      {isAdmin && (
        <>
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
          ["Paid amount", inr(live.paidAmount)],
          ["Remaining to pay", inr(live.remaining)],
          ["Yellanka", `${live.yellankaCount} (${live.escortCount} escort)`],
        ]} />
      </section>

      <p className={`msg ${msg.type}`} role="status">{msg.text}</p>
      <button type="button" className="save" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save to sheet"}
      </button>
        </>
      )}

      {!isAdmin && (
        <section className="card">
          <label htmlFor="summary-month">Choose a month</label>
          <select
            id="summary-month"
            value={summaryMonth}
            onChange={(event) => setSummaryMonth(event.target.value)}
          >
            {RECORD_MONTHS.map((monthOption) => (
              <option key={monthOption.key} value={monthOption.key}>{monthOption.label}</option>
            ))}
          </select>
        </section>
      )}
      <h2 className="gap">{monthLabel} totals <button className="link" onClick={refresh}>Refresh</button></h2>
      <section className="card">
        <Stats items={[
          ["Days worked", month.days],
          ["Total trips", month.totalTrips],
          ["Trip amount", inr(month.tripAmount)],
          ["CNG amount", inr(month.cngAmount)],
          ["Profit", inr(month.profit)],
          ["Paid amount", inr(month.paidAmount)],
          ["Remaining to pay", inr(month.remaining)],
          ["Other trips", inr(month.otherTripsAmount)],
          ["Yellanka trips", `${month.yellankaCount} (${month.escortCount} escort)`],
          ["Yellanka non-escort", inr(month.yellankaNonEscortAmount)],
          ["Yellanka with escort", inr(month.yellankaEscortAmount)],
          ["Yellanka amount", inr(month.yellankaAmount)],
        ]} />
      </section>

      {isAdmin && (
        <>
          <h2 className="gap">Filter previous records</h2>
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
            ["Other trips", inr(selectedTotals.otherTripsAmount)],
            ["Yellanka trips", `${selectedTotals.yellankaCount} (${selectedTotals.escortCount} escort)`],
            ["Yellanka non-escort", inr(selectedTotals.yellankaNonEscortAmount)],
            ["Yellanka with escort", inr(selectedTotals.yellankaEscortAmount)],
            ["Yellanka amount", inr(selectedTotals.yellankaAmount)],
          ]} />
        </section>
      )}

        </>
      )}

      <h2 className="gap">{isAdmin ? "Previous records" : `${monthLabel} records`}</h2>
      <RecordTable
        isAdmin={isAdmin}
        hasAdminRecordSelection={hasAdminRecordSelection}
        hasPartialRecordRange={hasPartialRecordRange}
        hasRecordRange={hasRecordRange}
        validRecordRange={validRecordRange}
        visibleRows={visibleRows}
        entriesCount={rows.length}
        onSelectRecord={setSelectedRecord}
        onEditRecord={startEditing}
      />
      <RecordDetailsDialog
        dialogRef={recordDialog}
        selectedRecord={selectedRecord}
        isAdmin={isAdmin}
        onClose={() => setSelectedRecord(null)}
        onEdit={startEditing}
      />

      {isAdmin && editing && (
        <EditEntryForm
          editing={editing}
          editLive={editLive}
          busy={busy}
          setEditing={setEditing}
          setEditTrip={setEditTrip}
          delEditTrip={delEditTrip}
          setEditCng={setEditCng}
          delEditCng={delEditCng}
          onSave={updateSavedEntry}
        />
      )}
    </main>
  );
}