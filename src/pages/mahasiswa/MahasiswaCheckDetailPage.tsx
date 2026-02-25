import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhGetCheck, type CheckMatchRow } from "../../api/mahasiswa";
import { Badge } from "../../components/ui";

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function statusBadge(status: string) {
  if (status === "done") return <Badge variant="success">done</Badge>;
  if (status === "processing") return <Badge variant="warn">processing</Badge>;
  if (status === "failed") return <Badge variant="danger">failed</Badge>;
  return <Badge>{status}</Badge>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Span = { start: number; end: number };

function buildHighlightSpans(matches: CheckMatchRow[], previewLen: number): Span[] {
  // merge spans (limit to previewLen)
  const spans = matches
    .map((m) => ({
      start: clamp(m.doc_span_start, 0, previewLen),
      end: clamp(m.doc_span_end, 0, previewLen),
    }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);

  const merged: Span[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(s);
      continue;
    }
    if (s.start <= last.end) {
      last.end = Math.max(last.end, s.end);
    } else {
      merged.push(s);
    }
  }
  return merged;
}

function renderHighlighted(text: string, spans: Span[]) {
  if (!spans.length) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let cur = 0;

  spans.forEach((s, i) => {
    const a = s.start;
    const b = s.end;
    if (a > cur) {
      parts.push(<span key={`t-${i}-a`}>{text.slice(cur, a)}</span>);
    }
    parts.push(
      <mark
        key={`m-${i}`}
        className="rounded-sm bg-amber-200/70 px-0.5"
      >
        {text.slice(a, b)}
      </mark>
    );
    cur = b;
  });

  if (cur < text.length) {
    parts.push(<span key="tail">{text.slice(cur)}</span>);
  }

  return <>{parts}</>;
}

export default function MahasiswaCheckDetailPage() {
  const { token } = useAuth() as any;
  const { id } = useParams();
  const id_check = Number(id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [check, setCheck] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [matches, setMatches] = useState<CheckMatchRow[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(true);
  const [matchesLimit, setMatchesLimit] = useState(50);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await mhGetCheck({ token, id_check, preview: true });
        if (!alive) return;
        setCheck(res.check);
        setResult(res.result);
        setMatches(res.matches || []);
        setPreview(res.doc_preview_text);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load check");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, id_check]);

  const topMatches = useMemo(
    () => matches.slice(0, matchesLimit),
    [matches, matchesLimit]
  );

  const spans = useMemo(() => {
    const text = preview ?? "";
    return buildHighlightSpans(topMatches, text.length);
  }, [topMatches, preview]);

  if (!Number.isFinite(id_check) || id_check <= 0) {
    return <div className="text-sm text-rose-700">Invalid check id.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/mahasiswa/checks" className="text-sm text-zinc-600 hover:underline">
            ← Back to Checks
          </Link>
          <div className="mt-2 text-lg font-bold text-zinc-900">
            {loading ? "Loading…" : `Check #${id_check}`}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Document:{" "}
            {check?.doc_id ? (
              <Link className="font-semibold text-zinc-900 hover:underline" to={`/mahasiswa/documents/${check.doc_id}`}>
                {check.doc_title}
              </Link>
            ) : (
              "-"
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={check?.doc_id ? `/mahasiswa/checks/new?doc_id=${check.doc_id}` : "/mahasiswa/checks/new"}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            New Check
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Status</div>
          <div className="mt-2">{statusBadge(check?.status ?? "-")}</div>

          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Queued</span>
              <span className="font-semibold">{fmtDate(check?.queued_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Started</span>
              <span className="font-semibold">{fmtDate(check?.started_at)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Finished</span>
              <span className="font-semibold">{fmtDate(check?.finished_at)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Result</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">
            {result?.similarity == null ? "-" : `${result.similarity}%`}
          </div>
          <div className="mt-1 text-sm text-zinc-500">Similarity</div>

          <div className="mt-4 rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-600">
            Summary JSON is stored in <b>check_result.summary_json</b>, you can render it later if needed.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-semibold text-zinc-900">Matches</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">{matches.length}</div>
          <div className="mt-1 text-sm text-zinc-500">Rows in check_match</div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-zinc-700">Highlight limit</div>
            <input
              type="number"
              min={1}
              max={200}
              value={matchesLimit}
              onChange={(e) => setMatchesLimit(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-1 text-xs text-zinc-500">
              We highlight first N matches (helps performance).
            </div>
          </div>
        </div>
      </div>

      {/* Preview + highlight */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Document preview (highlighted)</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {showPreview ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {showPreview ? (
          <div className="p-4">
            <div className="text-xs text-zinc-500 mb-2">
              Preview is first ~8000 chars from server. Highlights are based on match spans.
            </div>
            <div className="rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-800 max-h-[520px] overflow-auto whitespace-pre-wrap break-words">
              {loading ? "Loading…" : preview ? renderHighlighted(preview, spans) : "(no preview)"}
            </div>
          </div>
        ) : null}
      </div>

      {/* Matches table */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">Matches details</div>
          <div className="text-xs text-zinc-500">Ordered by match_score</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Corpus</th>
                <th className="text-left font-semibold px-4 py-3">Score</th>
                <th className="text-left font-semibold px-4 py-3">Doc span</th>
                <th className="text-left font-semibold px-4 py-3">Src span</th>
                <th className="text-left font-semibold px-4 py-3">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : matches.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                    No matches rows, either similarity under threshold or no span inserted.
                  </td>
                </tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id_match} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">
                        {m.corpus_title ?? `Corpus #${m.source_id}`}
                      </div>
                      <div className="text-xs text-zinc-500">
                        source_id: {m.source_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {(Math.round((m.match_score ?? 0) * 10000) / 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {m.doc_span_start}–{m.doc_span_end}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {m.src_span_start}–{m.src_span_end}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{m.snippet_hash}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}