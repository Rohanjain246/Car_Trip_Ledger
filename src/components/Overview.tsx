import MonthlyTripChart from "./MonthlyTripChart";
import MonthlyAmountsChart from "./MonthlyAmountsChart";
import type { User } from "../types";

export default function Overview({
  user,
  onOpenTracker,
}: {
  user: User;
  onOpenTracker: () => void;
}) {
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
      <MonthlyAmountsChart />
      <div className="security-note">
        <span className="security-icon" aria-hidden="true">✓</span>
        <div><strong>Your account is protected</strong><p>Your session uses a secure, HTTP-only authentication cookie.</p></div>
        <span className="security-status">ACTIVE</span>
      </div>
    </div>
  );
}
