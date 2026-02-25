import { useEffect, useMemo, useState } from "react";
import { deleteCorpus, getCorpus, patchCorpus, uploadCorpus } from "../../api/corpus";
import type { CorpusItem } from "../../types/corpus";

function cn(...s: Array<string | false | null | undefined>) {
    return s.filter(Boolean).join(" ");
}

export default function AdminCorpusPage() {
    const [items, setItems] = useState<CorpusItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const activeCount = useMemo(() => items.filter((x) => x.is_active === 1).length, [items]);

    async function refresh() {
        setErr(null);
        setLoading(true);
        try {
            const data = await getCorpus();
            setItems(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Gagal mengambil corpus (cek endpoint GET /api/corpus)");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function onUpload(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!file) return setErr("File wajib dipilih");
        if (!title.trim()) return setErr("Title wajib diisi");

        setUploading(true);
        try {
            // Sesuai dokumen: form-data file + title, POST /api/corpus/upload :contentReference[oaicite:7]{index=7}
            await uploadCorpus(file, title.trim());
            setTitle("");
            setFile(null);
            await refresh();
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Upload gagal");
        } finally {
            setUploading(false);
        }
    }

    async function onToggleActive(it: CorpusItem) {
        setErr(null);
        const next: 0 | 1 = it.is_active === 1 ? 0 : 1;
        try {
            // Sesuai dokumen: PATCH /api/corpus/:id { title, is_active } :contentReference[oaicite:8]{index=8}
            await patchCorpus(it.id, { is_active: next });
            setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, is_active: next } : x)));
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Gagal update is_active");
        }
    }

    async function onEditTitle(it: CorpusItem, newTitle: string) {
        setErr(null);
        const t = newTitle.trim();
        if (!t) return;

        try {
            await patchCorpus(it.id, { title: t });
            setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, title: t } : x)));
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Gagal update title");
        }
    }

    async function onDelete(it: CorpusItem) {
        setErr(null);
        const ok = confirm(`Hapus corpus "${it.title}"?`);
        if (!ok) return;

        try {
            await deleteCorpus(it.id);
            setItems((prev) => prev.filter((x) => x.id !== it.id));
        } catch (e: any) {
            setErr(e?.response?.data?.message ?? "Gagal delete corpus");
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-zinc-900">Corpus</h1>
                <p className="text-sm text-zinc-600">
                    Upload corpus untuk jadi kandidat pembanding saat pengecekan plagiarism.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Upload card */}
                <div className="lg:col-span-1 rounded-2xl border bg-white p-5 shadow-sm">
                    <h2 className="font-semibold text-zinc-900">Upload Corpus</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                        Endpoint: <span className="font-mono">POST /api/corpus/upload</span> (file + title)
                    </p>

                    <form onSubmit={onUpload} className="mt-4 space-y-3">
                        <div>
                            <label className="text-sm font-medium text-zinc-800">Title</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                                placeholder="Contoh: Skripsi TI 2024 - Batch 1"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-zinc-800">File</label>
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
                            />
                            <p className="mt-1 text-xs text-zinc-500">
                                Pastikan sesuai policy mime/size backend.
                            </p>
                        </div>

                        {err && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {err}
                            </div>
                        )}

                        <button
                            disabled={uploading}
                            className={cn(
                                "w-full rounded-xl px-4 py-2 text-sm font-semibold text-white",
                                uploading ? "bg-zinc-400" : "bg-zinc-900 hover:bg-zinc-800"
                            )}
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </form>
                </div>

                {/* List card */}
                <div className="lg:col-span-2 rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-semibold text-zinc-900">Daftar Corpus</h2>
                            <p className="mt-1 text-sm text-zinc-600">
                                Active: <span className="font-semibold text-zinc-900">{activeCount}</span> dari{" "}
                                <span className="font-semibold text-zinc-900">{items.length}</span>
                            </p>
                        </div>
                        <button
                            onClick={refresh}
                            className="rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="mt-4">
                        {loading ? (
                            <div className="text-sm text-zinc-600">Loading...</div>
                        ) : items.length === 0 ? (
                            <div className="text-sm text-zinc-600">
                                Belum ada corpus. Upload dulu di panel kiri.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-50 text-zinc-600">
                                        <tr>
                                            <th className="px-3 py-2 w-[70px]">ID</th>
                                            <th className="px-3 py-2">Title</th>
                                            <th className="px-3 py-2 w-[120px]">Status</th>
                                            <th className="px-3 py-2 w-[170px]">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it) => (
                                            <Row
                                                key={it.id}
                                                item={it}
                                                onToggle={() => onToggleActive(it)}
                                                onDelete={() => onDelete(it)}
                                                onEditTitle={(t) => onEditTitle(it, t)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                        PATCH contoh payload di dokumentasi:
                        <span className="ml-1 font-mono bg-zinc-100 px-2 py-1 rounded">
                            {`{ title, is_active }`}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

function Row({
    item,
    onToggle,
    onDelete,
    onEditTitle,
}: {
    item: CorpusItem;
    onToggle: () => void;
    onDelete: () => void;
    onEditTitle: (newTitle: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [temp, setTemp] = useState(item.title);

    useEffect(() => setTemp(item.title), [item.title]);

    return (
        <tr className="border-t">
            <td className="px-3 py-2 text-zinc-700">{item.id}</td>

            <td className="px-3 py-2">
                {!editing ? (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900">{item.title}</span>
                        <button
                            onClick={() => setEditing(true)}
                            className="text-xs rounded-lg border px-2 py-1 text-zinc-700 hover:bg-zinc-50"
                        >
                            Edit
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <input
                            value={temp}
                            onChange={(e) => setTemp(e.target.value)}
                            className="w-full rounded-lg border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                        <button
                            onClick={() => {
                                onEditTitle(temp);
                                setEditing(false);
                            }}
                            className="text-xs rounded-lg bg-zinc-900 px-2 py-1 text-white hover:bg-zinc-800"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => {
                                setTemp(item.title);
                                setEditing(false);
                            }}
                            className="text-xs rounded-lg border px-2 py-1 text-zinc-700 hover:bg-zinc-50"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </td>

            <td className="px-3 py-2">
                <span
                    className={cn(
                        "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold",
                        item.is_active === 1 ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"
                    )}
                >
                    {item.is_active === 1 ? "ACTIVE" : "INACTIVE"}
                </span>
            </td>

            <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggle}
                        className="rounded-lg border px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                        Toggle
                    </button>
                    <button
                        onClick={onDelete}
                        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}