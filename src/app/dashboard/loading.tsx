// Loader de navegación para todo /dashboard (feedback instantáneo al cambiar de página).
export default function Loading() {
  return (
    <div className="flex items-center gap-2 py-12 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-text" />
      Cargando…
    </div>
  );
}
