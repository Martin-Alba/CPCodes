"use client";

import { useEffect, useRef, useState } from "react";

// Botón que abre una modal de confirmación (en vez del confirm() del navegador)
// y, al confirmar, envía el formulario padre (Server Action).
export default function ConfirmSubmit({
  children,
  message,
  className,
  title = "Confirmar",
  confirmText = "Eliminar",
  pendingText = "Eliminando…",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  title?: string;
  confirmText?: string;
  pendingText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  function onConfirm() {
    const form = btnRef.current?.closest("form");
    if (!form) return;
    setSubmitting(true);
    form.requestSubmit();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={submitting}
      >
        {submitting ? pendingText : children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[2000] grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setOpen(false)}
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
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-elevated disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {submitting ? pendingText : confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
