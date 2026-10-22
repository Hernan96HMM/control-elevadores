import type { Metadata, Viewport } from "next";
// Titillium Web autoalojada (sin Google Fonts ni CDN): solo los pesos usados, con font-display: swap.
import "@fontsource/titillium-web/400.css";
import "@fontsource/titillium-web/600.css";
import "@fontsource/titillium-web/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control diario de autoelevadores · SICA",
  description: "Control diario pre-uso de autoelevadores (F-068 Rev.2) · SICA Metalúrgica Argentina",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#21396E", // Azul SICA (token --sica-navy); metadata no admite CSS variables
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
