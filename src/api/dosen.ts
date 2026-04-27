import { api } from "./client";

export type DosenDocRow = {
  id_doc: number;
  owner_user_id: number;
  title: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type DosenCheckRow = {
  id_check: number;
  status: string;
  queued_at?: string;
  started_at?: string;
  finished_at?: string;
  id_doc: number;
  doc_title?: string;
  id_result?: number;
  similarity?: number; // 0..100
};

export type DosenListRow = {
  id_dosen: number;
  nama: string;
  nidn: string | null;
  email: string;
};

export type DosenPendingDocRow = {
  id_result: number;
  similarity: number;
  result_created_at: string;
  id_check: number;
  doc_id: number;
  requested_by: number;
  requester_name: string;
  requester_email: string;
  requester_nim: string | null;
  requester_prodi: string | null;
  doc_title: string;
  finished_at: string | null;
};

export type DosenCheckedDocRow = DosenPendingDocRow & {
  id_note: number;
  verification_status: "wajar" | "perlu_revisi" | "plagiarisme";
  note_text: string | null;
  note_created_at: string | null;
};

export async function dosenGetDocuments(): Promise<DosenDocRow[]> {
  const { data } = await api.get("/api/documents");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows;
}

export async function dosenGetChecks(): Promise<DosenCheckRow[]> {
  const { data } = await api.get("/api/checks");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows;
}

export async function getDosenList(): Promise<DosenListRow[]> {
  const { data } = await api.get("/api/dosen/list");
  return Array.isArray(data?.rows) ? data.rows : [];
}

export async function getDosenPendingDocs(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: DosenPendingDocRow[]; total: number }> {
  const { data } = await api.get("/api/dosen/docs/pending", { params });
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: Number(data?.total ?? 0),
  };
}

export async function getDosenCheckedDocs(params?: {
  q?: string;
  status?: "wajar" | "perlu_revisi" | "plagiarisme";
  limit?: number;
  offset?: number;
}): Promise<{ rows: DosenCheckedDocRow[]; total: number }> {
  const { data } = await api.get("/api/dosen/docs/checked", { params });
  return {
    rows: Array.isArray(data?.rows) ? data.rows : [],
    total: Number(data?.total ?? 0),
  };
}
