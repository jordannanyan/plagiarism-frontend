import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhListChecks, type CheckListRow } from "../../api/mahasiswa";
import { Badge } from "../../components/ui";

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function statusBadge(status: string) {
  if (status === "done") return <Badge variant="success">done</Badge>;
  if (status === "processing") return <Badge variant="warn">processing</Badge>;
  if (status === "failed") return <Badge variant="danger">failed</Badge>;
  return <Badge>{status}</Badge>;
}

export default function MahasiswaChecksPage() {
  const { token } = useAuth() as any;
  const [] = useSearchParams();

  const [rows, setRows] = useState<CheckListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const res = await mhListChecks({ token, limit: 50, offset: 0 });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load checks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-zinc-900">My Checks</div>
          <div className="text-sm text-zinc-500">
            History of plagiarism checks you have run.
          </div>
        </div>
        <Link
          to="/mahasiswa/documents"
          className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Go to Documents →
        </Link>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">
            Checks <span className="text-zinc-500 font-normal">({loading ? "…" : total})</span>
          </div>
          <button
            onClick={reload}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="p-4 text-sm text-zinc-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              No checks yet. Create one from Documents.
            </div>
          ) : (
            rows.map((r) => (
              <Link
                key={r.id_check}
                to={`/mahasiswa/checks/${r.id_check}`}
                className="block p-4 hover:bg-zinc-50"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {r.doc_title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Check ID: {r.id_check} • Started: {fmtDate(r.started_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(r.status)}
                    <div className="text-right">
                      <div className="text-sm font-bold text-zinc-900">
                        {r.similarity == null ? "-" : `${r.similarity}%`}
                      </div>
                      <div className="text-xs text-zinc-500">Similarity</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}