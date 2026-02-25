import { useEffect, useMemo, useState } from "react";
import { dosenGetChecks, dosenGetDocuments, type DosenCheckRow, type DosenDocRow } from "../../api/dosen";
import { getVerificationResults, type VerificationResultRow, type VerificationStatus } from "../../api/verification";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

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

function VerificationPill({ status }: { status: VerificationStatus | "pending" | "none" }) {
  const cls =
    status === "plagiarisme"
      ? "bg-red-50 text-red-700"
      : status === "perlu_revisi"
      ? "bg-amber-50 text-amber-700"
      : status === "wajar"
      ? "bg-emerald-50 text-emerald-700"
      : status === "pending"
      ? "bg-zinc-100 text-zinc-700"
      : "bg-zinc-50 text-zinc-500";

  const label =
    status === "none" ? "—" : status === "pending" ? "PENDING" : String(status).toUpperCase().replace("_", " ");

  return <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold", cls)}>{label}</span>;
}

type LatestVerByResultId = Record<
  number,
  {
    verification_status: VerificationStatus | null; // null => pending
    note_text: string | null;
    note_created_at: string | null;
  }
>;

function buildLatestVerByResult(rows: VerificationResultRow[]): LatestVerByResultId {
  // result_id unique, tapi kalau ada duplikat, pilih note terbaru
  const map: LatestVerByResultId = {};
  for (const r of rows) {
    const rid = Number(r.id_result);
    if (!Number.isFinite(rid)) continue;

    const prev = map[rid];
    const tPrev = prev?.note_created_at ? new Date(prev.note_created_at).getTime() : -1;
    const tCur = r.note_created_at ? new Date(r.note_created_at).getTime() : -1;

    if (!prev || tCur >= tPrev) {
      map[rid] = {
        verification_status: r.verification_status ?? null,
        note_text: r.note_text ?? null,
        note_created_at: r.note_created_at ?? null,
      };
    }
  }
  return map;
}

