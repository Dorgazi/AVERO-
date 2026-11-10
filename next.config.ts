import type { NextConfig } from "next";

// Classic dynamic rendering: every storefront page reads live stock + signed
// image URLs, and admin pages read the session cookie.
const nextConfig: NextConfig = {
  // Build output lives in a ".nosync" folder so iCloud Desktop sync ignores it
  // (iCloud otherwise creates "file 2" conflict copies that break the dev server).
  // Test builds use their own folder so they never clobber a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next.nosync",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
