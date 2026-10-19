import { MAX_TRIPS, MAX_CNG } from "./calc.js";
import { inr, newCng, newTrip } from "../utils/tracking.js";

export default function EditEntryForm({
  editing,
  editLive,
  busy,
  setEditing,
  setEditTrip,
  delEditTrip,
  setEditCng,
  delEditCng,
  onSave,
}) {
  return (
    <section className="card edit-form">
      <h2>Edit entry · {editing.date}</h2>
      <label htmlFor="edit-day">Day</label>
      <input id="edit-day" value={editing.day}
        onChange={(event) => setEditing({ ...editing, day: event.target.value })} />

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
        {editing.trips.map((trip, index) => (
          <div className="edit-item" key={trip.id}>
            <div className="row">
              <div>
                <label htmlFor={`et${trip.id}`}>Trip {index + 1} amount</label>
                <div className="amount-control">
                  <select
                    aria-label={`Choose preset amount for trip ${index + 1}`}
                    value={["580", "870"].includes(String(trip.amount)) ? String(trip.amount) : ""}
                    onChange={(event) => {
                      if (event.target.value) setEditTrip(trip.id, { amount: event.target.value });
                    }}
                  >
                    <option value="">Preset</option>
                    <option value="870">₹870</option>
                    <option value="580">₹580</option>
                  </select>
                  <input id={`et${trip.id}`} type="text" inputMode="decimal" value={trip.amount}
                    placeholder="Or enter amount"
                    onChange={(event) => setEditTrip(trip.id, { amount: event.target.value })} />
                </div>
              </div>
              <label className="paid">
                <input type="checkbox" checked={trip.paid}
                  onChange={(event) => setEditTrip(trip.id, { paid: event.target.checked })} />
                Paid
              </label>
              <button type="button" className="x" aria-label={`Remove trip ${index + 1}`}
                onClick={() => delEditTrip(trip.id)}>×</button>
            </div>
            <label htmlFor={`etn${trip.id}`}>Trip {index + 1} note</label>
            <input id={`etn${trip.id}`} type="text" value={trip.note}
              onChange={(event) => setEditTrip(trip.id, { note: event.target.value })} placeholder="Optional note" />
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
        {editing.cngs.map((fill, index) => (
          <div className="edit-item" key={fill.id}>
            <div className="row">
              <div>
                <label htmlFor={`ec${fill.id}`}>CNG fill {index + 1}</label>
                <input id={`ec${fill.id}`} type="text" inputMode="decimal" value={fill.amount}
                  onChange={(event) => setEditCng(fill.id, { amount: event.target.value })} />
              </div>
              <button type="button" className="x" aria-label={`Remove CNG fill ${index + 1}`}
                onClick={() => delEditCng(fill.id)}>×</button>
            </div>
            <label htmlFor={`ecn${fill.id}`}>CNG fill {index + 1} note</label>
            <input id={`ecn${fill.id}`} type="text" value={fill.note}
              onChange={(event) => setEditCng(fill.id, { note: event.target.value })} placeholder="Optional note" />
          </div>
        ))}
        <button type="button" className="add" disabled={editing.cngs.length >= MAX_CNG}
          onClick={() => setEditing({ ...editing, cngs: [...editing.cngs, newCng()] })}>
          + Add CNG fill ({editing.cngs.length}/{MAX_CNG})
        </button>
      </section>
      <div className="edit-actions">
        <button type="button" className="save" disabled={busy} onClick={onSave}>
          {busy ? "Saving…" : "Post changes"}
        </button>
        <button type="button" className="cancel" onClick={() => setEditing(null)}>Cancel</button>
      </div>
    </section>
  );
}