export default function DosenHomePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DosenDocRow[]>([]);
  const [checks, setChecks] = useState<DosenCheckRow[]>([]);

  // ✅ NEW: verification results (pending + done)
  const [verRows, setVerRows] = useState<VerificationResultRow[]>([]);
  const verByResultId = useMemo(() => buildLatestVerByResult(verRows), [verRows]);

  async function load() {
    setErr(null);
    setLoading(true);

    const [dRes, cRes, vRes] = await Promise.allSettled([
      dosenGetDocuments(),
      dosenGetChecks(),
      getVerificationResults({ limit: 200, offset: 0 }), // endpoint baru: /api/verification/results
    ]);

    if (dRes.status === "fulfilled") setDocuments(Array.isArray(dRes.value) ? dRes.value : []);
    if (cRes.status === "fulfilled") setChecks(Array.isArray(cRes.value) ? cRes.value : []);

    if (vRes.status === "fulfilled") {
      const rows = Array.isArray(vRes.value?.rows) ? vRes.value.rows : [];
      setVerRows(rows);
    } else {
      // kalau endpoint verifikasi belum ada, jangan bikin dashboard crash
      setVerRows([]);
    }

    if (dRes.status === "rejected" || cRes.status === "rejected") {
      setErr("Sebagian data gagal dimuat. Pastikan backend running dan token valid.");
    } else if (vRes.status === "rejected") {
      setErr("Documents & Checks berhasil, tapi data verifikasi gagal dimuat. Pastikan endpoint /api/verification/results tersedia.");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const docsDone = useMemo(() => documents.filter((d) => d.status === "done").length, [documents]);
  const totalSize = useMemo(() => documents.reduce((a, x) => a + (Number(x.size_bytes) || 0), 0), [documents]);

  const highSimilarityCount = useMemo(() => {
    // similarity di API kamu 0..100
    return checks.filter((c) => (Number(c.similarity) || 0) >= 30).length;
  }, [checks]);

  const recentChecks = useMemo(() => {
    return [...checks]
      .sort((a, b) => {
        const ta = new Date(a?.queued_at ?? a?.finished_at ?? 0).getTime();
        const tb = new Date(b?.queued_at ?? b?.finished_at ?? 0).getTime();
        return tb - ta;
      })
      .slice(0, 5);
  }, [checks]);

  const recentDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 5);
  }, [documents]);

  // ✅ NEW counts verification
  const verPendingCount = useMemo(() => {
    // pending = ada result tapi belum ada note (verification_status null)
    return verRows.filter((r) => r.verification_status == null).length;
  }, [verRows]);

  const verDoneCount = useMemo(() => {
    return verRows.filter((r) => r.verification_status != null).length;
  }, [verRows]);

  const verNeedRevisionCount = useMemo(() => {
    return verRows.filter((r) => r.verification_status === "perlu_revisi").length;
  }, [verRows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Ringkasan dokumen, hasil pengecekan, dan verifikasi dosen.</p>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card title="Total Documents" value={loading ? "…" : documents.length} sub={loading ? null : `${docsDone} done`} />
        <Card title="Total Doc Size" value={loading ? "…" : formatBytes(totalSize)} sub="Akumulasi size_bytes" />
        <Card title="Total Checks" value={loading ? "…" : checks.length} sub="Riwayat pengecekan" />
        <Card
          title="High Similarity (≥ 30%)"
          value={loading ? "…" : highSimilarityCount}
          sub="Indikasi kemiripan tinggi"
        />

        {/* ✅ NEW */}
        <Card
          title="Verification Pending"
          value={loading ? "…" : verPendingCount}
          sub={loading ? null : `${verNeedRevisionCount} perlu revisi`}
        />
        <Card title="Verification Done" value={loading ? "…" : verDoneCount} sub="Sudah diberi status" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Checks */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Recent Checks</h2>
          <p className="mt-1 text-sm text-zinc-600">5 pengecekan terbaru dari endpoint checks.</p>

          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[80px]">ID</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2 w-[120px]">Status</th>
                  <th className="px-3 py-2 w-[130px]">Similarity</th>

                  {/* ✅ NEW */}
                  <th className="px-3 py-2 w-[150px]">Verification</th>

                  <th className="px-3 py-2 w-[180px]">Queued</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="border-t">
                    <td colSpan={6} className="px-3 py-3 text-zinc-600">
                      Loading...
                    </td>
                  </tr>
                ) : recentChecks.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={6} className="px-3 py-3 text-zinc-600">
                      Belum ada data checks.
                    </td>
                  </tr>
                ) : (
                  recentChecks.map((x) => {
                    const sim = Number(x.similarity);
                    const badge =
                      sim >= 70
                        ? "bg-red-50 text-red-700"
                        : sim >= 30
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700";

                    const vr = x.id_result ? verByResultId[Number(x.id_result)] : undefined;
                    const verState: VerificationStatus | "pending" | "none" =
                      !x.id_result ? "none" : !vr ? "pending" : vr.verification_status ? vr.verification_status : "pending";

                    return (
                      <tr key={x.id_check} className="border-t">
                        <td className="px-3 py-2 text-zinc-800">{x.id_check}</td>
                        <td className="px-3 py-2 text-zinc-800">{x.doc_title ?? `Doc #${x.id_doc}`}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center rounded-full border bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                            {x.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {Number.isFinite(sim) ? (
                            <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold", badge)}>
                              {sim}%
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>

                        {/* ✅ NEW */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <VerificationPill status={verState} />
                            {vr?.note_text ? (
                              <div className="text-xs text-zinc-500 line-clamp-2">{vr.note_text}</div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-zinc-600">{fmtDate(x.queued_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Endpoints: <span className="font-mono">GET /api/checks</span>,{" "}
            <span className="font-mono">GET /api/verification/results</span>
          </p>
        </div>

        {/* Recent Documents */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Recent Documents</h2>
          <p className="mt-1 text-sm text-zinc-600">5 dokumen terbaru.</p>

          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[80px]">ID</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2 w-[140px]">Type</th>
                  <th className="px-3 py-2 w-[120px]">Size</th>
                  <th className="px-3 py-2 w-[140px]">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="border-t">
                    <td colSpan={5} className="px-3 py-3 text-zinc-600">
                      Loading...
                    </td>
                  </tr>
                ) : recentDocs.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={5} className="px-3 py-3 text-zinc-600">
                      Belum ada dokumen.
                    </td>
                  </tr>
                ) : (
                  recentDocs.map((d) => (
                    <tr key={d.id_doc} className="border-t">
                      <td className="px-3 py-2 text-zinc-800">{d.id_doc}</td>
                      <td className="px-3 py-2 text-zinc-800">{d.title}</td>
                      <td className="px-3 py-2 text-zinc-600">{d.mime_type}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatBytes(d.size_bytes)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                            d.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                          )}
                        >
                          {d.status ?? "-"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Endpoint: <span className="font-mono">GET /api/documents</span>
          </p>
        </div>
      </div>
    </div>
  );
}