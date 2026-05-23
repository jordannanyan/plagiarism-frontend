import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhGetCheck, type CheckMatchRow, type ExcludedRange } from "../../api/mahasiswa";
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

type Span = { start: number; end: number; kind: "match" | "excluded" };

function buildHighlightSpans(matches: CheckMatchRow[], previewLen: number): Span[] {
  // merge spans (limit to previewLen)
  const spans = matches
    .map((m) => ({
      start: clamp(m.doc_span_start, 0, previewLen),
      end: clamp(m.doc_span_end, 0, previewLen),
      kind: "match" as const,
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

function mergeSpans(matchSpans: Span[], excludedRanges: ExcludedRange[], textLen: number): Span[] {
  const ex: Span[] = (excludedRanges ?? [])
    .map((r) => ({
      start: clamp(r.start, 0, textLen),
      end: clamp(r.end, 0, textLen),
      kind: "excluded" as const,
    }))
    .filter((s) => s.end > s.start);

  // excluded > match: jika overlap, area excluded menang
  const all = [...matchSpans, ...ex].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (!last || s.start >= last.end) {
      out.push({ ...s });
      continue;
    }
    // overlap: prioritaskan excluded
    if (last.kind === s.kind) {
      last.end = Math.max(last.end, s.end);
    } else if (s.kind === "excluded") {
      // potong match yg overlap
      if (s.start <= last.start) {
        last.start = Math.min(last.start, s.start);
        last.kind = "excluded";
        last.end = Math.max(last.end, s.end);
      } else {
        // truncate last match dan push excluded
        const oldEnd = last.end;
        last.end = s.start;
        out.push({ start: s.start, end: Math.max(s.end, oldEnd), kind: "excluded" });
      }
    } else {
      // s is match, last is excluded → skip area excluded
      if (s.end <= last.end) continue;
      out.push({ start: last.end, end: s.end, kind: "match" });
    }
  }
  return out;
}

function renderHighlighted(text: string, spans: Span[]) {
  if (!spans.length) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let cur = 0;

  spans.forEach((s, i) => {
    const a = clamp(s.start, 0, text.length);
    const b = clamp(s.end, 0, text.length);
    if (b <= a) return;
    if (a > cur) {
      parts.push(<span key={`t-${i}-a`}>{text.slice(cur, a)}</span>);
    }
    if (s.kind === "match") {
      parts.push(
        <mark key={`m-${i}`} className="rounded-sm bg-amber-200/70 px-0.5">
          {text.slice(a, b)}
        </mark>
      );
    } else {
      parts.push(
        <span
          key={`x-${i}`}
          className="rounded-sm bg-zinc-200/70 text-zinc-500 line-through decoration-zinc-400/60 px-0.5"
          title="Bagian ini tidak ikut dicek oleh sistem"
        >
          {text.slice(a, b)}
        </span>
      );
    }
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
  const [excludedRanges, setExcludedRanges] = useState<ExcludedRange[]>([]);

  const [showPreview, setShowPreview] = useState(true);
  const matchesLimit = 50;

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
        setExcludedRanges(res.excluded_ranges ?? []);
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
    const matchSpans = buildHighlightSpans(topMatches, text.length);
    return mergeSpans(matchSpans, excludedRanges, text.length);
  }, [topMatches, preview, excludedRanges]);

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

      <div className="grid gap-3 md:grid-cols-2">
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
          <div className="text-sm font-semibold text-zinc-900">Hasil Pengecekan</div>
          <div className="mt-2 text-3xl font-bold text-zinc-900">
            {result?.similarity == null ? "-" : `${result.similarity}%`}
          </div>
          <div className="mt-1 text-sm text-zinc-500">Similarity</div>

          {result?.similarity != null && (
            (() => {
              const sim = Number(result.similarity);
              const STANDARD = 30;
              const over = sim > STANDARD;
              return (
                <div
                  className={
                    over
                      ? "mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                      : "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
                  }
                >
                  {over
                    ? `Tingkat plagiarisme pada artikel Anda melebihi batas standar yang ditetapkan (${STANDARD}%). Disarankan untuk melakukan revisi.`
                    : `Tingkat plagiarisme pada artikel Anda berada di bawah batas standar (${STANDARD}%). Artikel dinyatakan memenuhi kriteria orisinalitas.`}
                </div>
              );
            })()
          )}
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
            <div className="text-xs text-zinc-500 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Seluruh isi dokumen ditampilkan. Highlight kuning = bagian yang cocok dengan corpus.</span>
            </div>
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Bagian <b>Nama Penulis</b>, <b>Nama Universitas</b>, dan <b>Daftar Pustaka</b> tidak ikut
              dicek oleh sistem (ditandai abu-abu dengan coret).
              {excludedRanges.length > 0 && (
                <span className="ml-1">
                  Sistem mendeteksi {excludedRanges.length} bagian yang dilewati: {" "}
                  {excludedRanges.map((r, i) => (
                    <span key={i} className="font-medium">
                      {r.reason}
                      {i < excludedRanges.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  .
                </span>
              )}
            </div>
            <div className="rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-800 whitespace-pre-wrap break-words">
              {loading ? "Loading…" : preview ? renderHighlighted(preview, spans) : "(no preview)"}
            </div>
          </div>
        ) : null}
      </div>

    </div>
  );
}