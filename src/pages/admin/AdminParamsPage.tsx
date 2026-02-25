import { useEffect, useMemo, useState } from "react";
import { activateParams, createParams, getActiveParams, getAllParams, type SysParams } from "../../api/params";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
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

export default function AdminParamsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [active, setActive] = useState<SysParams[]>([]);
  const [all, setAll] = useState<SysParams[]>([]);

  // create form
  const [k, setK] = useState<number>(5);
  const [w, setW] = useState<number>(4);
  const [base, setBase] = useState<number>(101);
  const [threshold, setThreshold] = useState<number>(0.3);
  const [activateAfterCreate, setActivateAfterCreate] = useState(true);

  async function refresh() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);

    const [aRes, allRes] = await Promise.allSettled([getActiveParams(), getAllParams()]);

    if (aRes.status === "fulfilled") setActive(aRes.value);
    if (allRes.status === "fulfilled") setAll(allRes.value);

    // kalau getAllParams gagal (endpoint tidak ada), jangan bikin page error total
    if (aRes.status === "rejected") {
      setErr(aRes.reason?.response?.data?.message ?? "Gagal load active params");
    } else if (allRes.status === "rejected") {
      // optional warning aja
      // setErr("Riwayat params tidak bisa dimuat (endpoint list all tidak tersedia).");
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeOne = active[0] ?? null;

  const totalAll = all.length;

  const historySorted = useMemo(() => {
    const src = all.length ? all : active;
    return [...src].sort((a, b) => b.id - a.id);
  }, [all, active]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (k <= 0 || w <= 0 || base <= 0) return setErr("k, w, base harus > 0");
    if (threshold <= 0 || threshold >= 1) return setErr("threshold harus di antara 0 dan 1 (contoh: 0.3)");

    setSaving(true);
    try {
      await createParams({ k, w, base, threshold, activate: activateAfterCreate });
      setOkMsg("Params berhasil dibuat.");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal create params (cek endpoint POST /api/admin/params)");
    } finally {
      setSaving(false);
    }
  }

  async function onActivate(id: number) {
    setErr(null);
    setOkMsg(null);

    const ok = confirm("Jadikan params ini sebagai ACTIVE?");
    if (!ok) return;

    setSaving(true);
    try {
      await activateParams(id);
      setOkMsg("Params berhasil diaktifkan.");
      await refresh();
    } catch (e: any) {
      setErr(
        e?.response?.data?.message ??
          "Gagal activate params. Cek endpoint PATCH /api/admin/params/:id/activate (atau sesuaikan di api/params.ts)"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">System Parameters</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Konfigurasi parameter algoritma: k (n-gram), w (window), base (hash base), threshold.
          </p>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {okMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Active Params" value={loading ? "…" : active.length} sub={activeOne ? `ID: ${activeOne.id}` : "Belum ada"} />
        <Card title="k (n-gram)" value={loading ? "…" : activeOne?.k ?? "-"} sub="Semakin besar, fingerprint makin spesifik" />
        <Card title="w (window)" value={loading ? "…" : activeOne?.w ?? "-"} sub="Sliding window untuk winnowing" />
        <Card title="threshold" value={loading ? "…" : activeOne?.threshold ?? "-"} sub="Ambang similarity (0..1)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Create */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="font-semibold text-zinc-900">Create New Params</h2>
          <p className="mt-1 text-sm text-zinc-600">Endpoint: <span className="font-mono">POST /api/admin/params</span></p>

          <form onSubmit={onCreate} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">k (n-gram)</label>
              <input
                type="number"
                min={1}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">w (window)</label>
              <input
                type="number"
                min={1}
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">base</label>
              <input
                type="number"
                min={1}
                value={base}
                onChange={(e) => setBase(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <p className="mt-1 text-xs text-zinc-500">Dipakai untuk rolling hash (mis. 101).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">threshold (0..1)</label>
              <input
                type="number"
                min={0.01}
                max={0.99}
                step={0.01}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              <p className="mt-1 text-xs text-zinc-500">Contoh: 0.30 = 30%.</p>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-zinc-700 select-none">
              <input
                type="checkbox"
                checked={activateAfterCreate}
                onChange={(e) => setActivateAfterCreate(e.target.checked)}
                className="h-4 w-4"
              />
              Jadikan langsung aktif setelah dibuat
            </label>

            <button
              disabled={saving}
              className={cn(
                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white",
                saving ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {saving ? "Saving..." : "Create Params"}
            </button>

            <p className="text-xs text-zinc-500">
              Jika create/activate gagal, biasanya karena endpoint backend berbeda. Tinggal sesuaikan di{" "}
              <span className="font-mono">src/api/params.ts</span>.
            </p>
          </form>
        </div>

        {/* Active detail */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-zinc-900">Active Params Detail</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Endpoint: <span className="font-mono">GET /api/admin/params?active=1</span>
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[80px]">ID</th>
                  <th className="px-3 py-2">k</th>
                  <th className="px-3 py-2">w</th>
                  <th className="px-3 py-2">base</th>
                  <th className="px-3 py-2">threshold</th>
                  <th className="px-3 py-2">active_from</th>
                  <th className="px-3 py-2">active_to</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="border-t">
                    <td colSpan={7} className="px-3 py-3 text-zinc-600">
                      Loading...
                    </td>
                  </tr>
                ) : active.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={7} className="px-3 py-3 text-zinc-600">
                      Belum ada params aktif.
                    </td>
                  </tr>
                ) : (
                  active.map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="px-3 py-2 text-zinc-800">{x.id}</td>
                      <td className="px-3 py-2 text-zinc-800">{x.k}</td>
                      <td className="px-3 py-2 text-zinc-800">{x.w}</td>
                      <td className="px-3 py-2 text-zinc-800">{x.base}</td>
                      <td className="px-3 py-2 text-zinc-800">{x.threshold}</td>
                      <td className="px-3 py-2 text-zinc-600">{fmtDate(x.active_from)}</td>
                      <td className="px-3 py-2 text-zinc-600">{x.active_to ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* History */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">History</h3>
              <div className="text-xs text-zinc-500">
                {totalAll ? `${totalAll} rows` : "History mungkin tidak tersedia"}
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 w-[80px]">ID</th>
                    <th className="px-3 py-2">k</th>
                    <th className="px-3 py-2">w</th>
                    <th className="px-3 py-2">base</th>
                    <th className="px-3 py-2">threshold</th>
                    <th className="px-3 py-2 w-[120px]">Status</th>
                    <th className="px-3 py-2 w-[140px]">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="border-t">
                      <td colSpan={7} className="px-3 py-3 text-zinc-600">
                        Loading...
                      </td>
                    </tr>
                  ) : historySorted.length === 0 ? (
                    <tr className="border-t">
                      <td colSpan={7} className="px-3 py-3 text-zinc-600">
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    historySorted.map((x) => {
                      const isActive = x.active_to == null; // asumsi active_to null = aktif
                      return (
                        <tr key={x.id} className="border-t">
                          <td className="px-3 py-2 text-zinc-800">{x.id}</td>
                          <td className="px-3 py-2 text-zinc-800">{x.k}</td>
                          <td className="px-3 py-2 text-zinc-800">{x.w}</td>
                          <td className="px-3 py-2 text-zinc-800">{x.base}</td>
                          <td className="px-3 py-2 text-zinc-800">{x.threshold}</td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                                isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                              )}
                            >
                              {isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => onActivate(x.id)}
                              disabled={saving || isActive}
                              className={cn(
                                "rounded-lg border px-2 py-1 text-xs font-medium",
                                isActive
                                  ? "cursor-not-allowed bg-zinc-50 text-zinc-400"
                                  : "text-zinc-700 hover:bg-zinc-50"
                              )}
                            >
                              Activate
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Jika history tidak muncul, kemungkinan backend tidak menyediakan <span className="font-mono">GET /api/admin/params</span> tanpa filter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}