import { useEffect, useMemo, useState } from "react";
import { getDosenPendingDocs, type DosenPendingDocRow } from "../../api/dosen";
import { upsertVerificationNote, type VerificationStatus } from "../../api/verification";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function SimilarityPill({ value }: { value?: number }) {
  const v = typeof value === "number" ? value : NaN;
  const cls =
    v >= 70 ? "bg-red-50 text-red-700" : v >= 30 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
  return Number.isFinite(v) ? (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold", cls)}>{v}%</span>
  ) : (
    <span className="text-zinc-500">-</span>
  );
}

function VerifyModal({
  row,
  onClose,
  onSaved,
}: {
  row: DosenPendingDocRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<VerificationStatus>("perlu_revisi");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!noteText.trim() && status !== "wajar") {
      setErr("Catatan wajib diisi untuk status selain 'wajar'.");
      return;
    }
    setSaving(true);
    try {
      await upsertVerificationNote(row.id_result, { status, note_text: noteText.trim() });
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal menyimpan verifikasi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <div className="text-base font-semibold text-zinc-900">Verifikasi Dokumen</div>
            <div className="mt-1 text-xs text-zinc-500">
              {row.requester_name} {row.requester_nim ? `(${row.requester_nim})` : ""} • {row.doc_title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div className="rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-600">
            <div>
              Similarity: <SimilarityPill value={row.similarity} />
            </div>
            <div className="mt-1">Selesai check: {fmtDate(row.finished_at)}</div>
          </div>

          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VerificationStatus)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="wajar">wajar</option>
                <option value="perlu_revisi">perlu_revisi</option>
                <option value="plagiarisme">plagiarisme</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-800">Catatan</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Tulis catatan verifikasi..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              disabled={saving}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                saving ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {saving ? "Menyimpan..." : "Simpan Verifikasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DosenPendingDocsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<DosenPendingDocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [picked, setPicked] = useState<DosenPendingDocRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await getDosenPendingDocs({ q: qDebounced || undefined, limit: 200 });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal load dokumen pending");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dokumen Belum Diperiksa</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dokumen mahasiswa yang menargetkan Anda dan belum diberi catatan verifikasi.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Total: <span className="font-semibold text-zinc-900">{total}</span>
          </p>
        </div>

        <button
          onClick={load}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <div className="rounded-2xl border bg-white p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama mahasiswa, NIM, atau judul dokumen..."
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Mahasiswa</th>
              <th className="px-3 py-2">NIM</th>
              <th className="px-3 py-2">Dokumen</th>
              <th className="px-3 py-2">Similarity</th>
              <th className="px-3 py-2">Selesai check</th>
              <th className="px-3 py-2 w-[120px]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-t">
                <td colSpan={6} className="px-3 py-3 text-zinc-600">Loading...</td>
              </tr>
            ) : empty ? (
              <tr className="border-t">
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                  Tidak ada dokumen pending.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id_result} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900">{r.requester_name}</div>
                    <div className="text-xs text-zinc-500">{r.requester_email}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{r.requester_nim ?? "-"}</td>
                  <td className="px-3 py-2 text-zinc-800">{r.doc_title}</td>
                  <td className="px-3 py-2"><SimilarityPill value={r.similarity} /></td>
                  <td className="px-3 py-2 text-zinc-600">{fmtDate(r.finished_at)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setPicked(r)}
                      className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Verifikasi
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {picked && (
        <VerifyModal
          row={picked}
          onClose={() => setPicked(null)}
          onSaved={() => {
            setPicked(null);
            load();
          }}
        />
      )}
    </div>
  );
}
