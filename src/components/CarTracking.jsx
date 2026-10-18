import { useEffect, useMemo, useState } from "react";
import { MAX_TRIPS, MAX_CNG, calcEntry, summarize } from "./calc.js";
import { loadSheet, saveEntry, updateEntry } from "./api.js";
import "./CarTrackingForm.css";

const MONTH = "2026-11"; // November 2026
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

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

const entryNotes = (entry) => [
  ...(entry.trips || []).map((trip, i) => trip.note ? `Trip ${i + 1}: ${trip.note}` : ""),
  ...(entry.cng || []).map((fill, i) => {
    const note = typeof fill === "object" ? fill.note : "";
    return note ? `CNG ${i + 1}: ${note}` : "";
  }),
].filter(Boolean).join(" · ");

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

export default function CarTracker() {
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [trips, setTrips] = useState([newTrip()]);
  const [cngs, setCngs] = useState([newCng()]);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState("Car tracker · November 2026");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const sheet = await loadSheet();
      setEntries(sheet.entries);
      if (sheet.title) setTitle(sheet.title);
    } catch {
      setMsg({ type: "err", text: "Could not load saved entries. Check SCRIPT_URL in api.js." });
    }
  };
  useEffect(() => { refresh(); }, []);

  const live = useMemo(() => calcEntry(trips, cngs.map((c) => c.amount)), [trips, cngs]);
  const editLive = useMemo(
    () => editing && calcEntry(editing.trips, editing.cngs.map((c) => c.amount)),
    [editing]
  );
  const rows = useMemo(
    () => entries.map((e) => ({ ...e, ...calcEntry(e.trips, e.cng) })),
    [entries]
  );
  const month = useMemo(() => summarize(rows), [rows]);

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

  return (
    <main className="ct">
      <h1>{title}</h1>

      <section className="card">
        <div className="two">
          <div>
            <label htmlFor="date">Date</label>
            <input id="date" type="date" min={`${MONTH}-01`} max={`${MONTH}-31`} value={date} onChange={onDate} />
          </div>
          <div>
            <label htmlFor="day">Day</label>
            <input id="day" value={day} onChange={(e) => setDay(e.target.value)} placeholder="e.g. Monday" />
          </div>
        </div>
      </section>

      <section className="card trip">
        <h2>Trips <span>{live.totalTrips} · {inr(live.tripAmount)}</span></h2>
        {trips.map((t, i) => (
          <div className="row" key={t.id}>
            <div>
              <label htmlFor={`t${t.id}`}>Trip {i + 1} amount</label>
              <input id={`t${t.id}`} type="text" inputMode="decimal" value={t.amount}
                onChange={(e) => setTrip(t.id, { amount: e.target.value })} />
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
        <h2>CNG <span>{live.cngFills} · {inr(live.cngAmount)}</span></h2>
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
          ["Yellanka trips", `${live.yellankaCount} (${live.escortCount} escort)`],
        ]} />
      </section>

      <p className={`msg ${msg.type}`} role="status">{msg.text}</p>
      <button type="button" className="save" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save to sheet"}
      </button>

      <h2 className="gap">October totals <button className="link" onClick={refresh}>Refresh</button></h2>
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

      <section className="card wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Trips</th><th>Trip amt</th><th>CNG</th><th>Profit</th><th>Paid</th><th>Remaining</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="9">No entries yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.date}>
                <td>{r.date.slice(8)}/{r.date.slice(5, 7)}</td><td>{r.day}</td><td>{r.totalTrips}</td>
                <td>{inr(r.tripAmount)}</td><td>{inr(r.cngAmount)}</td><td>{inr(r.profit)}</td>
                <td>{inr(r.paidAmount)}</td><td>{inr(r.remaining)}</td><td>{entryNotes(r) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="gap">Edit saved entries</h2>
      <section className="card">
        {entries.length === 0 ? <p>No saved entries to edit.</p> : (
          <ul className="edit-list">
            {entries.map((entry) => (
              <li key={entry.date}>
                <span>{entry.date} · {entry.day}</span>
                <button type="button" className="link" onClick={() => startEditing(entry)}>Edit</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <section className="card edit-form">
          <h2>Edit entry · {editing.date}</h2>
          <label htmlFor="edit-day">Day</label>
          <input id="edit-day" value={editing.day}
            onChange={(e) => setEditing({ ...editing, day: e.target.value })} />

          <section className="card trip">
            <h2>Trips <span>{editLive.totalTrips} · {inr(editLive.tripAmount)}</span></h2>
            {editing.trips.map((trip, i) => (
              <div className="edit-item" key={trip.id}>
                <div className="row">
                  <div>
                    <label htmlFor={`et${trip.id}`}>Trip {i + 1} amount</label>
                    <input id={`et${trip.id}`} type="text" inputMode="decimal" value={trip.amount}
                      onChange={(e) => setEditTrip(trip.id, { amount: e.target.value })} />
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
            <h2>CNG <span>{editLive.cngFills} · {inr(editLive.cngAmount)}</span></h2>
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