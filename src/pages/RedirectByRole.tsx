import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RedirectByRole() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "dosen") return <Navigate to="/dosen" replace />;
  return <Navigate to="/mahasiswa" replace />;
}