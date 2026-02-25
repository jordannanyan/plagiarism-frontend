import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhListChecks, mhListDocuments } from "../../api/mahasiswa";
import { Badge } from "../../components/ui";

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function MahasiswaHomePage() {
  const { token } = useAuth() as any; // asumsi useAuth mengandung token
  const [loading, setLoading] = useState(true);
  const [docsTotal, setDocsTotal] = useState(0);
  const [checksTotal, setChecksTotal] = useState(0);
  const [latestChecks, setLatestChecks] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [docs, checks] = await Promise.all([
          mhListDocuments({ token, limit: 1, offset: 0 }),
          mhListChecks({ token, limit: 5, offset: 0 }),
        ]);
        if (!alive) return;
        setDocsTotal(docs.total);
        setChecksTotal(checks.total);
        setLatestChecks(checks.rows);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const stats = useMemo(() => {
    const done = latestChecks.filter((c) => c.status === "done").length;
    const processing = latestChecks.filter((c) => c.status === "processing").length;
    const failed = latestChecks.filter((c) => c.status === "failed").length;
    return { done, processing, failed };
  }, [latestChecks]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-zinc-500">My Documents</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {loading ? "…" : docsTotal}
          </div>
          <div className="mt-3">
            <Link
              to="/mahasiswa/documents"
              className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4"
            >
              Manage documents →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-zinc-500">My Checks</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {loading ? "…" : checksTotal}
          </div>
          <div className="mt-3">
            <Link
              to="/mahasiswa/checks"
              className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4"
            >
              View checks →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-zinc-500">Recent (Top 5)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="success">done: {stats.done}</Badge>
            <Badge variant="warn">processing: {stats.processing}</Badge>
            <Badge variant="danger">failed: {stats.failed}</Badge>
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Refresh by re-opening page.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Latest checks</div>
          <Link
            to="/mahasiswa/checks"
            className="text-sm font-semibold text-zinc-700 hover:text-zinc-900"
          >
            See all →
          </Link>
        </div>

        <div className="divide-y">
          {latestChecks.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              {loading ? "Loading…" : "No checks yet. Create one from Documents page."}
            </div>
          ) : (
            latestChecks.map((c) => (
              <Link
                key={c.id_check}
                to={`/mahasiswa/checks/${c.id_check}`}
                className="block p-4 hover:bg-zinc-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">
                      {c.doc_title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Started: {fmtDate(c.started_at)} • Status: {c.status}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-900">
                      {c.similarity == null ? "-" : `${c.similarity}%`}
                    </div>
                    <div className="text-xs text-zinc-500">Similarity</div>
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