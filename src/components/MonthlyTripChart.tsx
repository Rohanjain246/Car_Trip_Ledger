import { useEffect, useState } from "react";
import DonutSummary from "./DonutSummary";
import {
  currentMonthKey,
  getCachedMonthlyTripData,
  getMonthlyTripData,
  type MonthlyTripData,
} from "../utils/monthlyTrips";

const monthLabel = new Date(`${currentMonthKey}-01T00:00:00`).toLocaleDateString(undefined, {
  month: "long",
  year: "numeric",
});

export default function MonthlyTripChart() {
  const [data, setData] = useState<MonthlyTripData | null>(() => getCachedMonthlyTripData(currentMonthKey));
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    getCachedMonthlyTripData(currentMonthKey) ? "ready" : "loading",
  );
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMonthlyTripData(currentMonthKey)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setStatus("ready");
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load trip totals.");
          setStatus("error");
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function refreshChart() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const result = await getMonthlyTripData(currentMonthKey, true);
      setData(result);
      setStatus("ready");
      setError("");
    } catch (cause) {
      setRefreshError(cause instanceof Error ? cause.message : "Could not refresh trip totals.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="portal-card monthly-chart-card" aria-labelledby="trip-chart-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">MONTHLY SNAPSHOT</p>
          <h2 id="trip-chart-title">Yellanka trip breakdown</h2>
        </div>
        <div className="chart-header-actions">
          <span className="chart-period">{monthLabel}</span>
          <button className="chart-refresh" type="button" onClick={refreshChart} disabled={refreshing}
            aria-label="Refresh monthly trip chart">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {status === "loading" ? <p className="chart-message">Loading this month’s trip details…</p>
        : status === "error" && !data ? <p className="form-error" role="alert">{error}</p>
          : (
            <div className="single-chart-breakdown">
              {refreshError && <p className="form-error chart-refresh-error" role="alert">{refreshError}</p>}
              {error && <p className="form-error chart-refresh-error" role="alert">{error}</p>}
              {(data?.invalidAmountCount ?? 0) > 0 && (
                <p className="chart-data-warning" role="status">
                  {data?.invalidAmountCount} trip {data?.invalidAmountCount === 1 ? "amount was" : "amounts were"} invalid and excluded from the chart.
                </p>
              )}
              <DonutSummary
                title="Escort, non-escort & other trips"
                categories={[
                  { label: "Escort · ₹870", count: data?.escort ?? 0, color: "escort" },
                  { label: "Non-escort · ₹580", count: data?.nonEscort ?? 0, color: "non-escort" },
                  { label: "Other · non-Yellanka", count: data?.other ?? 0, color: "other" },
                ]}
              />
            </div>
          )}
    </section>
  );
}
