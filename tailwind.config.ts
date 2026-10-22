import type { Config } from "tailwindcss";

// Tokens de diseño SICA. Los valores viven como CSS variables (canales RGB) en
// src/app/globals.css: única fuente de verdad. Acá solo se exponen a Tailwind.
const v = (nombre: string) => `rgb(var(--${nombre}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sica: {
          navy: v("sica-navy"),
          "navy-900": v("sica-navy-900"),
          "navy-100": v("sica-navy-100"),
          "navy-50": v("sica-navy-50"),
          cyan: v("sica-cyan"),
          "cyan-700": v("sica-cyan-700"),
          "cyan-50": v("sica-cyan-50"),
        },
        tinta: { DEFAULT: v("tinta"), 2: v("tinta-2"), 3: v("tinta-3") },
        linea: v("linea"),
        fondo: v("fondo"),
        superficie: v("superficie"),
        ok: { DEFAULT: v("ok"), bg: v("ok-bg") },
        obs: { DEFAULT: v("obs"), bg: v("obs-bg"), acento: v("obs-acento") },
        fs: { DEFAULT: v("fs"), bg: v("fs-bg") },
        sin: { DEFAULT: v("sin"), bg: v("sin-bg") },
      },
      fontFamily: {
        sans: ['"Titillium Web"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "10px",
        xl: "12px",
      },
      boxShadow: {
        tarjeta: "0 1px 2px rgb(var(--sica-navy) / 0.06), 0 2px 8px rgb(var(--sica-navy) / 0.06)",
        flotante: "0 -4px 16px rgb(var(--sica-navy) / 0.12)",
      },
      minHeight: { toque: "56px" },
    },
  },
  plugins: [],
};

export default config;
