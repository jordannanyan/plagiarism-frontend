import { fetchJson } from "./http";

export type UserDocumentRow = {
  id_doc: number;
  owner_user_id: number;
  title: string;
  mime_type: string;
  size_bytes: number;
  status: "done" | "processing" | "failed" | string;
  path_raw: string | null;
  path_text: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentsListResponse = {
  ok: true;
  total: number;
  limit: number;
  offset: number;
  rows: UserDocumentRow[];
};

export type DocumentDetailResponse = {
  ok: true;
  document: UserDocumentRow;
  preview_text: string | null;
};

export type UploadDocumentResponse = { ok: true; document: UserDocumentRow };

export type SubmitTextResponse = { ok: true; document: UserDocumentRow };

export type DeleteDocumentResponse = { ok: true; message: string };

export type CheckListRow = {
  id_check: number;
  status: "processing" | "done" | "failed" | string;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;

  id_doc: number;
  doc_title: string;

  id_result: number | null;
  similarity: number | null; // percent
};

export type ChecksListResponse = {
  ok: true;
  total: number;
  limit: number;
  offset: number;
  rows: CheckListRow[];
};

export type CreateCheckResponse = {
  ok: true;
  check_id: number;
  result_id: number;
  similarity: number; // percent
  threshold: number; // 0..1
  candidates_count: number;
  matches_inserted: number;
};

export type CheckResult = {
  id_result: number;
  similarity: number; // percent
  report_path: string | null;
  summary_json: string; // JSON string
  created_at: string;
};

export type CheckMatchRow = {
  id_match: number;
  result_id: number;
  source_type: "corpus" | string;
  source_id: number;
  doc_span_start: number;
  doc_span_end: number;
  src_span_start: number;
  src_span_end: number;
  match_score: number; // 0..1 (sim)
  snippet_hash: string;
  corpus_title?: string | null;
};

export type CheckDetailResponse = {
  ok: true;
  check: {
    id_check: number;
    requested_by: number;
    doc_id: number;
    params_id: number;
    status: string;
    queued_at: string | null;
    started_at: string | null;
    finished_at: string | null;
    doc_title: string;
    path_text: string | null;
  };
  result: CheckResult | null;
  matches: CheckMatchRow[];
  doc_preview_text: string | null;
};

export async function mhListDocuments(params: {
  token: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 50));
  q.set("offset", String(params.offset ?? 0));
  return fetchJson<DocumentsListResponse>(`/api/documents?${q.toString()}`, {
    token: params.token,
  });
}

export async function mhGetDocument(params: {
  token: string;
  id_doc: number;
  preview?: boolean;
  max_chars?: number;
}) {
  const q = new URLSearchParams();
  q.set("preview", params.preview === false ? "0" : "1");
  if (params.max_chars != null) q.set("max_chars", String(params.max_chars));
  return fetchJson<DocumentDetailResponse>(
    `/api/documents/${params.id_doc}?${q.toString()}`,
    { token: params.token }
  );
}

export async function mhUploadDocument(params: {
  token: string;
  file: File;
  title?: string;
}) {
  const fd = new FormData();
  fd.append("file", params.file);
  if (params.title?.trim()) fd.append("title", params.title.trim());

  return fetchJson<UploadDocumentResponse>(`/api/documents/upload`, {
    method: "POST",
    token: params.token,
    body: fd,
  });
}

export async function mhSubmitText(params: {
  token: string;
  title?: string;
  text: string;
}) {
  return fetchJson<SubmitTextResponse>(`/api/documents/text`, {
    method: "POST",
    token: params.token,
    body: { title: params.title, text: params.text },
  });
}

export async function mhDeleteDocument(params: {
  token: string;
  id_doc: number;
}) {
  return fetchJson<DeleteDocumentResponse>(`/api/documents/${params.id_doc}`, {
    method: "DELETE",
    token: params.token,
  });
}

export async function mhCreateCheck(params: {
  token: string;
  doc_id: number;
  max_candidates?: number;
}) {
  return fetchJson<CreateCheckResponse>(`/api/checks`, {
    method: "POST",
    token: params.token,
    body: {
      doc_id: params.doc_id,
      max_candidates: params.max_candidates,
    },
  });
}

export async function mhListChecks(params: {
  token: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 50));
  q.set("offset", String(params.offset ?? 0));
  return fetchJson<ChecksListResponse>(`/api/checks?${q.toString()}`, {
    token: params.token,
  });
}

export async function mhGetCheck(params: {
  token: string;
  id_check: number;
  preview?: boolean;
}) {
  const q = new URLSearchParams();
  q.set("preview", params.preview === false ? "0" : "1");
  return fetchJson<CheckDetailResponse>(
    `/api/checks/${params.id_check}?${q.toString()}`,
    { token: params.token }
  );
}