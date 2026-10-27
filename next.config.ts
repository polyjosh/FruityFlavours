import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local dev database) ships WebAssembly; load it from node_modules instead of bundling it.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter", "@node-rs/argon2"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
