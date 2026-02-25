import { useEffect, useMemo, useState } from "react";
import { getAdminPolicy, updateAdminPolicy, type Policy } from "../../api/policy";

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

function mbToBytes(mb: number) {
  return Math.round(mb * 1024 * 1024);
}

function bytesToMb(bytes: number) {
  return bytes / 1024 / 1024;
}

function normalizeMimeCsv(s: string) {
  return s
    .split(/[,\n]/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(",");
}

export default function AdminPoliciesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [policy, setPolicy] = useState<Policy | null>(null);

  // form state
  const [maxMb, setMaxMb] = useState<number>(20);
  const [allowedMime, setAllowedMime] = useState<string>(
    "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
  );
  const [notes, setNotes] = useState<string>("");

  async function refresh() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const p = await getAdminPolicy();
      setPolicy(p);

      if (p) {
        setMaxMb(Math.max(1, Math.round(bytesToMb(p.max_file_size) * 10) / 10));
        setAllowedMime(p.allowed_mime ?? "");
        setNotes(p.notes ?? "");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal mengambil policy (cek GET /api/admin/policy)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const currentBytes = useMemo(() => mbToBytes(maxMb || 0), [maxMb]);
  const mimeCount = useMemo(() => {
    const s = normalizeMimeCsv(allowedMime || "");
    return s ? s.split(",").length : 0;
  }, [allowedMime]);

  const isDirty = useMemo(() => {
    if (!policy) return true;
    const bytesSame = Number(policy.max_file_size) === Number(currentBytes);
    const mimeSame = normalizeMimeCsv(policy.allowed_mime ?? "") === normalizeMimeCsv(allowedMime ?? "");
    const notesSame = String(policy.notes ?? "") === String(notes ?? "");
    return !(bytesSame && mimeSame && notesSame);
  }, [policy, currentBytes, allowedMime, notes]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!maxMb || maxMb <= 0) return setErr("Max file size harus > 0 MB");
    if (!normalizeMimeCsv(allowedMime)) return setErr("Allowed mime wajib diisi minimal 1 tipe");

    setSaving(true);
    try {
      await updateAdminPolicy({
        max_file_size: currentBytes,
        allowed_mime: normalizeMimeCsv(allowedMime),
        notes: notes?.trim() ? notes.trim() : "",
      });

      setOkMsg("Policy berhasil disimpan.");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal menyimpan policy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Policies</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Atur batas upload dan tipe file yang diizinkan.
          </p>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Summary card */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="font-semibold text-zinc-900">Current Policy</h2>

          {loading ? (
            <div className="mt-3 text-sm text-zinc-600">Loading...</div>
          ) : !policy ? (
            <div className="mt-3 text-sm text-zinc-600">Policy belum tersedia.</div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-600">Max size</span>
                <span className="font-semibold text-zinc-900">{formatBytes(policy.max_file_size)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-600">Allowed mime</span>
                <span className="font-semibold text-zinc-900">{countMime(policy.allowed_mime)}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-zinc-600">Notes</span>
                <span className="text-zinc-800 text-right break-words max-w-[60%]">
                  {policy.notes ? policy.notes : "-"}
                </span>
              </div>

              <div className="pt-2 text-xs text-zinc-500">
                Endpoint: <span className="font-mono">GET /api/admin/policy</span> &{" "}
                <span className="font-mono">PUT /api/admin/policy</span>
              </div>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-zinc-900">Edit Policy</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Gunakan format CSV untuk allowed mime. Contoh:
            <span className="ml-2 font-mono text-xs bg-zinc-100 px-2 py-1 rounded">
              application/pdf,text/plain
            </span>
          </p>

          <form onSubmit={onSave} className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-800">
                  Max file size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={maxMb}
                  onChange={(e) => setMaxMb(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Preview: <span className="font-semibold text-zinc-900">{formatBytes(currentBytes)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-800">
                  Allowed MIME (count)
                </label>
                <div className="mt-1 rounded-xl border bg-zinc-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-zinc-900">{mimeCount}</span>{" "}
                  <span className="text-zinc-600">types</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Dipisah koma atau baris baru.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">Allowed MIME (CSV)</label>
              <textarea
                value={allowedMime}
                onChange={(e) => setAllowedMime(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="application/pdf, text/plain, ..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Catatan perubahan policy..."
              />
            </div>

            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {okMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {okMsg}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                disabled={saving || loading || !isDirty}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                  saving || loading || !isDirty
                    ? "bg-zinc-400 cursor-not-allowed"
                    : "bg-zinc-900 hover:bg-zinc-800"
                )}
              >
                {saving ? "Saving..." : "Save Policy"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!policy) return;
                  setMaxMb(Math.max(1, Math.round(bytesToMb(policy.max_file_size) * 10) / 10));
                  setAllowedMime(policy.allowed_mime ?? "");
                  setNotes(policy.notes ?? "");
                  setErr(null);
                  setOkMsg(null);
                }}
                className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Reset
              </button>

              <div className="ml-auto text-xs text-zinc-500">
                {isDirty ? "Ada perubahan yang belum disimpan." : "Sudah up-to-date."}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function countMime(allowed: any): number {
  if (!allowed) return 0;
  const s = String(allowed);
  return s
    .split(/[,\n]/g)
    .map((x) => x.trim())
    .filter(Boolean).length;
}