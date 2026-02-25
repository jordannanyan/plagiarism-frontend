import { api } from "./client";
import type { CorpusItem } from "../types/corpus";

type CorpusListResponse = {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  rows: any[];
};

function mapCorpusRow(r: any): CorpusItem {
  return {
    id: Number(r.id_corpus),          // penting: backend pakai id_corpus
    title: String(r.title ?? ""),
    filename: r.source_ref ? String(r.source_ref) : undefined,
    is_active: (r.is_active ?? 0) as 0 | 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function getCorpus() {
  // asumsi endpoint kamu: GET /api/corpus
  const { data } = await api.get<CorpusListResponse>("/api/corpus");
  const rows = Array.isArray((data as any)?.rows) ? (data as any).rows : [];
  return rows.map(mapCorpusRow);
}

export async function uploadCorpus(file: File, title: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);

  const { data } = await api.post("/api/corpus/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data;
}

export async function patchCorpus(id: number, payload: { title?: string; is_active?: 0 | 1 }) {
  const { data } = await api.patch(`/api/corpus/${id}`, payload);
  return data;
}

export async function deleteCorpus(id: number) {
  const { data } = await api.delete(`/api/corpus/${id}`);
  return data;
}