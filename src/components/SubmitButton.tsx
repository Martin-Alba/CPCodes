"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita y muestra "pendiente" mientras la
// Server Action está en curso (para que el usuario no crea que se colgó).
export default function SubmitButton({
  children,
  pendingText = "Guardando…",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
