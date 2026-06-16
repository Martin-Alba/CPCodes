import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPCodes — Gestión de almacén y repartidores",
  description: "Plataforma interna para gestionar códigos postales y repartidores.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
