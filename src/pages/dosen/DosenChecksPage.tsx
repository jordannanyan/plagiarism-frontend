import { useEffect, useMemo, useState } from "react";
import {
  createCheck,
  getCheckDetail,
  getChecksList,
  parseSummaryJson,
  type CheckDetailResponse,
  type CheckRow,
} from "../../api/checks";
import { getDocuments, type DocRow } from "../../api/documents";

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

function SimilarityPill({ value }: { value?: number }) {
  const v = typeof value === "number" ? value : NaN;
  const cls =
    v >= 70 ? "bg-red-50 text-red-700" : v >= 30 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";

  return Number.isFinite(v) ? (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold", cls)}>{v}%</span>
  ) : (
    <span className="text-zinc-500">-</span>
  );
}

function Percent01({ value }: { value?: number }) {
  if (typeof value !== "number") return <span className="text-zinc-500">-</span>;
  return <span className="font-semibold text-zinc-900">{(value * 100).toFixed(2)}%</span>;
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <div className="font-semibold text-zinc-900">{title}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export default function DosenChecksPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);

  // form create check
  const [docId, setDocId] = useState<number | "">("");
  const [maxCandidates, setMaxCandidates] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "done" | "queued" | "processing" | "error">("all");

  // detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<CheckRow | null>(null);
  const [detail, setDetail] = useState<CheckDetailResponse | null>(null);

  const [showPreview, setShowPreview] = useState(false);

  async function refresh() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);

    const [cRes, dRes] = await Promise.allSettled([getChecksList(), getDocuments()]);

    if (cRes.status === "fulfilled") setChecks(cRes.value);
    if (dRes.status === "fulfilled") setDocs(dRes.value);

    if (cRes.status === "rejected" || dRes.status === "rejected") {
      setErr("Sebagian data gagal dimuat. Pastikan backend running dan token valid.");
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return checks.filter((c) => {
      if (status !== "all" && String(c.status) !== status) return false;
      if (!qq) return true;
      const hay = `${c.id_check} ${c.id_doc} ${c.doc_title ?? ""} ${c.status}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [checks, q, status]);

  const docsDone = useMemo(() => docs.filter((d) => d.status === "done").length, [docs]);

  async function onCreateCheck(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (docId === "") return setErr("Pilih doc terlebih dahulu.");
    if (!Number.isFinite(maxCandidates) || maxCandidates <= 0) return setErr("max_candidates harus > 0");

    setSubmitting(true);
    try {
      await createCheck(Number(docId), Number(maxCandidates));
      setOkMsg("Check berhasil dikirim (queued).");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal submit check (POST /api/checks)");
    } finally {
      setSubmitting(false);
    }
  }

  async function onOpenDetail(row: CheckRow) {
    setErr(null);
    setDetailRow(row);
    setDetail(null);
    setShowPreview(false);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const data = await getCheckDetail(row.id_check);
      setDetail(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal ambil detail (GET /api/checks/:id_check)");
    } finally {
      setDetailLoading(false);
    }
  }

  const summary = useMemo(() => {
    return parseSummaryJson(detail?.result?.summary_json ?? null);
  }, [detail]);

  const matchesSorted = useMemo(() => {
    const m = Array.isArray(detail?.matches) ? detail!.matches! : [];
    return [...m].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  }, [detail]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Checks</h1>
          <p className="mt-1 text-sm text-zinc-600">Jalankan pengecekan dokumen dan lihat hasil match corpus.</p>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}
      {okMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </div>
      )}

      {/* Run check */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-900">Run Check</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Endpoint: <span className="font-mono">POST /api/checks</span> • body:{" "}
              <span className="font-mono">{`{ doc_id, max_candidates }`}</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">Docs done tersedia: {docsDone}</p>
          </div>
        </div>

        <form onSubmit={onCreateCheck} className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-800">Document</label>
            <select
              value={docId}
              onChange={(e) => setDocId(e.target.value ? Number(e.target.value) : "")}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="">Pilih doc…</option>
              {docs
                .slice()
                .sort((a, b) => (b.id_doc ?? 0) - (a.id_doc ?? 0))
                .map((d) => (
                  <option key={d.id_doc} value={d.id_doc}>
                    #{d.id_doc} • {d.title} ({d.status})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800">max_candidates</label>
            <input
              value={maxCandidates}
              onChange={(e) => setMaxCandidates(Number(e.target.value))}
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div className="md:flex md:items-end">
            <button
              disabled={submitting}
              className={cn(
                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white",
                submitting ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {submitting ? "Submitting..." : "Submit Check"}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari id_check, doc_id, title, status…"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="all">All</option>
              <option value="done">done</option>
              <option value="queued">queued</option>
              <option value="processing">processing</option>
              <option value="error">error</option>
            </select>
          </div>

          <div className="flex items-end justify-end">
            <span className="text-xs text-zinc-500">
              Total: <span className="font-semibold text-zinc-900">{checks.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-zinc-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-zinc-600">Belum ada checks / tidak ada hasil filter.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[90px]">ID</th>
                  <th className="px-3 py-2">Document</th>
                  <th className="px-3 py-2 w-[110px]">Status</th>
                  <th className="px-3 py-2 w-[120px]">Similarity</th>
                  <th className="px-3 py-2 w-[200px]">Queued</th>
                  <th className="px-3 py-2 w-[140px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => {
                    const ta = new Date(a?.queued_at ?? a?.finished_at ?? 0).getTime();
                    const tb = new Date(b?.queued_at ?? b?.finished_at ?? 0).getTime();
                    return tb - ta;
                  })
                  .map((c) => (
                    <tr key={c.id_check} className="border-t">
                      <td className="px-3 py-2 text-zinc-800">{c.id_check}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-900">{c.doc_title ?? `Doc #${c.id_doc}`}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <Badge>doc_id: {c.id_doc}</Badge>
                          {c.id_result ? <Badge>result: {c.id_result}</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full border bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
                          {c.status ?? "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <SimilarityPill value={typeof c.similarity === "number" ? c.similarity : undefined} />
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{fmtDate(c.queued_at)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => onOpenDetail(c)}
                          className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-5xl rounded-2xl border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Check Detail</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Check #{detailRow.id_check} • Doc #{detailRow.id_doc} {detailRow.doc_title ? `• ${detailRow.doc_title}` : ""}
                </div>
              </div>

              <button
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Top cards */}
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border bg-white p-4">
                  <SectionTitle title="Status" />
                  <div className="mt-2 font-semibold text-zinc-900">{detail?.check?.status ?? detailRow.status}</div>
                  <div className="mt-2 text-xs text-zinc-500">queued: {fmtDate(detail?.check?.queued_at ?? detailRow.queued_at)}</div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <SectionTitle title="Similarity (result)" />
                  <div className="mt-2">
                    <SimilarityPill value={detail?.result?.similarity ?? detailRow.similarity} />
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">result_id: {detail?.result?.id_result ?? detailRow.id_result ?? "-"}</div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <SectionTitle title="Params" sub="Dari summary_json" />
                  <div className="mt-2 text-sm text-zinc-700">
                    k: <span className="font-semibold text-zinc-900">{summary?.params?.k ?? "-"}</span>
                    <br />
                    w: <span className="font-semibold text-zinc-900">{summary?.params?.w ?? "-"}</span>
                    <br />
                    threshold: <span className="font-semibold text-zinc-900">{summary?.params?.threshold ?? "-"}</span>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <SectionTitle title="Best Similarity" sub="Dari summary_json (0..1)" />
                  <div className="mt-2">
                    <Percent01 value={summary?.best_similarity} />
                  </div>
                </div>
              </div>

              {/* Candidates */}
              <div className="rounded-2xl border bg-white p-4">
                <SectionTitle title="Candidates" sub="Dari result.summary_json" />
                {detailLoading ? (
                  <div className="mt-3 text-sm text-zinc-600">Loading...</div>
                ) : !summary?.candidates || summary.candidates.length === 0 ? (
                  <div className="mt-3 text-sm text-zinc-600">Tidak ada candidates.</div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 w-[120px]">id_corpus</th>
                          <th className="px-3 py-2">title</th>
                          <th className="px-3 py-2 w-[140px]">approx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.candidates.map((c, idx) => (
                          <tr key={`${c.id_corpus}-${idx}`} className="border-t">
                            <td className="px-3 py-2 text-zinc-800">{c.id_corpus}</td>
                            <td className="px-3 py-2 text-zinc-800">{c.title ?? "-"}</td>
                            <td className="px-3 py-2 text-zinc-800">
                              <Percent01 value={typeof c.approx === "number" ? c.approx : undefined} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Matches */}
              <div className="rounded-2xl border bg-white p-4">
                <SectionTitle title="Matches" sub="List match dari backend" />
                {detailLoading ? (
                  <div className="mt-3 text-sm text-zinc-600">Loading...</div>
                ) : matchesSorted.length === 0 ? (
                  <div className="mt-3 text-sm text-zinc-600">Tidak ada matches.</div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-xl border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 text-zinc-600">
                        <tr>
                          <th className="px-3 py-2 w-[90px]">id</th>
                          <th className="px-3 py-2">corpus</th>
                          <th className="px-3 py-2 w-[120px]">score</th>
                          <th className="px-3 py-2 w-[220px]">doc span</th>
                          <th className="px-3 py-2 w-[220px]">src span</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchesSorted.map((m) => (
                          <tr key={m.id_match} className="border-t">
                            <td className="px-3 py-2 text-zinc-800">{m.id_match}</td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-zinc-900">{m.corpus_title ?? `Corpus #${m.source_id}`}</div>
                              <div className="mt-1 text-xs text-zinc-500">
                                source_type: <span className="font-mono">{m.source_type}</span>, source_id:{" "}
                                <span className="font-mono">{m.source_id}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-zinc-800">
                              <Percent01 value={typeof m.match_score === "number" ? m.match_score : undefined} />
                            </td>
                            <td className="px-3 py-2 text-zinc-700">
                              {m.doc_span_start} - {m.doc_span_end}
                            </td>
                            <td className="px-3 py-2 text-zinc-700">
                              {m.src_span_start} - {m.src_span_end}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <SectionTitle title="Document Preview Text" sub="doc_preview_text (dipotong di UI)" />
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    {showPreview ? "Hide" : "Show"}
                  </button>
                </div>

                {showPreview ? (
                  <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-800 whitespace-pre-wrap">
                    {detail?.doc_preview_text ?? "-"}
                  </pre>
                ) : (
                  <div className="mt-3 text-sm text-zinc-600">Preview disembunyikan.</div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              {detailLoading ? null : (
                <p className="text-xs text-zinc-500">
                  Endpoint detail: <span className="font-mono">GET /api/checks/:id_check</span>. summary_json diparse dari{" "}
                  <span className="font-mono">result.summary_json</span>.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}