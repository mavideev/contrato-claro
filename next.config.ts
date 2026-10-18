import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen mínima para Docker/Render (ver Dockerfile, target `runner`).
  output: "standalone",
  cacheComponents: true,
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
