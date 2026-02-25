import { api } from "./client";

export type DocRow = {
  id_doc: number;
  owner_user_id: number;
  title: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  path_raw?: string | null;
  path_text?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getDocuments(): Promise<DocRow[]> {
  const { data } = await api.get("/api/documents");
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  return rows;
}

export async function getDocumentDetail(id: number): Promise<DocRow | null> {
  const { data } = await api.get(`/api/documents/${id}`);
  // beberapa backend balikin { ok:true, row:{...} } atau langsung row
  if (data?.row) return data.row as DocRow;
  if (data?.doc) return data.doc as DocRow;
  if (data?.id_doc) return data as DocRow;
  return null;
}

export async function uploadDocument(file: File, title: string) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("title", title);

  const { data } = await api.post("/api/documents/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function submitDocumentText(title: string, text: string) {
  const { data } = await api.post("/api/documents/text", { title, text });
  return data;
}

export async function deleteDocument(id: number) {
  const { data } = await api.delete(`/api/documents/${id}`);
  return data;
}