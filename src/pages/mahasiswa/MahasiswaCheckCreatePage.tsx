import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhCreateCheck, mhListDocuments, type UserDocumentRow } from "../../api/mahasiswa";
import { getDosenList, type DosenListRow } from "../../api/dosen";
import { Button, Badge } from "../../components/ui";

export default function MahasiswaCheckCreatePage() {
  const { token } = useAuth() as any;
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const doc_id_from_q = Number(sp.get("doc_id") || "");
  const [docs, setDocs] = useState<UserDocumentRow[]>([]);
  const [docId, setDocId] = useState<number>(Number.isFinite(doc_id_from_q) ? doc_id_from_q : 0);

  const [dosenList, setDosenList] = useState<DosenListRow[]>([]);
  const [targetDosen, setTargetDosen] = useState<number[]>([]);
  const [dosenSearch, setDosenSearch] = useState("");

  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingDosen, setLoadingDosen] = useState(true);
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

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDosen(true);
      try {
        const rows = await getDosenList();
        if (alive) setDosenList(rows);
      } catch {
        // silent — biarkan kosong, mahasiswa bisa skip multi-select
      } finally {
        if (alive) setLoadingDosen(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => docs.find((d) => d.id_doc === docId) ?? null, [docs, docId]);
  const canRun = selected?.status === "done";

  const filteredDosen = useMemo(() => {
    const q = dosenSearch.trim().toLowerCase();
    if (!q) return dosenList;
    return dosenList.filter(
      (d) =>
        d.nama.toLowerCase().includes(q) ||
        (d.nidn ?? "").toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q)
    );
  }, [dosenList, dosenSearch]);

  function toggleDosen(id: number) {
    setTargetDosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function run() {
    if (!canRun) return;
    if (targetDosen.length === 0) {
      const confirmAll = confirm(
        "Anda belum memilih dosen tujuan. Lanjutkan? Jika lanjut, dokumen ini terlihat oleh semua dosen."
      );
      if (!confirmAll) return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await mhCreateCheck({
        token,
        doc_id: docId,
        target_dosen: targetDosen.length > 0 ? targetDosen : undefined,
      });
      nav(`/mahasiswa/checks/${res.check_id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create check");
    } finally {
      setBusy(false);
    }
  }

  const selectedDosenNames = useMemo(
    () =>
      targetDosen
        .map((id) => dosenList.find((d) => d.id_dosen === id)?.nama)
        .filter(Boolean) as string[],
    [targetDosen, dosenList]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/mahasiswa/checks" className="text-sm text-zinc-600 hover:underline">
            ← Back to Checks
          </Link>
          <div className="mt-2 text-lg font-bold text-zinc-900">Create Check</div>
          <div className="text-sm text-zinc-500">Pilih dokumen, tentukan dosen tujuan, lalu jalankan pengecekan.</div>
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
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">
              Tujuan Dosen{" "}
              <span className="font-normal text-zinc-500">
                ({targetDosen.length} dipilih)
              </span>
            </div>
            {targetDosen.length > 0 ? (
              <button
                type="button"
                onClick={() => setTargetDosen([])}
                className="text-xs text-zinc-500 hover:text-zinc-900 underline"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            Pilih satu atau lebih dosen yang memberi tugas. Jika kosong, dokumen akan terlihat oleh semua dosen.
          </div>

          <input
            value={dosenSearch}
            onChange={(e) => setDosenSearch(e.target.value)}
            placeholder="Cari nama / NIDN / email dosen..."
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            disabled={loadingDosen}
          />

          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border">
            {loadingDosen ? (
              <div className="p-3 text-sm text-zinc-500">Loading dosen…</div>
            ) : filteredDosen.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">Tidak ada dosen ditemukan.</div>
            ) : (
              <ul className="divide-y">
                {filteredDosen.map((d) => {
                  const checked = targetDosen.includes(d.id_dosen);
                  return (
                    <li key={d.id_dosen}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-zinc-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDosen(d.id_dosen)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-zinc-900">{d.nama}</div>
                          <div className="text-xs text-zinc-500">
                            NIDN: {d.nidn ?? "-"} • {d.email}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedDosenNames.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedDosenNames.map((nama, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-1 text-xs font-medium text-white"
                >
                  {nama}
                </span>
              ))}
            </div>
          ) : null}
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
