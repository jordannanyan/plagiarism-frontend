import { api } from "./client";

export type SysParams = {
  id: number; // mapped from id_params
  k: number;
  w: number;
  base: number;
  threshold: number;
  active_from?: string;
  active_to?: string | null;
};

function mapRow(r: any): SysParams {
  return {
    id: Number(r.id_params),
    k: Number(r.k),
    w: Number(r.w),
    base: Number(r.base),
    threshold: Number(r.threshold),
    active_from: r.active_from,
    active_to: r.active_to,
  };
}

export async function getActiveParams(): Promise<SysParams[]> {
  const { data } = await api.get("/api/admin/params", { params: { active: 1 } });
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map(mapRow);
}

export async function getAllParams(): Promise<SysParams[]> {
  // kalau backend kamu support list semua tanpa filter
  const { data } = await api.get("/api/admin/params");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows.map(mapRow);
}

export async function createParams(payload: {
  k: number;
  w: number;
  base: number;
  threshold: number;
  // beberapa backend butuh flag ini untuk langsung aktif
  activate?: boolean;
}) {
  // default: POST /api/admin/params
  const { data } = await api.post("/api/admin/params", payload);
  return data;
}

export async function activateParams(id: number) {
  // default: PATCH /api/admin/params/:id/activate
  // kalau backend kamu tidak punya endpoint ini, gampang diganti
  const { data } = await api.patch(`/api/admin/params/${id}/activate`);
  return data;
}