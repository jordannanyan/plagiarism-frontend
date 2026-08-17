type MatchLike = {
  source_id: number;
  corpus_title?: string | null;
  match_score: number; // 0..1
};

/** Sumber hasil pengecekan yang dikirim backend lewat summary_json. */
export type DetectedSource = {
  id_corpus: number;
  title: string;
  similarity: number; // 0..1
  above_threshold: boolean;
  estimated?: boolean;
};

type Source = {
  source_id: number;
  title: string;
  percent: number; // 0..100
  above_threshold: boolean;
  estimated: boolean;
};

function pctClass(p: number) {
  return p >= 70
    ? "bg-red-50 text-red-700"
    : p >= 30
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";
}

function toPercent(v: number) {
  return Math.round((v ?? 0) * 10000) / 100;
}

function fromSources(sources: DetectedSource[]): Source[] {
  return sources
    .map((s) => ({
      source_id: s.id_corpus,
      title: s.title || `Corpus #${s.id_corpus}`,
      percent: toPercent(s.similarity),
      above_threshold: Boolean(s.above_threshold),
      estimated: Boolean(s.estimated),
    }))
    .sort((a, b) => b.percent - a.percent);
}

/** Fallback untuk data lama: rekonstruksi sumber dari baris check_match. */
function fromMatches(matches: MatchLike[]): Source[] {
  const map = new Map<number, Source>();
  for (const m of matches) {
    const percent = toPercent(m.match_score);
    const prev = map.get(m.source_id);
    if (!prev || percent > prev.percent) {
      map.set(m.source_id, {
        source_id: m.source_id,
        title: m.corpus_title ?? `Corpus #${m.source_id}`,
        percent,
        above_threshold: true, // check_match hanya dibuat kalau lolos threshold
        estimated: false,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.percent - a.percent);
}

/**
 * Daftar sumber (dokumen corpus) yang terdeteksi mirip dengan dokumen yang dicek,
 * beserta persentase kecocokannya. Mirip panel "Sources" di Turnitin.
 *
 * Sumber di bawah threshold tetap ditampilkan — angka similarity keseluruhan
 * berasal dari sumber tertinggi, jadi menyembunyikannya membuat hasil terlihat
 * seolah muncul entah dari mana.
 */
export function MatchSources({
  sources,
  matches = [],
  threshold,
}: {
  sources?: DetectedSource[];
  matches?: MatchLike[];
  /** threshold 0..1 yang dipakai saat check dijalankan */
  threshold?: number | null;
}) {
  const list = sources?.length ? fromSources(sources) : fromMatches(matches);
  const thresholdPercent = threshold != null ? toPercent(threshold) : null;
  const hasBelowThreshold = list.some((s) => !s.above_threshold);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">Sumber Terdeteksi</div>
        <div className="mt-0.5 text-xs text-zinc-500">
          Dokumen pada corpus yang memiliki kemiripan dengan dokumen ini
          {thresholdPercent != null ? `, diurutkan dari yang tertinggi. Ambang penandaan: ${thresholdPercent}%.` : "."}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-500">
          Tidak ada dokumen corpus yang mirip dengan dokumen ini.
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {list.map((s, i) => (
              <li key={s.source_id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-900">{s.title}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {s.above_threshold
                      ? "Ditandai pada preview dokumen."
                      : thresholdPercent != null
                      ? `Di bawah ambang ${thresholdPercent}% — tidak ditandai pada preview.`
                      : "Di bawah ambang — tidak ditandai pada preview."}
                    {s.estimated ? " Angka merupakan estimasi (data check lama)." : ""}
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${pctClass(
                    s.percent
                  )}`}
                >
                  {s.percent}%
                </span>
              </li>
            ))}
          </ul>

          {hasBelowThreshold && (
            <div className="border-t bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
              Sumber di bawah ambang tetap ditampilkan agar terlihat dari mana angka similarity
              berasal, tetapi bagian yang cocok tidak disorot pada preview dokumen.
            </div>
          )}
        </>
      )}
    </div>
  );
}
