import { api } from "./client";

export type PatchProfilePayload = {
  name?: string;
  email?: string;
  password?: string;
  dosen?: { nidn?: string; nama?: string; telp?: string };
  mahasiswa?: { nim?: string; prodi?: string; angkatan?: number | null };
};

export async function patchProfile(userId: number, payload: PatchProfilePayload) {
  const { data } = await api.patch(`/api/admin/users/${userId}`, payload);
  return data;
}
