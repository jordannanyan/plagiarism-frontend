import { useEffect, useRef, useState } from "react";
import { getAuditLog, type AuditRow } from "../../api/audit";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

/** Color-code actions by verb */
function ActionBadge({ action }: { action: string }) {
  const a = action.toUpperCase();
  const cls = a.includes("CREATE") || a.includes("LOGIN")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : a.includes("UPDATE") || a.includes("UPSERT")
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : a.includes("DELETE") || a.includes("DEACTIVATE") || a.includes("LOGOUT")
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-zinc-100 text-zinc-700 border-zinc-200";

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-medium", cls)}>
      {action}
    </span>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span className="text-zinc-400 text-xs">-</span>;
  const cls =
    role === "admin"
      ? "bg-violet-50 text-violet-700"
      : role === "dosen"
      ? "bg-blue-50 text-blue-700"
      : "bg-zinc-100 text-zinc-600";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>
      {role}
    </span>
  );
}

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [allActions, setAllActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // pending search query (only applied on submit/enter)
  const qRef = useRef(q);

  async function load(off = 0) {
    setLoading(true);
    setErr(null);
    try {
      const res = await getAuditLog({
        q: q.trim() || undefined,
        action: actionFilter || undefined,
        from: fromDate || undefined,
        to: toDate ? toDate + "T23:59:59" : undefined,
        limit: PAGE_SIZE,
        offset: off,
      });
      setRows(res.rows);
      setTotal(res.total);
      if (res.actions.length > 0) setAllActions(res.actions);
      setOffset(off);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal mengambil audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, fromDate, toDate]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(0);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Audit Log</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Semua aktivitas yang tercatat dalam sistem.{" "}
            {!loading && <span className="font-semibold text-zinc-900">{total}</span>} entri.
          </p>
        </div>
        <button
          onClick={() => load(offset)}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-zinc-600">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nama, email, action…"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Semua</option>
              {allActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Dari</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Sampai</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <button
                type="submit"
                className="mt-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 whitespace-nowrap"
              >
                Cari
              </button>
            </div>
          </div>
        </form>

        {(q || actionFilter || fromDate || toDate) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span>Filter aktif.</span>
            <button
              onClick={() => { setQ(""); setActionFilter(""); setFromDate(""); setToDate(""); qRef.current = ""; load(0); }}
              className="underline hover:text-zinc-900"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-zinc-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">Tidak ada entri yang cocok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-600 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 w-[60px]">ID</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 w-[80px]">Role</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2 w-[140px]">Entity</th>
                  <th className="px-3 py-2 w-[100px]">IP</th>
                  <th className="px-3 py-2 w-[170px]">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row) => (
                  <tr key={row.id_log} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{row.id_log}</td>

                    <td className="px-3 py-2">
                      {row.user_name ? (
                        <>
                          <div className="font-medium text-zinc-900">{row.user_name}</div>
                          <div className="text-xs text-zinc-400">{row.user_email}</div>
                        </>
                      ) : (
                        <span className="text-zinc-400 text-xs">user_id: {row.user_id ?? "-"}</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <RoleBadge role={row.user_role} />
                    </td>

                    <td className="px-3 py-2">
                      <ActionBadge action={row.action} />
                    </td>

                    <td className="px-3 py-2 text-xs text-zinc-600 font-mono">
                      {row.entity ? (
                        <span>
                          {row.entity}
                          {row.entity_id != null && (
                            <span className="text-zinc-400"> #{row.entity_id}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>

                    <td className="px-3 py-2 text-xs text-zinc-500 font-mono">
                      {row.ip_addr ?? "-"}
                    </td>

                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {fmtDate(row.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-zinc-500">
              Halaman {currentPage} / {totalPages} &nbsp;·&nbsp; {total} entri
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => load(offset - PAGE_SIZE)}
                disabled={offset === 0}
                className="rounded-lg border px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => load(offset + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="rounded-lg border px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
