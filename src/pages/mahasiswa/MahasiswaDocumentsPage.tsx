import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  mhDeleteDocument,
  mhListDocuments,
  mhSubmitText,
  mhUploadDocument,
  type UserDocumentRow,
} from "../../api/mahasiswa";
import { Badge, Button, Modal } from "../../components/ui";

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

function statusBadge(status: string) {
  if (status === "done") return <Badge variant="success">done</Badge>;
  if (status === "processing") return <Badge variant="warn">processing</Badge>;
  if (status === "failed") return <Badge variant="danger">failed</Badge>;
  return <Badge>{status}</Badge>;
}

export default function MahasiswaDocumentsPage() {
  const { token } = useAuth() as any;

  const [rows, setRows] = useState<UserDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  const [upTitle, setUpTitle] = useState("");
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upBusy, setUpBusy] = useState(false);

  const [txtTitle, setTxtTitle] = useState("");
  const [txtBody, setTxtBody] = useState("");
  const [txtBusy, setTxtBusy] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const res = await mhListDocuments({ token, limit: 50, offset: 0 });
      setRows(res.rows);
      setTotal(res.total);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const canCreateCheck = useMemo(() => rows.some((r) => r.status === "done"), [rows]);

  async function doUpload() {
    setUpBusy(true);
    setErr(null);
    try {
      if (!upFile) {
        setErr("File is required");
        return;
      }
      await mhUploadDocument({ token, file: upFile, title: upTitle });
      setUploadOpen(false);
      setUpTitle("");
      setUpFile(null);
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUpBusy(false);
    }
  }

  async function doSubmitText() {
    setTxtBusy(true);
    setErr(null);
    try {
      if (!txtBody.trim()) {
        setErr("Text is required");
        return;
      }
      await mhSubmitText({ token, title: txtTitle, text: txtBody });
      setTextOpen(false);
      setTxtTitle("");
      setTxtBody("");
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Submit text failed");
    } finally {
      setTxtBusy(false);
    }
  }

  async function doDelete(id_doc: number) {
    const ok = window.confirm("Delete this document? This cannot be undone.");
    if (!ok) return;

    setErr(null);
    try {
      await mhDeleteDocument({ token, id_doc });
      await reload();
    } catch (e: any) {
      setErr(e?.message ?? "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-bold text-zinc-900">My Documents</div>
          <div className="text-sm text-zinc-500">Upload file or paste text, then run checks.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setTextOpen(true)}>
            + Text
          </Button>
          <Button onClick={() => setUploadOpen(true)}>+ Upload</Button>
          <Link
            to="/mahasiswa/checks"
            className={
              "rounded-xl px-3 py-2 text-sm font-semibold border " +
              (canCreateCheck
                ? "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
                : "bg-zinc-100 text-zinc-400 border-zinc-200 pointer-events-none")
            }
            title={canCreateCheck ? "Go to checks" : "Upload a document first"}
          >
            Go to Checks →
          </Link>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">
            Documents <span className="text-zinc-500 font-normal">({loading ? "…" : total})</span>
          </div>
          <button
            onClick={reload}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Title</th>
                <th className="text-left font-semibold px-4 py-3">Type</th>
                <th className="text-left font-semibold px-4 py-3">Size</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Created</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-zinc-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={6}>
                    No documents yet. Upload a PDF/DOCX/TXT or paste text.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id_doc} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/mahasiswa/documents/${r.id_doc}`}
                        className="font-semibold text-zinc-900 hover:underline"
                      >
                        {r.title}
                      </Link>
                      <div className="text-xs text-zinc-500">ID: {r.id_doc}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{r.mime_type}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatBytes(r.size_bytes)}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-zinc-700">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/mahasiswa/checks/new?doc_id=${r.id_doc}`}
                          className={
                            "rounded-xl px-3 py-2 text-sm font-semibold border " +
                            (r.status === "done"
                              ? "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
                              : "bg-zinc-100 text-zinc-400 border-zinc-200 pointer-events-none")
                          }
                          title={r.status === "done" ? "Create check" : "Document not ready"}
                        >
                          Check
                        </Link>
                        <Button variant="danger" onClick={() => doDelete(r.id_doc)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        open={uploadOpen}
        title="Upload Document"
        onClose={() => (upBusy ? null : setUploadOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setUploadOpen(false)} disabled={upBusy}>
              Cancel
            </Button>
            <Button onClick={doUpload} disabled={upBusy || !upFile}>
              {upBusy ? "Uploading…" : "Upload"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Title (optional)</div>
            <input
              value={upTitle}
              onChange={(e) => setUpTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="e.g. Tugas Akhir - Bab 1"
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">File</div>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setUpFile(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Allowed: PDF/DOCX/TXT
            </div>
          </div>
        </div>
      </Modal>

      {/* Text Modal */}
      <Modal
        open={textOpen}
        title="Submit Text"
        onClose={() => (txtBusy ? null : setTextOpen(false))}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setTextOpen(false)} disabled={txtBusy}>
              Cancel
            </Button>
            <Button onClick={doSubmitText} disabled={txtBusy || !txtBody.trim()}>
              {txtBusy ? "Submitting…" : "Submit"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Title (optional)</div>
            <input
              value={txtTitle}
              onChange={(e) => setTxtTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="e.g. Draft paragraf"
            />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Text</div>
            <textarea
              value={txtBody}
              onChange={(e) => setTxtBody(e.target.value)}
              className="mt-1 w-full min-h-[200px] rounded-xl border px-3 py-2 text-sm"
              placeholder="Paste your text here…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}