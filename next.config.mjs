/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    // better-sqlite3 es un addon nativo: no se bundlea, se resuelve desde node_modules.
    serverComponentsExternalPackages: ["better-sqlite3"],
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
