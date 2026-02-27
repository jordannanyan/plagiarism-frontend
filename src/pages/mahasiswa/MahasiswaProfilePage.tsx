import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { patchProfile } from "../../api/profile";

export default function MahasiswaProfilePage() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    confirmPassword: "",
    // mahasiswa profile fields (unknown until fetched, start blank)
    nim: "",
    prodi: "",
    angkatan: "",
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErr(null);
    setSuccess(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!form.name.trim() || !form.email.trim()) {
      setErr("Name dan email tidak boleh kosong.");
      return;
    }
    if (form.password && form.password !== form.confirmPassword) {
      setErr("Password baru dan konfirmasi tidak cocok.");
      return;
    }

    setSaving(true);
    setErr(null);
    setSuccess(false);

    try {
      const payload: Parameters<typeof patchProfile>[1] = {};

      if (form.name.trim() !== user.name) payload.name = form.name.trim();
      if (form.email.trim() !== user.email) payload.email = form.email.trim();
      if (form.password) payload.password = form.password;

      const m: NonNullable<typeof payload.mahasiswa> = {};
      if (form.nim.trim()) m.nim = form.nim.trim();
      if (form.prodi.trim()) m.prodi = form.prodi.trim();
      if (form.angkatan.trim()) m.angkatan = Number(form.angkatan);
      if (Object.keys(m).length > 0) payload.mahasiswa = m;

      if (Object.keys(payload).length === 0) {
        setErr("Tidak ada perubahan untuk disimpan.");
        return;
      }

      await patchProfile(user.id, payload);

      updateUser({ name: form.name.trim(), email: form.email.trim() });
      setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
      setSuccess(true);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Edit Profil</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Perbarui informasi akun dan data mahasiswa kamu.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Base account fields */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
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
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">
              Konfirmasi password baru
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="••••••••"
              disabled={!form.password}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50 disabled:text-zinc-400"
            />
          </div>

          {/* Mahasiswa-specific fields */}
          <hr className="border-zinc-100" />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Data Mahasiswa</p>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">NIM</label>
            <input
              value={form.nim}
              onChange={(e) => set("nim", e.target.value)}
              placeholder="Nomor Induk Mahasiswa"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Prodi</label>
            <input
              value={form.prodi}
              onChange={(e) => set("prodi", e.target.value)}
              placeholder="Program studi"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600">Angkatan</label>
            <input
              type="number"
              value={form.angkatan}
              onChange={(e) => set("angkatan", e.target.value)}
              placeholder="Tahun angkatan"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          {/* Feedback */}
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Profil berhasil diperbarui.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
