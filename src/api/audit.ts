import { api } from "./client";

export type AuditRow = {
  id_log: number;
  user_id: number | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  ip_addr: string | null;
  timestamp: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
};

export type AuditListParams = {
  q?: string;
  user_id?: number;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export async function getAuditLog(params?: AuditListParams) {
  const { data } = await api.get("/api/admin/audit", { params });
  return {
    ok: Boolean(data?.ok),
    total: Number(data?.total ?? 0),
    limit: Number(data?.limit ?? params?.limit ?? 50),
    offset: Number(data?.offset ?? params?.offset ?? 0),
    rows: (Array.isArray(data?.rows) ? data.rows : []) as AuditRow[],
    actions: (Array.isArray(data?.actions) ? data.actions : []) as string[],
  };
}
