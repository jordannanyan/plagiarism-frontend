import { useEffect, useMemo, useState } from "react";
import { adminGetActiveParams, adminGetPolicy, adminGetUsers } from "../../api/admin";

function formatBytes(n?: number) {
  if (!n || Number.isNaN(n)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function Card({
  title,
  value,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-zinc-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">{value}</div>
      {sub ? <div className="mt-2 text-sm text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function countMime(allowed: any): number {
  if (!allowed) return 0;

  // kemungkinan format:
  // - string: "application/pdf,application/msword"
  // - string: "application/pdf"
  // - array: ["application/pdf", ...]
  if (Array.isArray(allowed)) return allowed.length;

  const s = String(allowed);
  return s
    .split(/[,\n]/g)
    .map((x) => x.trim())
    .filter(Boolean).length;
}

export default function AdminHomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any | null>(null);
  const [paramsActive, setParamsActive] = useState<any[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);

    const [u, p, pa] = await Promise.allSettled([
      adminGetUsers(),
      adminGetPolicy(),
      adminGetActiveParams(),
    ]);

    if (u.status === "fulfilled") setUsers(Array.isArray(u.value) ? u.value : []);
    if (p.status === "fulfilled") setPolicy(p.value ?? null);

    if (pa.status === "fulfilled") {
      const v = pa.value as any;
      setParamsActive(Array.isArray(v) ? v : v ? [v] : []);
    }

    const anyRejected =
      u.status === "rejected" || p.status === "rejected" || pa.status === "rejected";

    if (anyRejected) {
      setErr("Sebagian data gagal dimuat. Pastikan backend running dan token valid, lalu klik Refresh.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const totalUsers = users.length;

  const activeUsers = useMemo(() => {
    return users.filter((x) => x?.is_active === 1 || x?.is_active === true).length;
  }, [users]);

  const mimeCount = useMemo(() => countMime(policy?.allowed_mime), [policy]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ringkasan data sistem untuk Admin (Users, Policy, dan Params aktif).
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {err}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Total Users"
          value={loading ? "…" : totalUsers}
          sub={loading ? null : `${activeUsers} aktif`}
        />

        <Card
          title="Active Params"
          value={loading ? "…" : paramsActive.length}
          sub={
            loading
              ? null
              : paramsActive[0]
              ? `k=${paramsActive[0]?.k ?? "-"}, w=${paramsActive[0]?.w ?? "-"}, threshold=${paramsActive[0]?.threshold ?? "-"}`
              : "Belum ada params aktif"
          }
        />

        <Card
          title="Max Upload Size"
          value={loading ? "…" : formatBytes(policy?.max_file_size)}
          sub={loading ? null : "Dari policy upload"}
        />

        <Card
          title="Allowed MIME"
          value={loading ? "…" : mimeCount}
          sub={loading ? null : "Jumlah tipe file yang diizinkan"}
        />
      </div>

      {/* Detail Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Policy Detail</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-600">Max file size</span>
              <span className="font-medium text-zinc-900">{formatBytes(policy?.max_file_size)}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-zinc-600">Allowed mime</span>
              <span className="font-mono text-xs text-zinc-800 text-right break-all max-w-[60%]">
                {policy?.allowed_mime ? String(policy.allowed_mime) : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Active Params Detail</h2>
          {loading ? (
            <div className="mt-3 text-sm text-zinc-600">Loading...</div>
          ) : paramsActive.length === 0 ? (
            <div className="mt-3 text-sm text-zinc-600">Belum ada params aktif.</div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">k</th>
                    <th className="px-3 py-2">w</th>
                    <th className="px-3 py-2">threshold</th>
                    <th className="px-3 py-2">active_to</th>
                  </tr>
                </thead>
                <tbody>
                  {paramsActive.map((x: any, idx: number) => (
                    <tr key={x?.id ?? idx} className="border-t">
                      <td className="px-3 py-2 text-zinc-800">{x?.id ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-800">{x?.k ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-800">{x?.w ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-800">{x?.threshold ?? "-"}</td>
                      <td className="px-3 py-2 text-zinc-600">{x?.active_to ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-500">
            Sumber data: <span className="font-mono">/api/admin/users</span>,{" "}
            <span className="font-mono">/api/admin/policy</span>,{" "}
            <span className="font-mono">/api/admin/params?active=1</span>.
          </p>
        </div>
      </div>
    </div>
  );
}