import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User, RoleName } from "../types/auth";
import { login as loginApi, logout as logoutApi } from "../api/auth";

type AuthState = {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function normalizeRole(role: any): RoleName {
  const r = String(role ?? "").trim().toLowerCase();

  // variasi string umum
  if (r === "admin" || r.includes("admin")) return "admin";
  if (r === "dosen" || r.includes("dosen") || r.includes("lecturer")) return "dosen";
  if (r === "mahasiswa" || r.includes("mahasiswa") || r.includes("student")) return "mahasiswa";

  // variasi angka umum
  if (r === "1") return "admin";
  if (r === "2") return "dosen";
  if (r === "3") return "mahasiswa";

  // fallback aman
  return "mahasiswa";
}

function normalizeUser(u: any): User | null {
  if (!u) return null;

  // beberapa backend pakai name/username/fullname, kita coba selamatkan
  const name = u.name ?? u.username ?? u.fullname ?? u.nama ?? "-";
  const email = u.email ?? u.mail ?? "-";
  const id = Number(u.id ?? u.user_id ?? u.userId ?? 0);

  return {
    id,
    name: String(name),
    email: String(email),
    role: normalizeRole(u.role ?? u.role_name ?? u.roleName ?? u.level ?? u.type),
  };
}

function readUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(readUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // sinkron awal + normalize localStorage (biar tidak nyangkut role jelek)
    const t = localStorage.getItem("token");
    const u = readUser();

    setToken(t);
    setUser(u);

    // rewrite user ke bentuk yang sudah normalize
    if (u) localStorage.setItem("user", JSON.stringify(u));

    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await loginApi(email, password);

    const fixedUser = normalizeUser((res as any).user) ?? null;

    localStorage.setItem("token", (res as any).token);
    localStorage.setItem("user", JSON.stringify(fixedUser));

    setToken((res as any).token);
    setUser(fixedUser);
  }

  async function logout() {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}