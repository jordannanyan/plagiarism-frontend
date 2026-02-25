import { api } from "./client";

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: 0 | 1;
  created_at?: string;
  updated_at?: string;
  // optional extra fields dari backend kamu, aman kalau ada
  nim?: string | null;
  nidn?: string | null;
  prodi?: string | null;
  angkatan?: number | null;
};

export async function adminListUsers(): Promise<AdminUserRow[]> {
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
    nim: r.nim ?? null,
    nidn: r.nidn ?? null,
    prodi: r.prodi ?? null,
    angkatan: r.angkatan ?? null,
  }));
}

export async function adminPatchUser(
  id: number,
  payload: Partial<Pick<AdminUserRow, "name" | "email" | "role" | "is_active">>
) {
  const { data } = await api.patch(`/api/admin/users/${id}`, payload);
  return data;
}