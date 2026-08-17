import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nim, setNim] = useState("");
  const [prodi, setProdi] = useState("");
  const [angkatan, setAngkatan] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (password.length < 6) {
      setErr("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Password dan konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        nim: nim.trim() || undefined,
        prodi: prodi.trim() || undefined,
        angkatan: angkatan.trim() ? Number(angkatan) : undefined,
      });
      // backend langsung mengembalikan token -> auto login
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Registrasi gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Daftar Mahasiswa
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Buat akun untuk mulai memeriksa dokumen
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Nama Lengkap
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              placeholder="Nama lengkap"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="email@example.com"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </div>

          {/* NIM */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              NIM <span className="font-normal text-zinc-400">(opsional)</span>
            </label>
            <input
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              type="text"
              placeholder="Nomor Induk Mahasiswa"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </div>

          {/* Prodi + Angkatan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Prodi <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                value={prodi}
                onChange={(e) => setProdi(e.target.value)}
                type="text"
                placeholder="Program studi"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Angkatan <span className="font-normal text-zinc-400">(opsional)</span>
              </label>
              <input
                value={angkatan}
                onChange={(e) => setAngkatan(e.target.value)}
                type="number"
                placeholder="2024"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              placeholder="Minimal 6 karakter"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Konfirmasi Password
            </label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
            />
          </div>

          {/* Error */}
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* Button */}
          <button
            disabled={loading}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition ${
              loading
                ? "bg-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            {loading ? "Loading..." : "Daftar"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-zinc-600">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-zinc-900 hover:underline">
            Masuk di sini
          </Link>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} Plagiarism Detection System
        </div>
      </div>
    </div>
  );
}
