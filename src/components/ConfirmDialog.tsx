"use client";

import { useEffect } from "react";

// Modal de confirmación reutilizable (sustituye al confirm() del navegador).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  busy = false,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-elevated disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-500"
                : "bg-primary text-primary-fg hover:opacity-90"
            }`}
          >
            {busy ? "…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
