import { useEffect, useMemo, useState } from "react";
import {
  adminListUsers,
  adminPatchUser,
  adminDeleteUser,
  adminCreateUser,
  type AdminUserRow,
} from "../../api/admin_users";

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

type EditForm = {
  name: string;
  email: string;
  password: string;
  // dosen
  nidn: string;
  dosen_nama: string;
  telp: string;
  // mahasiswa
  nim: string;
  prodi: string;
  angkatan: string;
};

function initForm(u: AdminUserRow): EditForm {
  return {
    name: u.name,
    email: u.email,
    password: "",
    nidn: u.nidn ?? "",
    dosen_nama: u.dosen_nama ?? u.name,
    telp: u.dosen_telp ?? "",
    nim: u.nim ?? "",
    prodi: u.prodi ?? "",
    angkatan: u.angkatan != null ? String(u.angkatan) : "",
  };
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "dosen" | "mahasiswa">("all");
  const [onlyActive, setOnlyActive] = useState(false);

  // edit modal
  const [editTarget, setEditTarget] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  // delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    role: "mahasiswa" as "dosen" | "mahasiswa",
    name: "", email: "", password: "",
    nidn: "", dosen_nama: "", telp: "",
    nim: "", prodi: "", angkatan: "",
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  function openCreate() {
    setCreateForm({
      role: "mahasiswa", name: "", email: "", password: "",
      nidn: "", dosen_nama: "", telp: "",
      nim: "", prodi: "", angkatan: "",
    });
    setCreateErr(null);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setCreateErr(null);
  }

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateErr("Name, email, dan password wajib diisi.");
      return;
    }
    setCreateSaving(true);
    setCreateErr(null);
    try {
      const payload: Parameters<typeof adminCreateUser>[0] = {
        role: createForm.role,
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
      };
      if (createForm.role === "dosen") {
        payload.dosen = {
          nidn: createForm.nidn || undefined,
          nama: createForm.dosen_nama || undefined,
          telp: createForm.telp || undefined,
        };
      } else {
        payload.mahasiswa = {
          nim: createForm.nim || undefined,
          prodi: createForm.prodi || undefined,
          angkatan: createForm.angkatan ? Number(createForm.angkatan) : undefined,
        };
      }
      await adminCreateUser(payload);
      closeCreate();
      await refresh();
    } catch (e: any) {
      setCreateErr(e?.response?.data?.message ?? "Gagal membuat user");
    } finally {
      setCreateSaving(false);
    }
  }

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
      const hay =
        `${x.name} ${x.email} ${x.role} ${x.nim ?? ""} ${x.nidn ?? ""} ${x.prodi ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, role, onlyActive]);

  const total = items.length;
  const activeCount = useMemo(() => items.filter((x) => x.is_active === 1).length, [items]);

  async function toggleActive(u: AdminUserRow) {
    setErr(null);
    const next: 0 | 1 = u.is_active === 1 ? 0 : 1;
    setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));
    try {
      await adminPatchUser(u.id, { is_active: next });
    } catch (e: any) {
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: u.is_active } : x)));
      setErr(e?.response?.data?.message ?? "Gagal update is_active user");
    }
  }

  function openEdit(u: AdminUserRow) {
    setEditTarget(u);
    setEditForm(initForm(u));
    setEditErr(null);
  }

  function closeEdit() {
    setEditTarget(null);
    setEditForm(null);
    setEditErr(null);
  }

  async function handleSaveEdit() {
    if (!editTarget || !editForm) return;
    setEditSaving(true);
    setEditErr(null);
    try {
      const payload: Parameters<typeof adminPatchUser>[1] = {};

      if (editForm.name !== editTarget.name) payload.name = editForm.name;
      if (editForm.email !== editTarget.email) payload.email = editForm.email;
      if (editForm.password.trim()) payload.password = editForm.password;

      if (editTarget.role === "dosen") {
        const d: NonNullable<typeof payload.dosen> = {};
        if (editForm.nidn !== (editTarget.nidn ?? "")) d.nidn = editForm.nidn;
        if (editForm.dosen_nama !== (editTarget.dosen_nama ?? editTarget.name)) d.nama = editForm.dosen_nama;
        if (editForm.telp !== (editTarget.dosen_telp ?? "")) d.telp = editForm.telp;
        if (Object.keys(d).length > 0) payload.dosen = d;
      }

      if (editTarget.role === "mahasiswa") {
        const m: NonNullable<typeof payload.mahasiswa> = {};
        if (editForm.nim !== (editTarget.nim ?? "")) m.nim = editForm.nim;
        if (editForm.prodi !== (editTarget.prodi ?? "")) m.prodi = editForm.prodi;
        const newAngkatan = editForm.angkatan ? Number(editForm.angkatan) : null;
        if (newAngkatan !== (editTarget.angkatan ?? null)) m.angkatan = newAngkatan;
        if (Object.keys(m).length > 0) payload.mahasiswa = m;
      }

      await adminPatchUser(editTarget.id, payload);

      // update local state optimistically
      setItems((prev) =>
        prev.map((x) =>
          x.id === editTarget.id
            ? {
                ...x,
                name: editForm.name,
                email: editForm.email,
                nidn: editTarget.role === "dosen" ? editForm.nidn || null : x.nidn,
                dosen_nama: editTarget.role === "dosen" ? editForm.dosen_nama || null : x.dosen_nama,
                dosen_telp: editTarget.role === "dosen" ? editForm.telp || null : x.dosen_telp,
                nim: editTarget.role === "mahasiswa" ? editForm.nim || null : x.nim,
                prodi: editTarget.role === "mahasiswa" ? editForm.prodi || null : x.prodi,
                angkatan:
                  editTarget.role === "mahasiswa" && editForm.angkatan
                    ? Number(editForm.angkatan)
                    : x.angkatan,
              }
            : x
        )
      );

      closeEdit();
    } catch (e: any) {
      setEditErr(e?.response?.data?.message ?? "Gagal menyimpan perubahan");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(u: AdminUserRow) {
    if (
      !window.confirm(
        `Hapus (deactivate) user "${u.name}"?\nUser akan dinonaktifkan dan bisa diaktifkan kembali.`
      )
    )
      return;

    setDeletingId(u.id);
    try {
      await adminDeleteUser(u.id);
      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: 0 } : x)));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal menghapus user");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Create Modal ── */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeCreate(); }}
        >
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-zinc-900">Tambah User</h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as "dosen" | "mahasiswa" }))}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="mahasiswa">Mahasiswa</option>
                  <option value="dosen">Dosen</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Name</label>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {createForm.role === "dosen" && (
                <>
                  <hr className="border-zinc-100" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Data Dosen</p>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Nama Dosen</label>
                    <input
                      value={createForm.dosen_nama}
                      onChange={(e) => setCreateForm((f) => ({ ...f, dosen_nama: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">NIDN</label>
                    <input
                      value={createForm.nidn}
                      onChange={(e) => setCreateForm((f) => ({ ...f, nidn: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Telepon</label>
                    <input
                      value={createForm.telp}
                      onChange={(e) => setCreateForm((f) => ({ ...f, telp: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </>
              )}

              {createForm.role === "mahasiswa" && (
                <>
                  <hr className="border-zinc-100" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Data Mahasiswa</p>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">NIM</label>
                    <input
                      value={createForm.nim}
                      onChange={(e) => setCreateForm((f) => ({ ...f, nim: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Prodi</label>
                    <input
                      value={createForm.prodi}
                      onChange={(e) => setCreateForm((f) => ({ ...f, prodi: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Angkatan</label>
                    <input
                      type="number"
                      value={createForm.angkatan}
                      onChange={(e) => setCreateForm((f) => ({ ...f, angkatan: e.target.value }))}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </>
              )}

              {createErr && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createErr}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeCreate}
                disabled={createSaving}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={createSaving}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {createSaving ? "Menyimpan…" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-zinc-900">
              Edit User &mdash; {editTarget.name}
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Base fields */}
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => f && { ...f, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600">
                  Password baru{" "}
                  <span className="font-normal text-zinc-400">(kosongkan jika tidak diubah)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => f && { ...f, password: e.target.value })}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {/* Dosen fields */}
              {editTarget.role === "dosen" && (
                <>
                  <hr className="border-zinc-100" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Data Dosen
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Nama Dosen</label>
                    <input
                      value={editForm.dosen_nama}
                      onChange={(e) => setEditForm((f) => f && { ...f, dosen_nama: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">NIDN</label>
                    <input
                      value={editForm.nidn}
                      onChange={(e) => setEditForm((f) => f && { ...f, nidn: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Telepon</label>
                    <input
                      value={editForm.telp}
                      onChange={(e) => setEditForm((f) => f && { ...f, telp: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </>
              )}

              {/* Mahasiswa fields */}
              {editTarget.role === "mahasiswa" && (
                <>
                  <hr className="border-zinc-100" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Data Mahasiswa
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">NIM</label>
                    <input
                      value={editForm.nim}
                      onChange={(e) => setEditForm((f) => f && { ...f, nim: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Prodi</label>
                    <input
                      value={editForm.prodi}
                      onChange={(e) => setEditForm((f) => f && { ...f, prodi: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600">Angkatan</label>
                    <input
                      type="number"
                      value={editForm.angkatan}
                      onChange={(e) => setEditForm((f) => f && { ...f, angkatan: e.target.value })}
                      className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                  </div>
                </>
              )}

              {editErr && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editErr}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={editSaving}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {editSaving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Total <span className="font-semibold text-zinc-900">{total}</span>, aktif{" "}
            <span className="font-semibold text-zinc-900">{activeCount}</span>.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={openCreate}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Tambah User
          </button>
          <button
            onClick={refresh}
            className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
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

      {/* ── Table ── */}
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
                  <th className="px-3 py-2 w-[220px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 text-zinc-700">{u.id}</td>

                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{u.name}</div>
                      <div className="text-xs text-zinc-500">{u.email}</div>
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
                          u.is_active === 1
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-700"
                        )}
                      >
                        {u.is_active === 1 ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-zinc-600">{fmtDate(u.created_at)}</td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => toggleActive(u)}
                          className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          {u.is_active === 1 ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u.id}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === u.id ? "…" : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Endpoint: <span className="font-mono">GET /api/admin/users</span>,{" "}
          <span className="font-mono">PATCH /api/admin/users/:id</span>,{" "}
          <span className="font-mono">DELETE /api/admin/users/:id</span>.
        </p>
      </div>
    </div>
  );
}
