import { useEffect, useState, type FormEvent } from "react";
// @ts-expect-error CarTracking is a JavaScript component without a declaration file.
import CarTracker from "./components/CarTracking";
// @ts-expect-error api.js is a JavaScript module without a declaration file.
import { loadSheet } from "./components/api.js";
import "./App.css";

type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

type Page = "overview" | "tracker" | "admin";
type TripCounts = { escort: number; nonEscort: number; other: number };
type MonthlyTripData = TripCounts & { invalidAmountCount: number };
type TripCategory = { label: string; count: number; color: "escort" | "non-escort" | "other" };
type DonutSummaryProps = {
  title: string;
  categories: TripCategory[];
};

const today = new Date();
const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const monthlyTripCache = new Map<string, MonthlyTripData>();
const monthlyTripRequests = new Map<string, Promise<MonthlyTripData>>();

function getMonthlyTripData(monthKey: string, forceRefresh = false): Promise<MonthlyTripData> {
  const cached = monthlyTripCache.get(monthKey);
  if (!forceRefresh && cached) return Promise.resolve(cached);
  const pending = monthlyTripRequests.get(monthKey);
  if (!forceRefresh && pending) return pending;

  const request = loadSheet()
    .then((sheet: { entries: { date: string; trips: { amount: number }[] }[] }) => {
      if (!Array.isArray(sheet.entries)) {
        throw new Error("Tracker response did not contain a valid entries list.");
      }

      const currentEntries = sheet.entries.filter((entry) => entry.date.startsWith(monthKey));
      const data: MonthlyTripData = { escort: 0, nonEscort: 0, other: 0, invalidAmountCount: 0 };
      for (const entry of currentEntries) {
        if (!Array.isArray(entry.trips)) {
          throw new Error(`Tracker response contains invalid trips for ${entry.date}.`);
        }
        for (const trip of entry.trips) {
          const amount = trip.amount;
          if (amount == null || String(amount).trim() === "" || !Number.isFinite(Number(amount))) {
            data.invalidAmountCount += 1;
          } else if (Number(amount) === 870) {
            data.escort += 1;
          } else if (Number(amount) === 580) {
            data.nonEscort += 1;
          } else {
            data.other += 1;
          }
        }
      }
      monthlyTripCache.set(monthKey, data);
      return data;
    })
    .finally(() => {
      if (monthlyTripRequests.get(monthKey) === request) {
        monthlyTripRequests.delete(monthKey);
      }
    });
  monthlyTripRequests.set(monthKey, request);
  return request;
}

function DonutSummary({ title, categories }: DonutSummaryProps) {
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
            {total > 0 && (
              segments.map((segment) => (
                <circle className={`donut-segment donut-${segment.color}`} cx="60" cy="60" r="44"
                  key={segment.color}
                  strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                  strokeDashoffset={segment.offset}
                  transform="rotate(-90 60 60)" />
              ))
            )}
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

function MonthlyTripChart() {
  const [data, setData] = useState<MonthlyTripData | null>(() => monthlyTripCache.get(currentMonthKey) ?? null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    monthlyTripCache.has(currentMonthKey) ? "ready" : "loading",
  );
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const monthKey = currentMonthKey.slice(0, 7);
  const monthLabel = new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  useEffect(() => {
    let cancelled = false;
    getMonthlyTripData(monthKey)
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
  }, [monthKey]);

  async function refreshChart() {
    setRefreshing(true);
    setRefreshError("");
    try {
      const result = await getMonthlyTripData(monthKey, true);
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "The request could not be completed.");
  }
  return payload as T;
}

function AuthForm({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await request<{ user: User }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      onAuthenticated(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <img className="brand-mark" src="/favicon.svg" alt="" />
        <p className="eyebrow">DRIVELOG · CAR TRACKER</p>
        <h1>Every trip, fuel stop, and daily total in one place.</h1>
        <p className="intro-copy">A clear, secure workspace for keeping your driving records up to date.</p>
        <div className="intro-points">
          <span><i aria-hidden="true">01</i> Log daily trips and payments</span>
          <span><i aria-hidden="true">02</i> Review fuel and trip totals</span>
          <span><i aria-hidden="true">03</i> Manage team access as an admin</span>
        </div>
        <img className="auth-illustration" src="/drive-tracker-illustration.svg" alt="" />
        <span className="intro-orbit orbit-one" />
        <span className="intro-orbit orbit-two" />
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</p>
          <h2>{mode === "login" ? "Sign in to your account" : "Create your account"}</h2>
          <p className="form-subtitle">
            {mode === "login" ? "Enter your details to continue." : "Your account will start with user access."}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Full name
                <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)}
                  placeholder="Your name" required maxLength={100} />
              </label>
            )}
            <label>
              Email address
              <input type="email" autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password} onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "login" ? "Enter your password" : "At least 12 characters"}
                minLength={mode === "register" ? 12 : undefined} maxLength={72} required />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button full-button" type="submit" disabled={busy}>
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </form>
          <p className="switch-mode">
            {mode === "login" ? "New to DriveLog?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="auth-note">Your password is protected with a one-way hash and is never stored in readable form.</p>
        </div>
        <span className="auth-footer">© {new Date().getFullYear()} DriveLog · Secure access</span>
      </section>
    </main>
  );
}

