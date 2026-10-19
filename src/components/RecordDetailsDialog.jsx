import { inr } from "../utils/tracking.js";

export default function RecordDetailsDialog({
  dialogRef,
  selectedRecord,
  isAdmin,
  onClose,
  onEdit,
}) {
  if (!selectedRecord) {
    return (
      <dialog
        ref={dialogRef}
        className="record-dialog"
        aria-labelledby="record-dialog-title"
        onClose={onClose}
      />
    );
  }

  const selectedTrips = selectedRecord.trips.map((trip, index) => ({ trip, index }));
  const yellankaTrips = selectedTrips.filter(({ trip }) => [580, 870].includes(Number(trip.amount)));
  const otherTrips = selectedTrips.filter(({ trip }) => ![580, 870].includes(Number(trip.amount)));

  return (
    <dialog
      ref={dialogRef}
      className="record-dialog"
      aria-labelledby="record-dialog-title"
      onClose={onClose}
    >
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
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
      </div>

      <section className="detail-group">
        <h3>
          Yellanka trips
          <span className="detail-group-count">{yellankaTrips.length} · {inr(selectedRecord.yellankaAmount)}</span>
        </h3>
        {yellankaTrips.length === 0 ? (
          <p className="detail-empty">No Yellanka trips recorded.</p>
        ) : yellankaTrips.map(({ trip, index }) => (
          <div
            className={`detail-line detail-line-yellanka${Number(trip.amount) === 870 ? " detail-line-escort" : ""}`}
            key={`trip-${index}`}
          >
            <div>
              <strong className="detail-trip-title">
                Trip {index + 1}
                {Number(trip.amount) === 870 && <span className="escort-badge">Yellanka · Escort</span>}
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
        <h3 className="detail-group-other">
          Other trips
          <span className="detail-group-count">{otherTrips.length} · {inr(selectedRecord.otherTripsAmount)}</span>
        </h3>
        {otherTrips.length === 0 ? (
          <p className="detail-empty">No other trips recorded.</p>
        ) : otherTrips.map(({ trip, index }) => (
          <div className="detail-line" key={`trip-${index}`}>
            <div>
              <strong className="detail-trip-title">Trip {index + 1}</strong>
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

      {isAdmin && (
        <button type="button" className="save" onClick={() => {
          dialogRef.current?.close();
          onEdit(selectedRecord);
        }}>
          Edit this record
        </button>
      )}
    </dialog>
  );
}
