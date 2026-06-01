import React from "react";

type MatchSpan = { doc_span_start: number; doc_span_end: number };
type ExcludedRange = { start: number; end: number; reason: string };

type Span = { start: number; end: number; kind: "match" | "excluded" };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildMatchSpans(matches: MatchSpan[], textLen: number, limit: number): Span[] {
  const spans = matches
    .slice(0, limit)
    .map((m) => ({
      start: clamp(m.doc_span_start, 0, textLen),
      end: clamp(m.doc_span_end, 0, textLen),
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

  const all = [...matchSpans, ...ex].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (!last || s.start >= last.end) {
      out.push({ ...s });
      continue;
    }
    if (last.kind === s.kind) {
      last.end = Math.max(last.end, s.end);
    } else if (s.kind === "excluded") {
      if (s.start <= last.start) {
        last.start = Math.min(last.start, s.start);
        last.kind = "excluded";
        last.end = Math.max(last.end, s.end);
      } else {
        const oldEnd = last.end;
        last.end = s.start;
        out.push({ start: s.start, end: Math.max(s.end, oldEnd), kind: "excluded" });
      }
    } else {
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

export function DocumentPreview({
  text,
  matches,
  excludedRanges,
  matchLimit = 50,
  maxHeight,
  excludeMode = true,
}: {
  text: string | null;
  matches: MatchSpan[];
  excludedRanges: ExcludedRange[];
  matchLimit?: number;
  /** opsional, contoh "max-h-[420px] overflow-auto" */
  maxHeight?: string;
  /** true = mode kecualikan metadata; false = semua teks dicek */
  excludeMode?: boolean;
}) {
  const textLen = text?.length ?? 0;
  const matchSpans = buildMatchSpans(matches, textLen, matchLimit);
  const spans = mergeSpans(matchSpans, excludedRanges, textLen);

  return (
    <div>
      <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Highlight kuning = bagian yang cocok dengan corpus.
        {excludeMode ? (
          <> Bagian abu-abu bercoret = tidak ikut dicek (Nama Penulis / Nama Universitas / Daftar Pustaka).</>
        ) : (
          <> Mode: <b>semua teks dicek</b> — seluruh isi dokumen ikut dihitung.</>
        )}
      </div>
      <div
        className={[
          "rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-800 whitespace-pre-wrap break-words",
          maxHeight ?? "",
        ].join(" ")}
      >
        {text ? renderHighlighted(text, spans) : "(no preview)"}
      </div>
    </div>
  );
}
