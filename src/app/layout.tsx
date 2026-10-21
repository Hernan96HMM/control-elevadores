import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control de autoelevadores · SICA",
  description: "Control diario pre-uso de autoelevadores (F-068 Rev.2)",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icono.svg", apple: "/icono-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#23272C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
