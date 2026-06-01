type MatchLike = {
  source_id: number;
  corpus_title?: string | null;
  match_score: number; // 0..1
};

type Source = {
  source_id: number;
  title: string;
  percent: number; // 0..100
};

function pctClass(p: number) {
  return p >= 70
    ? "bg-red-50 text-red-700"
    : p >= 30
    ? "bg-amber-50 text-amber-700"
    : "bg-emerald-50 text-emerald-700";
}

function buildSources(matches: MatchLike[]): Source[] {
  const map = new Map<number, Source>();
  for (const m of matches) {
    const percent = Math.round((m.match_score ?? 0) * 10000) / 100;
    const prev = map.get(m.source_id);
    if (!prev || percent > prev.percent) {
      map.set(m.source_id, {
        source_id: m.source_id,
        title: m.corpus_title ?? `Corpus #${m.source_id}`,
        percent,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.percent - a.percent);
}

/**
 * Daftar sumber (dokumen corpus) yang terdeteksi mirip dengan dokumen yang dicek,
 * beserta persentase kecocokannya. Mirip panel "Sources" di Turnitin.
 */
export function MatchSources({ matches }: { matches: MatchLike[] }) {
  const sources = buildSources(matches);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold text-zinc-900">Sumber Terdeteksi</div>
        <div className="mt-0.5 text-xs text-zinc-500">
          Dokumen pada corpus yang memiliki kemiripan dengan dokumen ini.
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-500">
          Tidak ada kecocokan dengan dokumen corpus.
        </div>
      ) : (
        <ul className="divide-y">
          {sources.map((s, i) => (
            <li key={s.source_id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900">{s.title}</div>
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
      )}
    </div>
  );
}
