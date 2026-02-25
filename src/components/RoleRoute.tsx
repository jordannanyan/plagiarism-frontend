import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { RoleName } from "../types/auth";

export default function RoleRoute({
  allow,
  children,
}: {
  allow: RoleName[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/forbidden" replace />;

  return <>{children}</>;
}