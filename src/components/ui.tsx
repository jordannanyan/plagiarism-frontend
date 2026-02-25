import React from "react";

export function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warn" | "danger";
}) {
  const cls =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : variant === "warn"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : variant === "danger"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-zinc-50 text-zinc-700 border-zinc-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
        cls
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition border";
  const cls =
    variant === "primary"
      ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
      : variant === "secondary"
      ? "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
      : variant === "danger"
      ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
      : "bg-transparent text-zinc-700 border-transparent hover:bg-zinc-100";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, cls, disabled && "opacity-60 cursor-not-allowed", className)}
    >
      {children}
    </button>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto w-[min(720px,calc(100%-2rem))]">
        <div className="rounded-2xl border bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
            <button
              onClick={onClose}
              className="rounded-lg border px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
          {footer ? <div className="border-t p-4">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}