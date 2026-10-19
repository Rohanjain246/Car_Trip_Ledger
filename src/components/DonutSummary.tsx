type TripCategory = { label: string; count: number; color: "escort" | "non-escort" | "other" };

type DonutSummaryProps = {
  title: string;
  categories: TripCategory[];
};

export default function DonutSummary({ title, categories }: DonutSummaryProps) {
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  const circumference = 2 * Math.PI * 44;
  let traversedLength = 0;
  const segments = categories.map((category) => {
    const length = total ? (category.count / total) * circumference : 0;
    const segment = { ...category, length, offset: -traversedLength };
    traversedLength += length;
    return segment;
  });
  const breakdownLabel = categories.map(({ count, label }) => `${count} ${label.toLowerCase()}`).join(", ");

  return (
    <div className="chart-panel">
      <h3>{title}</h3>
      <div className="chart-content">
        <div className="donut-wrap">
          <svg className="trip-donut" viewBox="0 0 120 120" role="img"
            aria-label={`${total} trips: ${breakdownLabel}`}>
            <circle className="donut-track" cx="60" cy="60" r="44" />
            {total > 0 && segments.map((segment) => (
              <circle className={`donut-segment donut-${segment.color}`} cx="60" cy="60" r="44"
                key={segment.color}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={segment.offset}
                transform="rotate(-90 60 60)" />
            ))}
          </svg>
          <div className="donut-center">
            <strong>{total}</strong>
            <span>{total === 1 ? "trip" : "trips"}</span>
          </div>
        </div>
        <div className="chart-legend" aria-label={`${title} details`}>
          {categories.map((item) => (
            <div key={item.label}>
              <span className={`legend-dot ${item.color}-dot`} />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
              <small>{total ? ((item.count / total) * 100).toFixed(1) : "0.0"}%</small>
            </div>
          ))}
          {total === 0 && <p className="chart-empty">No trips logged this month yet.</p>}
        </div>
      </div>
    </div>
  );
}
