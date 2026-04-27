import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDosenPendingDocs, type DosenPendingDocRow } from "../../api/dosen";

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

export default function DosenPendingDocsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<DosenPendingDocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");

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
                    <Link
                      to={`/dosen/verifikasi?result=${r.id_result}`}
                      className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Verifikasi
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
