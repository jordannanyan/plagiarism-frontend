import { useEffect, useState } from "react";
import { getMyInbox, type InboxRow, type VerificationStatus } from "../../api/verification";

// ── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY = "mhs_inbox_read";

function loadReadIds(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

// ── Utility ───────────────────────────────────────────────────────────────────
function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

// ── Pills ─────────────────────────────────────────────────────────────────────
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
    wajar:        { label: "Wajar",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    perlu_revisi: { label: "Perlu Revisi", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    plagiarisme:  { label: "Plagiarisme",  cls: "bg-red-50 text-red-700 border-red-200" },
  };
  const { label, cls } = map[value] ?? { label: value, cls: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cls)}>
      {label}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function InboxCard({
  row,
  isRead,
  onMarkRead,
}: {
  row: InboxRow;
  isRead: boolean;
  onMarkRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors",
        !isRead && "border-l-4 border-l-blue-500"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!isRead && (
              <span className="inline-flex items-center rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                BARU
              </span>
            )}
            <span className={cn("text-sm font-semibold truncate", isRead ? "text-zinc-500" : "text-zinc-900")}>
              {row.doc_title}
            </span>
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

        <div className="flex shrink-0 items-center gap-2">
          {isRead ? (
            <span className="text-xs text-zinc-400">✓ Dibaca</span>
          ) : (
            <button
              onClick={onMarkRead}
              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              Sudah Dibaca
            </button>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            {expanded ? "Tutup" : "Lihat Catatan"}
          </button>
        </div>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MahasiswaInboxPage() {
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">("all");
  const [readIds, setReadIds] = useState<Set<number>>(loadReadIds);

  const unreadCount = rows.filter((r) => !readIds.has(r.id_result)).length;

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

  function markRead(id: number) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }

  function markAllRead() {
    setReadIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.id_result));
      saveReadIds(next);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Inbox Verifikasi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Hasil verifikasi dari dosen untuk laporan yang kamu submit.{" "}
            {total > 0 && (
              <span className="font-semibold text-zinc-900">{total} verifikasi diterima</span>
            )}
            {unreadCount > 0 && (
              <span className="ml-1 text-blue-600 font-semibold">· {unreadCount} belum dibaca</span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              Tandai Semua Dibaca
            </button>
          )}
          <button
            onClick={load}
            className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
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
            <InboxCard
              key={row.id_result}
              row={row}
              isRead={readIds.has(row.id_result)}
              onMarkRead={() => markRead(row.id_result)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
