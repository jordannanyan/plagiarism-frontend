import { api } from "./client";

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "dosen" | "mahasiswa" | string;
  is_active: 0 | 1;
  created_at?: string;
  updated_at?: string;
};

export type Policy = {
  id_policy: number;
  max_file_size: number;
  allowed_mime: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export type Params = {
  id: number; // mapped from id_params
  k: number;
  w: number;
  base: number;
  threshold: number;
  active_from?: string;
  active_to?: string | null;
};

/** GET /api/admin/users -> { ok, total, limit, offset, rows: [...] } */
export async function adminGetUsers(): Promise<AdminUser[]> {
  const { data } = await api.get("/api/admin/users");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map((r: any) => ({
    id: Number(r.id),
    name: String(r.name ?? "-"),
    email: String(r.email ?? "-"),
    role: String(r.role ?? "-"),
    is_active: (r.is_active ?? 0) as 0 | 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

/** GET /api/admin/policy -> { ok, policy: {...} } */
export async function adminGetPolicy(): Promise<Policy | null> {
  const { data } = await api.get("/api/admin/policy");
  return data?.policy ?? null;
}

/** GET /api/admin/params?active=1 -> { ok, rows: [...] } */
export async function adminGetActiveParams(): Promise<Params[]> {
  const { data } = await api.get("/api/admin/params", { params: { active: 1 } });
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map((r: any) => ({
    id: Number(r.id_params), // penting: backend pakai id_params
    k: Number(r.k),
    w: Number(r.w),
    base: Number(r.base),
    threshold: Number(r.threshold),
    active_from: r.active_from,
    active_to: r.active_to,
  }));
}