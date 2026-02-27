import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhListChecks, mhListDocuments } from "../../api/mahasiswa";
import { getMyInbox, type InboxRow } from "../../api/verification";
import { Badge } from "../../components/ui";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

const STATUS_MAP = {
  wajar:       { label: "Wajar",       cls: "bg-emerald-50 text-emerald-700" },
  perlu_revisi:{ label: "Perlu Revisi",cls: "bg-amber-50 text-amber-700" },
  plagiarisme: { label: "Plagiarisme", cls: "bg-red-50 text-red-700" },
} as const;

function VerifPill({ status }: { status: string }) {
  const s = STATUS_MAP[status as keyof typeof STATUS_MAP];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", s?.cls ?? "bg-zinc-100 text-zinc-600")}>
      {s?.label ?? status}
    </span>
  );
}

export default function MahasiswaHomePage() {
  const { token } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [docsTotal, setDocsTotal] = useState(0);
  const [checksTotal, setChecksTotal] = useState(0);
  const [latestChecks, setLatestChecks] = useState<any[]>([]);
  const [inboxTotal, setInboxTotal] = useState(0);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  const [latestInbox, setLatestInbox] = useState<InboxRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [docs, checks, inbox] = await Promise.all([
          mhListDocuments({ token, limit: 1, offset: 0 }),
          mhListChecks({ token, limit: 5, offset: 0 }),
          getMyInbox({ limit: 100, offset: 0 }),
        ]);
        if (!alive) return;
        setDocsTotal(docs.total);
        setChecksTotal(checks.total);
        setLatestChecks(checks.rows);
        setInboxTotal(inbox.total);
        setLatestInbox(inbox.rows.slice(0, 3));
        try {
          const raw = localStorage.getItem("mhs_inbox_read");
          const readIds = new Set<number>(raw ? (JSON.parse(raw) as number[]) : []);
          setUnreadInboxCount(inbox.rows.filter((r) => !readIds.has(r.id_result)).length);
        } catch {
          setUnreadInboxCount(inbox.total);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const stats = useMemo(() => {
    const done = latestChecks.filter((c) => c.status === "done").length;
    const processing = latestChecks.filter((c) => c.status === "processing").length;
    const failed = latestChecks.filter((c) => c.status === "failed").length;
    return { done, processing, failed };
  }, [latestChecks]);

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-zinc-500">My Documents</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {loading ? "…" : docsTotal}
          </div>
          <div className="mt-3">
            <Link to="/mahasiswa/documents" className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4">
              Manage →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-zinc-500">My Checks</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {loading ? "…" : checksTotal}
          </div>
          <div className="mt-3">
            <Link to="/mahasiswa/checks" className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4">
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
          <div className="mt-3 text-xs text-zinc-500">Refresh by re-opening page.</div>
        </div>

        {/* Inbox card */}
        <div className="rounded-2xl border bg-white p-4 relative">
          {unreadInboxCount > 0 && (
            <span className="absolute top-3 right-3 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
            </span>
          )}
          <div className="text-xs text-zinc-500">Verifikasi Diterima</div>
          <div className="mt-1 text-2xl font-bold text-zinc-900">
            {loading ? "…" : inboxTotal}
          </div>
          <div className="mt-3">
            <Link to="/mahasiswa/inbox" className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4">
              Lihat inbox →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Latest verifications ── */}
      {(latestInbox.length > 0 || loading) && (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">Verifikasi Terbaru</span>
              {unreadInboxCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                </span>
              )}
            </div>
            <Link to="/mahasiswa/inbox" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
              Lihat semua →
            </Link>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-4 text-sm text-zinc-500">Loading…</div>
            ) : latestInbox.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">Belum ada verifikasi dari dosen.</div>
            ) : (
              latestInbox.map((row) => (
                <Link key={row.id_result} to="/mahasiswa/inbox" className="flex items-start justify-between gap-3 p-4 hover:bg-zinc-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900 truncate">{row.doc_title}</span>
                      <VerifPill status={row.verification_status} />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Oleh <span className="font-medium text-zinc-700">{row.verifier_name}</span>
                      {" · "}
                      {fmtDate(row.note_created_at)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-zinc-900">{row.similarity}%</div>
                    <div className="text-xs text-zinc-500">Similarity</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Latest checks ── */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Latest checks</div>
          <Link to="/mahasiswa/checks" className="text-sm font-semibold text-zinc-700 hover:text-zinc-900">
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
                    <div className="text-sm font-semibold text-zinc-900">{c.doc_title}</div>
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
