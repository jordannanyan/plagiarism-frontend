import { api } from "./client";

export type CheckRow = {
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

export type CheckDetailResponse = {
  ok: true;
  check: {
    id_check: number;
    requested_by: number;
    doc_id: number;
    params_id: number;
    status: string;
    queued_at?: string;
    started_at?: string;
    finished_at?: string;
    doc_title?: string;
    path_text?: string;
  };
  result?: {
    id_result: number;
    similarity: number; // 0..100
    report_path?: string | null;
    summary_json?: string | null; // JSON string
    created_at?: string;
  } | null;
  matches?: Array<{
    id_match: number;
    result_id: number;
    source_type: string; // "corpus"
    source_id: number; // id_corpus
    doc_span_start: number;
    doc_span_end: number;
    src_span_start: number;
    src_span_end: number;
    match_score: number; // 0..1 (di contoh 1)
    snippet_hash: number | string;
    corpus_title?: string;
  }>;
  doc_preview_text?: string;
};

export type SummaryJson = {
  params?: {
    id_params?: number;
    k?: number;
    w?: number;
    threshold?: number;
  };
  candidates?: Array<{
    id_corpus: number;
    title?: string;
    approx?: number; // 0..1
  }>;
  best_similarity?: number; // 0..1
};

export async function createCheck(doc_id: number, max_candidates: number) {
  const { data } = await api.post("/api/checks", { doc_id, max_candidates });
  return data;
}

export async function getChecksList(): Promise<CheckRow[]> {
  const { data } = await api.get("/api/checks");
  return Array.isArray(data?.rows) ? data.rows : [];
}

// Detail: GET /api/checks/:id_check
export async function getCheckDetail(id_check: number): Promise<CheckDetailResponse> {
  const { data } = await api.get(`/api/checks/${id_check}`);
  return data as CheckDetailResponse;
}

export function parseSummaryJson(summary_json?: string | null): SummaryJson | null {
  if (!summary_json) return null;
  try {
    return JSON.parse(summary_json) as SummaryJson;
  } catch {
    return null;
  }
}