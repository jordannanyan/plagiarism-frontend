import { api } from "./client";

export type Policy = {
  id_policy: number;
  max_file_size: number;
  allowed_mime: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

export async function getAdminPolicy(): Promise<Policy | null> {
  const { data } = await api.get("/api/admin/policy");
  return data?.policy ?? null;
}

// default: PUT, kalau backend kamu pakai PATCH tinggal ganti api.put -> api.patch
export async function updateAdminPolicy(payload: Partial<Pick<Policy, "max_file_size" | "allowed_mime" | "notes">>) {
  const { data } = await api.put("/api/admin/policy", payload);
  return data;
}