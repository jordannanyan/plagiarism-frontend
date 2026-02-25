import { useEffect, useMemo, useState } from "react";
import {
  deleteDocument,
  getDocumentDetail,
  getDocuments,
  submitDocumentText,
  uploadDocument,
  type DocRow,
} from "../../api/documents";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
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

function fmtDate(s?: string) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700">
      {children}
    </span>
  );
}

export default function DosenDocumentsPage() {
  const [items, setItems] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "done" | "queued" | "processing" | "error">("all");
  const [mime, setMime] = useState<"all" | "pdf" | "text" | "docx">("all");

  // upload file
  const [upTitle, setUpTitle] = useState("");
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // submit text
  const [txTitle, setTxTitle] = useState("");
  const [txText, setTxText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // detail modal
  const [detail, setDetail] = useState<DocRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function refresh() {
    setErr(null);
    setOkMsg(null);
    setLoading(true);
    try {
      const rows = await getDocuments();
      setItems(rows);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Gagal mengambil documents (GET /api/documents)");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((d) => {
      if (status !== "all" && String(d.status) !== status) return false;

      if (mime !== "all") {
        const mt = String(d.mime_type || "");
        const ok =
          (mime === "pdf" && mt.includes("pdf")) ||
          (mime === "text" && (mt.includes("text/plain") || mt.includes("text"))) ||
          (mime === "docx" && (mt.includes("officedocument") || mt.includes("docx")));
        if (!ok) return false;
      }

      if (!qq) return true;
      const hay = `${d.title} ${d.id_doc} ${d.owner_user_id} ${d.mime_type}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [items, q, status, mime]);

  const doneCount = useMemo(() => items.filter((x) => x.status === "done").length, [items]);

  async function onOpenDetail(d: DocRow) {
    setErr(null);
    setOkMsg(null);
    setDetailLoading(true);
    setDetail(d);

    try {
      const full = await getDocumentDetail(d.id_doc);
      if (full) setDetail(full);
    } catch {
      // optional, biarkan modal pakai row list saja
    } finally {
      setDetailLoading(false);
    }
  }

  async function onUploadFile(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!upFile) return setErr("File wajib dipilih");
    if (!upTitle.trim()) return setErr("Title wajib diisi");

    setUploading(true);
    try {
      await uploadDocument(upFile, upTitle.trim());
      setOkMsg("Upload berhasil.");
      setUpTitle("");
      setUpFile(null);
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Upload gagal (POST /api/documents/upload)");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmitText(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOkMsg(null);

    if (!txTitle.trim()) return setErr("Title wajib diisi");
    if (!txText.trim()) return setErr("Text wajib diisi");

    setSubmitting(true);
    try {
      await submitDocumentText(txTitle.trim(), txText);
      setOkMsg("Submit text berhasil.");
      setTxTitle("");
      setTxText("");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Submit text gagal (POST /api/documents/text)");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(d: DocRow) {
    setErr(null);
    setOkMsg(null);

    const ok = confirm(`Hapus document #${d.id_doc} "${d.title}"?`);
    if (!ok) return;

    setBusyId(d.id_doc);
    try {
      await deleteDocument(d.id_doc);
      setOkMsg("Document berhasil dihapus.");
      setItems((prev) => prev.filter((x) => x.id_doc !== d.id_doc));
      if (detail?.id_doc === d.id_doc) setDetail(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Delete gagal (DELETE /api/documents/:id)");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">User Documents</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Total <span className="font-semibold text-zinc-900">{items.length}</span>, done{" "}
            <span className="font-semibold text-zinc-900">{doneCount}</span>.
          </p>
        </div>

        <button
          onClick={refresh}
          className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {okMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upload file */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Upload Document</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Endpoint: <span className="font-mono">POST /api/documents/upload</span>
          </p>

          <form onSubmit={onUploadFile} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Title</label>
              <input
                value={upTitle}
                onChange={(e) => setUpTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Contoh: Laporan Proposal Skripsi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">File</label>
              <input
                type="file"
                onChange={(e) => setUpFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-zinc-500">Pastikan mime/size sesuai policy backend.</p>
            </div>

            <button
              disabled={uploading}
              className={cn(
                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white",
                uploading ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
              )}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>

        {/* Submit text */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-zinc-900">Submit Text</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Endpoint: <span className="font-mono">POST /api/documents/text</span>
          </p>

          <form onSubmit={onSubmitText} className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-800">Title</label>
                <input
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Contoh: Bab 1"
                />
              </div>

              <div className="flex items-end justify-end">
                <button
                  disabled={submitting}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold text-white",
                    submitting ? "bg-zinc-400 cursor-not-allowed" : "bg-zinc-900 hover:bg-zinc-800"
                  )}
                >
                  {submitting ? "Submitting..." : "Submit Text"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">Text</label>
              <textarea
                value={txText}
                onChange={(e) => setTxText(e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Tulis teks di sini…"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari title, id doc, owner, mime…"
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

          <div>
            <label className="block text-xs font-semibold text-zinc-600">Type</label>
            <select
              value={mime}
              onChange={(e) => setMime(e.target.value as any)}
              className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
            >
              <option value="all">All</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        {loading ? (
          <div className="text-sm text-zinc-600">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-zinc-600">Tidak ada dokumen yang cocok dengan filter.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 w-[90px]">ID</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2 w-[120px]">Owner</th>
                  <th className="px-3 py-2 w-[180px]">Type</th>
                  <th className="px-3 py-2 w-[110px]">Size</th>
                  <th className="px-3 py-2 w-[110px]">Status</th>
                  <th className="px-3 py-2 w-[200px]">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id_doc} className="border-t">
                    <td className="px-3 py-2 text-zinc-800">{d.id_doc}</td>

                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{d.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge>created: {fmtDate(d.created_at)}</Badge>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-zinc-700">{d.owner_user_id}</td>
                    <td className="px-3 py-2 text-zinc-600">{d.mime_type}</td>
                    <td className="px-3 py-2 text-zinc-700">{formatBytes(d.size_bytes)}</td>

                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                          d.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                        )}
                      >
                        {d.status}
                      </span>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenDetail(d)}
                          className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Detail
                        </button>

                        <button
                          onClick={() => onDelete(d)}
                          disabled={busyId === d.id_doc}
                          className={cn(
                            "rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100",
                            busyId === d.id_doc && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {busyId === d.id_doc ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          Endpoints: <span className="font-mono">GET /api/documents</span>,{" "}
          <span className="font-mono">GET /api/documents/:id</span>,{" "}
          <span className="font-mono">DELETE /api/documents/:id</span>
        </p>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-4">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Document Detail</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Doc #{detail.id_doc} {detailLoading ? "• loading…" : ""}
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Title</div>
                  <div className="mt-1 font-medium text-zinc-900">{detail.title}</div>
                </div>

                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Owner</div>
                  <div className="mt-1 font-medium text-zinc-900">{detail.owner_user_id}</div>
                </div>

                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Mime Type</div>
                  <div className="mt-1 font-mono text-xs text-zinc-900 break-all">{detail.mime_type}</div>
                </div>

                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Size</div>
                  <div className="mt-1 font-medium text-zinc-900">{formatBytes(detail.size_bytes)}</div>
                </div>

                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Status</div>
                  <div className="mt-1 font-medium text-zinc-900">{detail.status}</div>
                </div>

                <div className="rounded-xl border bg-zinc-50 p-3">
                  <div className="text-xs font-semibold text-zinc-600">Created</div>
                  <div className="mt-1 font-medium text-zinc-900">{fmtDate(detail.created_at)}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDetail(null)}
                  className="rounded-xl border px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-zinc-500">
                Note: tombol download/open file belum ada karena backend belum expose URL file.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}