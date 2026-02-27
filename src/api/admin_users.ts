import { api } from "./client";

export type AdminUserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: 0 | 1;
  created_at?: string;
  updated_at?: string;
  nim?: string | null;
  nidn?: string | null;
  dosen_nama?: string | null;
  dosen_telp?: string | null;
  prodi?: string | null;
  angkatan?: number | null;
};

export type PatchUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  is_active?: 0 | 1;
  dosen?: { nidn?: string; nama?: string; telp?: string };
  mahasiswa?: { nim?: string; prodi?: string; angkatan?: number | null };
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
    dosen_nama: r.dosen_nama ?? null,
    dosen_telp: r.dosen_telp ?? null,
    prodi: r.prodi ?? null,
    angkatan: r.angkatan ?? null,
  }));
}

export async function adminPatchUser(id: number, payload: PatchUserPayload) {
  const { data } = await api.patch(`/api/admin/users/${id}`, payload);
  return data;
}

export async function adminDeleteUser(id: number) {
  const { data } = await api.delete(`/api/admin/users/${id}`);
  return data;
}

export type CreateUserPayload = {
  role: "dosen" | "mahasiswa";
  name: string;
  email: string;
  password: string;
  dosen?: { nidn?: string; nama?: string; telp?: string };
  mahasiswa?: { nim?: string; prodi?: string; angkatan?: number | null };
};

export async function adminCreateUser(payload: CreateUserPayload) {
  const { data } = await api.post("/api/admin/users", payload);
  return data;
}
