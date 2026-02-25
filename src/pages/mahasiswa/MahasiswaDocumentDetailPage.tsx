import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { mhCreateCheck, mhGetDocument } from "../../api/mahasiswa";
import { Badge, Button } from "../../components/ui";

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

export default function MahasiswaDocumentDetailPage() {
  const { token } = useAuth() as any;
  const { id } = useParams();
  const nav = useNavigate();

  const id_doc = Number(id);
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [busyCheck, setBusyCheck] = useState(false);
  const canCheck = useMemo(() => doc?.status === "done", [doc]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await mhGetDocument({ token, id_doc, preview: true, max_chars: 8000 });
        if (!alive) return;
        setDoc(res.document);
        setPreview(res.preview_text);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load document");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, id_doc]);

  async function runCheck() {
    if (!canCheck) return;
    setBusyCheck(true);
    setErr(null);
    try {
      const res = await mhCreateCheck({ token, doc_id: id_doc, max_candidates: 10 });
      nav(`/mahasiswa/checks/${res.check_id}`);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create check");
    } finally {
      setBusyCheck(false);
    }
  }

  if (!Number.isFinite(id_doc) || id_doc <= 0) {
    return <div className="text-sm text-rose-700">Invalid document id.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/mahasiswa/documents" className="text-sm text-zinc-600 hover:underline">
            ← Back to Documents
          </Link>
          <div className="mt-2 text-lg font-bold text-zinc-900">
            {loading ? "Loading…" : doc?.title ?? "-"}
          </div>
          <div className="mt-1 text-sm text-zinc-500">Document ID: {id_doc}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => nav(`/mahasiswa/checks/new?doc_id=${id_doc}`)} disabled={!canCheck}>
            New Check
          </Button>
          <Button onClick={runCheck} disabled={!canCheck || busyCheck}>
            {busyCheck ? "Checking…" : "Run Check Now"}
          </Button>
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 md:col-span-1">
          <div className="text-sm font-semibold text-zinc-900">Meta</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Type</span>
              <span className="font-semibold">{doc?.mime_type ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Size</span>
              <span className="font-semibold">{formatBytes(doc?.size_bytes)}</span>
            </div>
            <div className="flex justify-between gap-3 items-center">
              <span className="text-zinc-500">Status</span>
              <Badge variant={doc?.status === "done" ? "success" : doc?.status === "failed" ? "danger" : "warn"}>
                {doc?.status ?? "-"}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-zinc-500">Created</span>
              <span className="font-semibold">{fmtDate(doc?.created_at)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-600">
            Preview text is taken from extracted text file (path_text) on server.
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-900">Preview</div>
            <div className="text-xs text-zinc-500">First ~8000 chars</div>
          </div>

          <div className="mt-3">
            <pre className="whitespace-pre-wrap break-words rounded-xl border bg-zinc-50 p-3 text-xs text-zinc-800 max-h-[520px] overflow-auto">
              {loading ? "Loading…" : preview ?? "(no preview)"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}