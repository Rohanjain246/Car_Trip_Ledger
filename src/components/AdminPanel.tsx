import { useEffect, useState } from "react";
import { request } from "../utils/api";
import type { User } from "../types";

export default function AdminPanel() {
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
