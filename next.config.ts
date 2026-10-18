import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen mínima para Docker/Render (ver Dockerfile, target `runner`).
  output: "standalone",
  cacheComponents: true,
  // Sin landing por ahora: el panel (o /ingresar, si no hay sesión) es la entrada.
  async redirects() {
    return [{ source: "/", destination: "/analisis", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
