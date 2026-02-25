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