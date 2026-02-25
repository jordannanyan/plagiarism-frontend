import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhCreateCheck, mhListDocuments, type UserDocumentRow } from "../../api/mahasiswa";
import { Button, Badge } from "../../components/ui";

export default function MahasiswaCheckCreatePage() {
  const { token } = useAuth() as any;
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const doc_id_from_q = Number(sp.get("doc_id") || "");
  const [docs, setDocs] = useState<UserDocumentRow[]>([]);
  const [docId, setDocId] = useState<number>(Number.isFinite(doc_id_from_q) ? doc_id_from_q : 0);
  const [maxCandidates, setMaxCandidates] = useState<number>(10);

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDocs(true);
      setErr(null);
      try {
        const res = await mhListDocuments({ token, limit: 200, offset: 0 });
        if (!alive) return;
        setDocs(res.rows);
        // default to first done doc if docId invalid
        if (!docId || !res.rows.some((d) => d.id_doc === docId)) {
          const firstDone = res.rows.find((d) => d.status === "done");
          if (firstDone) setDocId(firstDone.id_doc);
        }
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Failed to load documents");
      } finally {
        if (alive) setLoadingDocs(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const selected = useMemo(() => docs.find((d) => d.id_doc === docId) ?? null, [docs, docId]);
  const canRun = selected?.status === "done";

  async function run() {
    if (!canRun) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await mhCreateCheck({ token, doc_id: docId, max_candidates: maxCandidates });
      nav(`/mahasiswa/checks/${res.check_id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create check");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/mahasiswa/checks" className="text-sm text-zinc-600 hover:underline">
            ← Back to Checks
          </Link>
          <div className="mt-2 text-lg font-bold text-zinc-900">Create Check</div>
          <div className="text-sm text-zinc-500">Pick a document and run plagiarism check.</div>
        </div>
        <Link
          to="/mahasiswa/documents"
          className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Manage Documents →
        </Link>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-4 space-y-4">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Document</div>
          <select
            value={docId || ""}
            onChange={(e) => setDocId(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
            disabled={loadingDocs}
          >
            <option value="" disabled>
              {loadingDocs ? "Loading…" : "Select document"}
            </option>
            {docs.map((d) => (
              <option key={d.id_doc} value={d.id_doc}>
                {d.title} (#{d.id_doc}) [{d.status}]
              </option>
            ))}
          </select>

          {selected ? (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={selected.status === "done" ? "success" : selected.status === "failed" ? "danger" : "warn"}>
                {selected.status}
              </Badge>
              <span className="text-xs text-zinc-500">mime: {selected.mime_type}</span>
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-sm font-semibold text-zinc-900">Max candidates (LSH)</div>
          <input
            type="number"
            min={1}
            max={50}
            value={maxCandidates}
            onChange={(e) => setMaxCandidates(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          />
          <div className="mt-1 text-xs text-zinc-500">Server will cap at 50.</div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={() => nav(-1)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} disabled={!canRun || busy}>
            {busy ? "Running…" : "Run Check"}
          </Button>
        </div>

        {!canRun && selected ? (
          <div className="rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-600">
            Document status must be <b>done</b> before checking.
          </div>
        ) : null}
      </div>
    </div>
  );
}