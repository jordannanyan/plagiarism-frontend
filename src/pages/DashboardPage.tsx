import { useNavigate } from "react-router-dom";
import { logout } from "../api/auth";

export default function DashboardPage() {
  const nav = useNavigate();
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  async function onLogout() {
    try {
      await logout();
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    nav("/login");
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>Dashboard</h1>
      <p>Welcome: <b>{user?.name ?? "-"}</b></p>
      <p>Role: <b>{user?.role ?? "-"}</b></p>

      <button onClick={onLogout} style={{ padding: 10 }}>
        Logout
      </button>
    </div>
  );
}