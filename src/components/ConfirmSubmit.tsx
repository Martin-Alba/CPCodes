"use client";

import { useFormStatus } from "react-dom";

// Botón de envío con confirmación nativa + estado "pendiente" (mínimo JS).
export default function ConfirmSubmit({
  children,
  message,
  className,
  pendingText = "Eliminando…",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      onClick={(e) => {
        if (!pending && !confirm(message)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
