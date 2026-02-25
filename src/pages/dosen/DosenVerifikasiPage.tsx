import { useEffect, useMemo, useState } from "react";
import {
  getVerificationResults,
  upsertVerificationNote,
  type VerificationResultRow,
  type VerificationStatus,
} from "../../api/verification";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function fmtDate(s?: string | null) {
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

function StatusPill({ value }: { value: VerificationStatus }) {
  const cls =
    value === "plagiarisme"
      ? "bg-red-50 text-red-700"
      : value === "perlu_revisi"
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold", cls)}>{value}</span>;
}

export default function DosenVerificationPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [minSim, setMinSim] = useState<number>(0);
  const [rows, setRows] = useState<VerificationResultRow[]>([]);
  const [total, setTotal] = useState(0);

  const pendingRows = useMemo(() => rows.filter((r) => !r.id_note), [rows]);
  const doneRows = useMemo(() => rows.filter((r) => Boolean(r.id_note)), [rows]);

  const [selectedResultId, setSelectedResultId] = useState<number | "">("");
  const selected = useMemo(
    () => rows.find((r) => r.id_result === selectedResultId) ?? null,
    [rows, selectedResultId]
  );

  // form
  const [status, setStatus] = useState<VerificationStatus>("perlu_revisi");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const res = await getVerificationResults({
        limit: 100,
        offset: 0,
        min_similarity: minSim > 0 ? minSim : undefined,
      });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal load results (GET /api/verification/results)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPick(v: string) {
    const id = v ? Number(v) : "";
    setSelectedResultId(id);

    const picked = rows.find((r) => r.id_result === id);
    if (!picked) {
      setNoteText("");
      setStatus("perlu_revisi");
      return;
    }

    // prefill dari note terakhir kalau sudah diverifikasi
    setStatus(picked.verification_status ?? "perlu_revisi");
    setNoteText(picked.note_text ?? "");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (selectedResultId === "" || !selected) return setErr("Pilih dokumen dulu.");
    if (!noteText.trim() && status !== "wajar") return setErr("Catatan wajib diisi untuk status selain 'wajar'.");

    setSaving(true);
    try {
      await upsertVerificationNote(selected.id_result, {
        status,
        note_text: noteText.trim(),
      });
      setOkMsg("Berhasil disimpan.");
      await load(); // refresh supaya item pindah dari pending -> selesai
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? `Gagal POST /api/verification/${selected.id_result}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Verification</h1>
          <p className="mt-1 text-sm text-zinc-600">Dropdown menampilkan pending dan yang sudah selesai.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Endpoint: <span className="font-mono">GET /api/verification/results</span> • total:{" "}
            <span className="font-semibold text-zinc-900">{total}</span>
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
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}
      {okMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{okMsg}</div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="text-sm text-zinc-600">
            Pending: <b className="text-zinc-900">{pendingRows.length}</b> • Selesai:{" "}
            <b className="text-zinc-900">{doneRows.length}</b>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-600">min_similarity (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minSim}
                onChange={(e) => setMinSim(Number(e.target.value))}
                className="mt-1 w-[140px] rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <button
              onClick={load}
              className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-600">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-zinc-600">Belum ada data.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* dropdown */}
            <div className="lg:col-span-1 rounded-2xl border bg-zinc-50 p-4">
              <label className="block text-sm font-semibold text-zinc-900">Pilih dokumen</label>
              <select
                value={selectedResultId === "" ? "" : String(selectedResultId)}
                onChange={(e) => onPick(e.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="">-- Pilih --</option>

                <optgroup label={`Pending (${pendingRows.length})`}>
                  {pendingRows.map((r) => (
                    <option key={r.id_result} value={String(r.id_result)}>
                      {r.doc_title} • {r.requester_name} • {r.similarity}%
                    </option>
                  ))}
                </optgroup>

                <optgroup label={`Selesai (${doneRows.length})`}>
                  {doneRows.map((r) => (
                    <option key={r.id_result} value={String(r.id_result)}>
                      {r.doc_title} • {r.requester_name} • {r.similarity}% • {r.verification_status}
                    </option>
                  ))}
                </optgroup>
              </select>

              <p className="mt-2 text-xs text-zinc-600">
                Pending dan selesai digabung, user tidak perlu tahu id.
              </p>
            </div>

            {/* detail + form */}
            <div className="lg:col-span-2 space-y-4">
              {!selected ? (
                <div className="rounded-2xl border p-6 text-sm text-zinc-600">Pilih dokumen dari dropdown.</div>
              ) : (
                <>
                  <div className="rounded-2xl border bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{selected.doc_title}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          requester: {selected.requester_name} ({selected.requester_email})
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          finished: {fmtDate(selected.finished_at)} • result: {fmtDate(selected.result_created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <SimilarityPill value={selected.similarity} />
                        {selected.verification_status ? <StatusPill value={selected.verification_status} /> : null}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border bg-zinc-50 p-3">
                      <div className="text-xs font-semibold text-zinc-700">Catatan terakhir</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {selected.id_note
                          ? `${selected.verifier_name ?? "-"} (${selected.verifier_nidn ?? "-"}) • ${fmtDate(selected.note_created_at)}`
                          : "Belum ada verifikasi"}
                      </div>
                      <div className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap">
                        {selected.note_text ? selected.note_text : "—"}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-5 space-y-3">
                    <div className="text-sm font-semibold text-zinc-900">
                      {selected.id_note ? "Update Verifikasi" : "Buat Verifikasi"}
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-800">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as VerificationStatus)}
                          className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                        >
                          <option value="wajar">wajar</option>
                          <option value="perlu_revisi">perlu_revisi</option>
                          <option value="plagiarisme">plagiarisme</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-zinc-800">Catatan</label>
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          rows={5}
                          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                          placeholder="Tulis catatan verifikasi..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setStatus(selected.verification_status ?? "perlu_revisi");
                          setNoteText(selected.note_text ?? "");
                        }}
                        className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Reset
                      </button>

                      <button
                        disabled={saving}
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                          saving ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                        )}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}