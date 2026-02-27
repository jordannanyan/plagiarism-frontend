import { useEffect, useState } from "react";
import { getMyInbox, type InboxRow, type VerificationStatus } from "../../api/verification";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function SimilarityPill({ value }: { value: number }) {
  const cls =
    value >= 70
      ? "bg-red-50 text-red-700 border-red-200"
      : value >= 30
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cls)}>
      {value}%
    </span>
  );
}

function StatusPill({ value }: { value: VerificationStatus }) {
  const map: Record<VerificationStatus, { label: string; cls: string }> = {
    wajar: { label: "Wajar", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    perlu_revisi: { label: "Perlu Revisi", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    plagiarisme: { label: "Plagiarisme", cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, cls } = map[value] ?? { label: value, cls: "bg-zinc-100 text-zinc-700" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cls)}>
      {label}
    </span>
  );
}

function InboxCard({ row }: { row: InboxRow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 truncate">{row.doc_title}</span>
            <SimilarityPill value={row.similarity} />
            <StatusPill value={row.verification_status} />
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Diverifikasi oleh{" "}
            <span className="font-medium text-zinc-700">{row.verifier_name}</span>
            {row.verifier_nidn ? ` (NIDN: ${row.verifier_nidn})` : ""}
            {" · "}
            {fmtDate(row.note_created_at)}
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg border px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          {expanded ? "Tutup" : "Lihat Catatan"}
        </button>
      </div>

      {/* Expanded note */}
      {expanded && (
        <div className="border-t bg-zinc-50 px-4 py-3">
          <div className="text-xs font-semibold text-zinc-500 mb-1">Catatan Dosen</div>
          <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
            {row.note_text || <span className="text-zinc-400 italic">Tidak ada catatan.</span>}
          </p>
          <div className="mt-3 text-xs text-zinc-400">
            Similarity: {row.similarity}% · Check selesai: {fmtDate(row.finished_at)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MahasiswaInboxPage() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">("all");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await getMyInbox({
        limit: 100,
        offset: 0,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal mengambil data inbox.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Inbox Verifikasi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Hasil verifikasi dari dosen untuk laporan yang kamu submit.{" "}
            {total > 0 && (
              <span className="font-semibold text-zinc-900">{total} verifikasi diterima.</span>
            )}
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <label className="block text-xs font-semibold text-zinc-600 mb-2">Filter Status</label>
        <div className="flex flex-wrap gap-2">
          {(["all", "wajar", "perlu_revisi", "plagiarisme"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                statusFilter === s
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50"
              )}
            >
              {s === "all" ? "Semua" : s === "perlu_revisi" ? "Perlu Revisi" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500 shadow-sm">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 shadow-sm text-center">
          <div className="text-2xl mb-2">📭</div>
          <div className="text-sm font-medium text-zinc-700">Belum ada verifikasi</div>
          <div className="mt-1 text-xs text-zinc-400">
            {statusFilter !== "all"
              ? "Tidak ada verifikasi dengan status ini."
              : "Dosen belum memverifikasi laporan kamu."}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <InboxCard key={row.id_result} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
