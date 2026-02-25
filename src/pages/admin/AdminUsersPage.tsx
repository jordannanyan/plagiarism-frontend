import { useEffect, useMemo, useState } from "react";
import { adminListUsers, adminPatchUser, type AdminUserRow } from "../../api/admin_users";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "dosen" | "mahasiswa">("all");
  const [onlyActive, setOnlyActive] = useState(false);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const rows = await adminListUsers();
      setItems(rows);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal mengambil users (cek GET /api/admin/users)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((x) => {
      if (role !== "all" && String(x.role).toLowerCase() !== role) return false;
      if (onlyActive && x.is_active !== 1) return false;

      if (!qq) return true;
      const hay = `${x.name} ${x.email} ${x.role} ${x.nim ?? ""} ${x.nidn ?? ""} ${x.prodi ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, role, onlyActive]);

  const total = items.length;
  const activeCount = useMemo(() => items.filter((x) => x.is_active === 1).length, [items]);

  async function toggleActive(u: AdminUserRow) {
    setErr(null);
    const next: 0 | 1 = u.is_active === 1 ? 0 : 1;

    // optimistic UI
    setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));

    try {
      await adminPatchUser(u.id, { is_active: next });
    } catch (e: any) {
      // rollback
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: u.is_active } : x)));
      setErr(e?.response?.data?.message ?? "Gagal update is_active user");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Total <span className="font-semibold text-zinc-900">{total}</span>, aktif{" "}
            <span className="font-semibold text-zinc-900">{activeCount}</span>.
          </p>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-zinc-600">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama, email, nim/nidn, prodi…"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="dosen">Dosen</option>
              <option value="mahasiswa">Mahasiswa</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="h-4 w-4"
              />
              Only active
            </label>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-zinc-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-zinc-600">Tidak ada user yang cocok dengan filter.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[70px]">ID</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 w-[120px]">Role</th>
                  <th className="px-3 py-2 w-[120px]">Status</th>
                  <th className="px-3 py-2 w-[190px]">Created</th>
                  <th className="px-3 py-2 w-[150px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 text-zinc-700">{u.id}</td>

                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{u.name}</div>
                      <div className="text-xs text-zinc-500">{u.email}</div>

                      {/* info tambahan opsional */}
                      <div className="mt-1 flex flex-wrap gap-2">
                        {u.role === "mahasiswa" && u.nim ? <Badge>NIM: {u.nim}</Badge> : null}
                        {u.role === "dosen" && u.nidn ? <Badge>NIDN: {u.nidn}</Badge> : null}
                        {u.prodi ? <Badge>{u.prodi}</Badge> : null}
                        {u.angkatan ? <Badge>Angkatan {u.angkatan}</Badge> : null}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <Badge>{u.role}</Badge>
                    </td>

                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                          u.is_active === 1 ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                        )}
                      >
                        {u.is_active === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-zinc-600">{fmtDate(u.created_at)}</td>

                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Toggle Active
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Endpoint: <span className="font-mono">GET /api/admin/users</span> dan{" "}
          <span className="font-mono">PATCH /api/admin/users/:id</span>.
        </p>
      </div>
    </div>
  );
}