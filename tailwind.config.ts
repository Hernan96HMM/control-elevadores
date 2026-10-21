import type { Config } from "tailwindcss";

// Paleta de señalética de planta (ISO 7010 / IRAM 10005).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        amarillo: { DEFAULT: "#F2B705", oscuro: "#C99500", claro: "#FFF4C2" },
        verde: { DEFAULT: "#0B7A3E", claro: "#DDF2E5" },
        rojo: { DEFAULT: "#C8102E", claro: "#FBE3E6" },
        asfalto: { DEFAULT: "#23272C", 700: "#353A41", 500: "#5B626B", 300: "#9AA1A9" },
        hormigon: { DEFAULT: "#E7E9EC", claro: "#F4F5F7" },
        naranja: { DEFAULT: "#D9620B", claro: "#FDEBDD" },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        cartel: ['"Barlow Condensed"', "Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
