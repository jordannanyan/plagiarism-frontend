import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";

function cn(...s: Array<string | false | null | undefined>) {
    return s.filter(Boolean).join(" ");
}

function Item({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                )
            }
        >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
        </NavLink>
    );
}

function titleFromPath(path: string) {
    if (path === "/dosen") return "Dashboard";
    if (path.startsWith("/dosen/documents")) return "User Documents";
    if (path.startsWith("/dosen/checks")) return "Checks";
    if (path.startsWith("/dosen/verifikasi") || path.startsWith("/dosen/verification")) return "Verification";
    if (path.startsWith("/dosen/profile")) return "Edit Profil";
    return "Dosen";
}

export default function DosenLayout() {
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);

    const title = useMemo(() => titleFromPath(pathname), [pathname]);

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* backdrop mobile */}
            <div
                className={cn(
                    "fixed inset-0 z-30 bg-black/30 transition lg:hidden",
                    open ? "opacity-100" : "pointer-events-none opacity-0"
                )}
                onClick={() => setOpen(false)}
            />

            {/* sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen w-72 border-r bg-white",
                    "transform transition lg:translate-x-0",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 px-4 flex items-center justify-between border-b">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">
                            D
                        </div>
                        <div className="leading-tight">
                            <div className="font-semibold text-zinc-900">Dosen</div>
                            <div className="text-xs text-zinc-500">Plagiarism System</div>
                        </div>
                    </div>

                    <button
                        onClick={() => setOpen(false)}
                        className="lg:hidden rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4">
                    <div className="rounded-2xl border bg-zinc-50 p-4">
                        <div className="text-sm font-semibold text-zinc-900">{user?.name ?? "-"}</div>
                        <div className="mt-0.5 text-xs text-zinc-500">{user?.email ?? "-"}</div>
                        <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-700 border">
                                Role: {user?.role ?? "-"}
                            </div>
                            <Link
                                to="/dosen/profile"
                                className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
                            >
                                Edit Profil
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 space-y-1">
                        <Item to="/dosen" label="Dashboard" icon="🏠" />
                        <Item to="/dosen/documents" label="User Documents" icon="📄" />
                        <Item to="/dosen/checks" label="Checks" icon="✅" />
                        <Item to="/dosen/verifikasi" label="Verification" icon="🧾" />
                    </div>

                    <div className="my-4 h-px bg-zinc-200" />

                    <button
                        onClick={logout}
                        className="w-full rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                        Logout
                    </button>

                    <p className="mt-4 text-xs text-zinc-400">
                        © {new Date().getFullYear()} Plagiarism System
                    </p>
                </div>
            </aside>

            {/* content */}
            <div className="lg:pl-72">
                <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
                    <div className="h-16 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setOpen(true)}
                                className="lg:hidden rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                                ☰
                            </button>

                            <div>
                                <div className="text-sm font-semibold text-zinc-900">{title}</div>
                                <div className="text-xs text-zinc-500">Welcome, {user?.name ?? "-"}</div>
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Signed in as</span>
                            <span className="text-sm font-semibold text-zinc-800">{user?.email ?? "-"}</span>
                        </div>
                    </div>
                </header>

                <main className="p-4">
                    <div className="mx-auto max-w-6xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}