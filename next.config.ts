import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite abrir el dev server desde otros dispositivos de tu red local (p. ej.
  // tu móvil) para que funcione el hot-reload. Solo afecta a `next dev`; en
  // producción (Vercel) no aplica. Cambia/añade IPs si tu móvil tiene otra.
  allowedDevOrigins: ["192.168.1.45"],
};

export default nextConfig;
