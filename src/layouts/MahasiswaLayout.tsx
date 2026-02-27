import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMyInbox } from "../api/verification";

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function SidebarItem({
  to,
  label,
  icon,
  badge,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-zinc-900 text-white shadow-sm"
            : "text-zinc-700 hover:bg-zinc-100"
        )
      }
    >
      <span className="text-base">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white min-w-[18px] text-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </NavLink>
  );
}

function getTitle(pathname: string) {
  if (pathname === "/mahasiswa") return "Dashboard";
  if (pathname.startsWith("/mahasiswa/documents")) return "My Documents";
  if (pathname.startsWith("/mahasiswa/checks")) return "My Checks";
  if (pathname.startsWith("/mahasiswa/inbox")) return "Inbox Verifikasi";
  if (pathname.startsWith("/mahasiswa/profile")) return "Edit Profil";
  return "Mahasiswa";
}

export default function MahasiswaLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);

  const pageTitle = useMemo(() => getTitle(pathname), [pathname]);

  useEffect(() => {
    getMyInbox({ limit: 100, offset: 0 })
      .then((res) => {
        try {
          const raw = localStorage.getItem("mhs_inbox_read");
          const readIds = new Set<number>(raw ? (JSON.parse(raw) as number[]) : []);
          setInboxCount(res.rows.filter((r) => !readIds.has(r.id_result)).length);
        } catch {
          setInboxCount(res.total);
        }
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/30 transition lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-72 border-r bg-white",
          "transform transition lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b">
          <Link to="/mahasiswa" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">
              M
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-zinc-900">Mahasiswa</div>
              <div className="text-xs text-zinc-500">Plagiarism System</div>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* User card */}
          <div className="rounded-2xl border bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-900">
              {user?.name ?? "-"}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {user?.email ?? "-"}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center rounded-full bg-white px-2 py-1 text-xs font-semibold text-zinc-700 border">
                Role: {user?.role ?? "-"}
              </div>
              <Link
                to="/mahasiswa/profile"
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                Edit Profil
              </Link>
            </div>
          </div>

          {/* Nav */}
          <div className="mt-4 space-y-1">
            <SidebarItem to="/mahasiswa" label="Dashboard" icon="🏠" />
            <SidebarItem
              to="/mahasiswa/documents"
              label="My Documents"
              icon="📄"
            />
            <SidebarItem to="/mahasiswa/checks" label="My Checks" icon="✅" />
            <SidebarItem to="/mahasiswa/inbox" label="Inbox Verifikasi" icon="📬" badge={inboxCount} />
          </div>

          {/* Divider */}
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

      {/* Main area */}
      <div className="lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
          <div className="h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden rounded-xl border px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                aria-label="Open sidebar"
              >
                ☰
              </button>

              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  {pageTitle}
                </div>
                <div className="text-xs text-zinc-500">
                  Welcome back, {user?.name ?? "-"}
                </div>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block rounded-xl border bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {user?.email ?? "-"}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}