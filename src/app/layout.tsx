import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CPCodes — Gestión de almacén y repartidores",
  description: "Plataforma interna para gestionar códigos postales y repartidores.",
};

// Fija el tema antes de pintar (sin parpadeo). Por defecto oscuro, salvo que el
// usuario haya elegido claro explícitamente.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