function Overview({ user, onOpenTracker }: { user: User; onOpenTracker: () => void }) {
  const joined = new Date(user.createdAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="page-content">
      <div className="welcome-banner">
        <div>
          <p className="eyebrow">YOUR DRIVE</p>
          <h1>Good to have you here, {user.name.split(" ")[0]}.</h1>
          <p>Your driving log is ready. Pick up where you left off.</p>
        </div>
        <img className="welcome-art" src="/drive-tracker-illustration.svg" alt="" />
      </div>
      <div className="overview-grid">
        <section className="portal-card profile-card">
          <div className="card-heading">
            <div><p className="eyebrow">ACCOUNT</p><h2>Your profile</h2></div>
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          </div>
          <dl className="profile-list">
            <div><dt>Full name</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Access level</dt><dd><span className="role-pill">{user.role}</span></dd></div>
            <div><dt>Member since</dt><dd>{joined}</dd></div>
          </dl>
        </section>
        <section className="portal-card action-card">
          <div className="card-icon" aria-hidden="true">↗</div>
          <p className="eyebrow">YOUR DAILY DRIVE</p>
          <h2>Trip &amp; fuel log</h2>
          <p>Record trips and fill-ups, review daily totals, and find previous entries.</p>
          <button className="text-button" type="button" onClick={onOpenTracker}>
            Open tracker <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
      <MonthlyTripChart />
      <div className="security-note">
        <span className="security-icon" aria-hidden="true">✓</span>
        <div><strong>Your account is protected</strong><p>Your session uses a secure, HTTP-only authentication cookie.</p></div>
        <span className="security-status">ACTIVE</span>
      </div>
    </div>
  );
}

function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request<{ users: User[]; total: number }>("/api/admin/users")
      .then((result) => {
        setUsers(result.users);
        setTotal(result.total);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="page-title">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>People & access</h1></div>
        <span className="count-pill">{total} {total === 1 ? "member" : "members"}</span>
      </div>
      <section className="portal-card users-card">
        <div className="card-heading">
          <div><h2>Registered users</h2><p>Account details and assigned access levels.</p></div>
          <span className="table-label">DIRECTORY</span>
        </div>
        {loading ? <p className="table-message">Loading user directory…</p>
          : error ? <p className="form-error" role="alert">{error}</p>
            : users.length === 0 ? <p className="table-message">No accounts have registered yet.</p>
              : (
                <div className="table-scroll">
                  <table className="users-table">
                    <thead><tr><th>NAME</th><th>EMAIL</th><th>ACCESS</th><th>JOINED</th></tr></thead>
                    <tbody>{users.map((member) => (
                      <tr key={member.id}>
                        <td><span className="member-name"><span className="avatar small-avatar">{member.name.slice(0, 1).toUpperCase()}</span>{member.name}</span></td>
                        <td>{member.email}</td>
                        <td><span className={`role-pill ${member.role === "admin" ? "admin-role" : ""}`}>{member.role}</span></td>
                        <td>{new Date(member.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
      </section>
      <p className="admin-hint">Admin access is provisioned by the server operator. User registration cannot grant admin privileges.</p>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    request<{ user: User }>("/api/auth/me")
      .then((result) => setUser(result.user))
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.message !== "Authentication required.") {
          setError(cause.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    try {
      await request("/api/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setPage("overview");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
    }
  }

  if (loading) {
    return <main className="app-loading"><img className="loading-mark" src="/favicon.svg" alt="" /><p>Connecting to your driving log…</p></main>;
  }
  if (!user) {
    return <>{error && <p className="connection-error" role="alert">{error}</p>}
      <AuthForm onAuthenticated={(authenticatedUser) => {
        setUser(authenticatedUser);
        setError("");
      }} />
    </>;
  }

  return (
    <div className="portal-shell">
      <aside className="sidebar">
        <a className="portal-brand" href="#" onClick={(event) => {
          event.preventDefault();
          setPage("overview");
        }}><img className="brand-mark" src="/favicon.svg" alt="" /><span>DriveLog <small>CAR TRACKER</small></span></a>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <button className={`nav-item ${page === "overview" ? "selected" : ""}`} onClick={() => setPage("overview")}>
            <span aria-hidden="true">⌂</span> Overview
          </button>
          <button className={`nav-item ${page === "tracker" ? "selected" : ""}`} onClick={() => setPage("tracker")}>
            <span aria-hidden="true">◷</span> Car tracker
          </button>
          {user.role === "admin" && (
            <>
              <p className="nav-label admin-nav-label">MANAGE</p>
              <button className={`nav-item ${page === "admin" ? "selected" : ""}`} onClick={() => setPage("admin")}>
                <span aria-hidden="true">♙</span> People & access
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user"><span className="avatar small-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.name}</strong><small>{user.role}</small></span>
          </div>
          <button className="signout-button" type="button" onClick={signOut}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <main className="portal-main">
        <header className="topbar"><span>Workspace <span aria-hidden="true">/</span> {page === "admin" ? "People & access" : page === "tracker" ? "Car tracker" : "Overview"}</span>
          <span className="topbar-status"><i /> SECURE SESSION</span>
        </header>
        {page === "overview" && <Overview user={user} onOpenTracker={() => setPage("tracker")} />}
        {page === "tracker" && <div className="tracker-wrap"><CarTracker isAdmin={user.role === "admin"} /></div>}
        {page === "admin" && user.role === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}
