import { useEffect, useMemo, useState } from "react";
import {
  getDosenCheckedDocs,
  getDosenPendingDocs,
  type DosenCheckedDocRow,
  type DosenPendingDocRow,
} from "../../api/dosen";

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

export default function DosenHomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // dokumen mahasiswa yang menargetkan dosen ini (pending + checked)
  const [pendingDocs, setPendingDocs] = useState<DosenPendingDocRow[]>([]);
  const [checkedDocs, setCheckedDocs] = useState<DosenCheckedDocRow[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);

    const [pRes, kRes] = await Promise.allSettled([
      getDosenPendingDocs({ limit: 200, offset: 0 }),
      getDosenCheckedDocs({ limit: 200, offset: 0 }),
    ]);

    if (pRes.status === "fulfilled") setPendingDocs(pRes.value.rows);
    else setPendingDocs([]);

    if (kRes.status === "fulfilled") setCheckedDocs(kRes.value.rows);
    else setCheckedDocs([]);

    if (pRes.status === "rejected" || kRes.status === "rejected") {
      setErr("Data verifikasi gagal dimuat. Pastikan backend running dan token valid.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // counts verifikasi — hanya dokumen yang menargetkan dosen ini
  const verPendingCount = pendingDocs.length;
  const verDoneCount = checkedDocs.length;
  const verNeedRevisionCount = useMemo(
    () => checkedDocs.filter((r) => r.verification_status === "perlu_revisi").length,
    [checkedDocs]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Ringkasan verifikasi dokumen mahasiswa.</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Verification Pending"
          value={loading ? "…" : verPendingCount}
          sub={loading ? null : `${verNeedRevisionCount} perlu revisi`}
        />
        <Card title="Verification Done" value={loading ? "…" : verDoneCount} sub="Sudah diberi status" />
      </div>
    </div>
  );
}
