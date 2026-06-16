"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

// Botón que abre una modal de confirmación y, al confirmar, envía el
// formulario padre (Server Action).
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

      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmText={confirmText}
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
        busy={submitting}
        danger
      />
    </>
  );
}
