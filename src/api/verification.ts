import { api } from "./client";

export type VerificationStatus = "wajar" | "perlu_revisi" | "plagiarisme";

export type VerificationNote = {
  id_note: number;
  result_id: number;
  verifier_id: number;
  status: VerificationStatus;
  note_text: string;
  created_at: string;
  dosen_nama: string;
  dosen_nidn: string;
};

export type VerificationResultRow = {
  id_result: number;
  similarity: number;
  result_created_at: string;

  id_check: number;
  doc_id: number;
  requested_by: number;
  requester_name: string;
  requester_email: string;
  doc_title: string;
  finished_at: string;

  // nullable kalau belum diverifikasi
  id_note: number | null;
  verification_status: VerificationStatus | null;
  note_text: string | null;
  note_created_at: string | null;
  verifier_name: string | null;
  verifier_nidn: string | null;
};

export async function getVerificationResults(params?: {
  limit?: number;
  offset?: number;
  min_similarity?: number;
  status?: VerificationStatus;
  only_pending?: 0 | 1;
}) {
  const { data } = await api.get("/api/verification/results", { params });
  return {
    ok: Boolean(data?.ok),
    total: Number(data?.total ?? 0),
    limit: Number(data?.limit ?? params?.limit ?? 50),
    offset: Number(data?.offset ?? params?.offset ?? 0),
    rows: (Array.isArray(data?.rows) ? data.rows : []) as VerificationResultRow[],
  };
}

export async function upsertVerificationNote(
  resultId: number,
  payload: { status: VerificationStatus; note_text?: string }
) {
  const { data } = await api.post(`/api/verification/${resultId}`, payload);
  return data;
}