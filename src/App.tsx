import { useEffect, useState } from "react";
// @ts-expect-error CarTracking is a JavaScript component without a declaration file.
import CarTracker from "./components/CarTracking";
import AdminPanel from "./components/AdminPanel";
import AuthForm from "./components/AuthForm";
import Overview from "./components/Overview";
import { request } from "./utils/api";
import type { Palette, Theme, User } from "./types";
import "./App.css";

type Page = "overview" | "tracker" | "admin";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("car-tracker-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [palette, setPalette] = useState<Palette>(() => {
    const savedPalette = localStorage.getItem("car-tracker-palette");
    return savedPalette === "classic" ? "classic" : "maroon";
  });

  useEffect(() => {
    localStorage.setItem("car-tracker-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("car-tracker-palette", palette);
  }, [palette]);

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
    <div className="portal-shell" data-theme={theme} data-palette={palette}>
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
        <header className="topbar">
          <span className="topbar-page-title">Workspace <span aria-hidden="true">/</span> {page === "admin" ? "People & access" : page === "tracker" ? "Car tracker" : "Overview"}</span>
          <div className="appearance-controls">
            <div className="appearance-palette" role="group" aria-label="Choose color palette">
              <button
                type="button"
                className="appearance-choice classic-choice"
                aria-label="Classic color palette"
                aria-pressed={palette === "classic"}
                onClick={() => setPalette("classic")}
              >
                <span aria-hidden="true" /> <span>Classic</span>
              </button>
              <button
                type="button"
                className="appearance-choice maroon-choice"
                aria-label="Maroon color palette"
                aria-pressed={palette === "maroon"}
                onClick={() => setPalette("maroon")}
              >
                <span aria-hidden="true" /> <span>Maroon</span>
              </button>
            </div>
            <button
              type="button"
              className="appearance-mode"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀" : "☾"}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
          <span className="topbar-status"><i /> SECURE SESSION</span>
        </header>
        <nav className="mobile-primary-nav" aria-label="Main navigation">
          <button
            type="button"
            aria-current={page === "overview" ? "page" : undefined}
            onClick={() => setPage("overview")}
          >
            <span aria-hidden="true">⌂</span> Overview
          </button>
          <button
            type="button"
            aria-current={page === "tracker" ? "page" : undefined}
            onClick={() => setPage("tracker")}
          >
            <span aria-hidden="true">◷</span> Tracker
          </button>
          {user.role === "admin" && (
            <button
              type="button"
              aria-current={page === "admin" ? "page" : undefined}
              onClick={() => setPage("admin")}
            >
              <span aria-hidden="true">♙</span> Admin
            </button>
          )}
        </nav>
        {page === "overview" && <Overview user={user} onOpenTracker={() => setPage("tracker")} />}
        {page === "tracker" && <div className="tracker-wrap"><CarTracker isAdmin={user.role === "admin"} theme={theme} palette={palette} /></div>}
        {page === "admin" && user.role === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}
