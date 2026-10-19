import { inr } from "../utils/tracking.js";

export default function RecordTable({
  isAdmin,
  hasAdminRecordSelection,
  hasPartialRecordRange,
  hasRecordRange,
  validRecordRange,
  visibleRows,
  entriesCount,
  onSelectRecord,
  onEditRecord,
}) {
  const handleKeyDown = (event, entry) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectRecord(entry);
    }
  };

  return (
    <section className="card wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Day</th><th>Trips</th><th>Trip amt</th><th>CNG</th><th>Profit</th><th>Yellanka (escort)</th>
            {isAdmin && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {isAdmin && !hasAdminRecordSelection && !hasPartialRecordRange && (
            <tr><td colSpan="8">Choose a month or complete date range to load records.</td></tr>
          )}
          {!isAdmin && !hasRecordRange && visibleRows.length === 0 && (
            <tr><td colSpan="7">No saved records for this month.</td></tr>
          )}
          {hasPartialRecordRange && (
            <tr><td colSpan="8">Choose both a From and To date to view records.</td></tr>
          )}
          {hasRecordRange && !validRecordRange && (
            <tr><td colSpan="8">The From date must be on or before the To date.</td></tr>
          )}
          {validRecordRange && visibleRows.length === 0 && (
            <tr><td colSpan="8">{entriesCount ? "No records in this date range." : "No saved records yet."}</td></tr>
          )}
          {visibleRows.map((entry) => (
            <tr
              key={`${entry.sheet}-${entry.date}`}
              className="record-row"
              tabIndex={0}
              role="button"
              aria-label={`View details for ${entry.date}`}
              onClick={() => onSelectRecord(entry)}
              onKeyDown={(event) => handleKeyDown(event, entry)}
            >
              <td>{entry.date.slice(8)}/{entry.date.slice(5, 7)}/{entry.date.slice(0, 4)}</td>
              <td>{entry.day}</td><td>{entry.totalTrips}</td>
              <td>{inr(entry.tripAmount)}</td><td>{inr(entry.cngAmount)}</td><td>{inr(entry.profit)}</td>
              <td>{entry.yellankaCount} ({entry.escortCount})</td>
              {isAdmin && <td><button type="button" className="link" onClick={(event) => {
                event.stopPropagation();
                onEditRecord(entry);
              }}>Edit</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
