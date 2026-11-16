import type { NextConfig } from "next";

const DJANGO_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  /* config options here */
  skipTrailingSlashRedirect: true,
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
  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${DJANGO_API_URL}/api/:path*/`,
      },
      {
        source: "/api/:path*",
        destination: `${DJANGO_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
