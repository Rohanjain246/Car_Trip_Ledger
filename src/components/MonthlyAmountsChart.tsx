import { useEffect, useState } from "react";
import {
  getMonthlyAmountData,
  type MonthlyAmountData,
} from "../utils/monthlyTrips";

const chartHeight = 280;
const chartTop = 36;
const chartBottom = 224;
const chartLeft = 68;
const chartRight = 20;
type AmountMetric = "trip" | "cng";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatBarAmount(amount: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount)}`;
}

function formatAxis(amount: number) {
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `₹${thousands.toLocaleString("en-IN", { maximumFractionDigits: 1 })}k`;
  }
  return formatCurrency(amount);
}

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function getAxisStep(maxAmount: number) {
  const rawStep = Math.max(maxAmount / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceStep * magnitude;
}

export default function MonthlyAmountsChart() {
  const [data, setData] = useState<MonthlyAmountData[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<AmountMetric>("trip");

  useEffect(() => {
    let cancelled = false;
    getMonthlyAmountData()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load monthly amounts.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      setData(await getMonthlyAmountData(true));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh monthly amounts.");
    } finally {
      setRefreshing(false);
    }
  }

  const metricLabel = metric === "trip" ? "Trip amount" : "CNG amount";
  const amounts = data?.map((item) => metric === "trip" ? item.tripAmount : item.cngAmount) ?? [];
  const maxAmount = Math.max(0, ...amounts);
  const step = getAxisStep(maxAmount);
  const axisMaximum = step * 4;
  const slotWidth = data?.length ? Math.max(62, 712 / data.length) : 712;
  const chartWidth = chartLeft + chartRight + slotWidth * (data?.length || 1);
  const plotHeight = chartBottom - chartTop;
  const barWidth = Math.min(22, slotWidth * 0.28);

  return (
    <section className="portal-card monthly-chart-card monthly-amounts-card" aria-labelledby="monthly-amounts-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">RECORD HISTORY</p>
          <h2 id="monthly-amounts-title">Monthly trip &amp; CNG amounts</h2>
        </div>
        <button
          className="chart-refresh"
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Refresh monthly trip and CNG amounts"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {data === null && !error && <p className="chart-message">Loading monthly amounts…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {data && !error && data.length === 0 && (
        <p className="chart-message">No monthly trip or CNG records are available yet.</p>
      )}
      {data && data.length > 0 && (
        <>
          <div className="monthly-amounts-tabs" role="group" aria-label="Choose monthly amount">
            <button
              type="button"
              className={metric === "trip" ? "selected" : ""}
              aria-pressed={metric === "trip"}
              onClick={() => setMetric("trip")}
            >
              <i className="trip-amount-key" /> Trip amount
            </button>
            <button
              type="button"
              className={metric === "cng" ? "selected" : ""}
              aria-pressed={metric === "cng"}
              onClick={() => setMetric("cng")}
            >
              <i className="cng-amount-key" /> CNG amount
            </button>
          </div>
          <div className="monthly-amounts-scroll">
            <svg
              className="monthly-amounts-graph"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: `${chartWidth}px` }}
              role="group"
              aria-label={`Monthly ${metricLabel.toLowerCase()} for ${data.length} months`}
            >
              {[0, 1, 2, 3, 4].map((tick) => {
                const value = step * tick;
                const y = chartBottom - (value / axisMaximum) * plotHeight;
                return (
                  <g key={`tick-${tick}`}>
                    <line className="amount-gridline" x1={chartLeft} x2={chartWidth - chartRight} y1={y} y2={y} />
                    <text className="amount-axis-label" x={chartLeft - 9} y={y + 4} textAnchor="end">
                      {formatAxis(value)}
                    </text>
                  </g>
                );
              })}
              {data.map((item, index) => {
                const centerX = chartLeft + slotWidth * (index + 0.5);
                const amount = metric === "trip" ? item.tripAmount : item.cngAmount;
                const barHeight = (amount / axisMaximum) * plotHeight;
                const barX = centerX - barWidth / 2;
                const hitHeight = Math.max(barHeight, 14);
                return (
                  <g key={item.month}>
                    <rect
                      className={`${metric}-amount-bar`}
                      x={barX}
                      y={chartBottom - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                    />
                    <rect
                      className="amount-bar-hit-area"
                      x={barX}
                      y={chartBottom - hitHeight}
                      width={barWidth}
                      height={hitHeight}
                      rx="3"
                      role="img"
                      tabIndex={0}
                      aria-label={`${formatMonth(item.month)} ${metricLabel.toLowerCase()}: ${formatCurrency(amount)}`}
                    >
                      <title>{`${formatMonth(item.month)} ${metricLabel.toLowerCase()}: ${formatCurrency(amount)}`}</title>
                    </rect>
                    <text
                      className="amount-value-label"
                      x={centerX}
                      y={Math.max(chartBottom - barHeight - 7, chartTop - 8)}
                      textAnchor="middle"
                    >
                      {formatBarAmount(amount)}
                    </text>
                    <text className="amount-month-label" x={centerX} y={chartBottom + 25} textAnchor="middle">
                      {formatMonth(item.month)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </section>
  );
}
