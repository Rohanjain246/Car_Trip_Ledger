import { useState, type FormEvent } from "react";
import { request } from "../utils/api";
import type { User } from "../types";

export default function AuthForm({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
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
