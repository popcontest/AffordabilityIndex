import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  trailingSlash: true, // SEO: canonical URLs always end in /
  skipTrailingSlashRedirect: true, // Let middleware handle /api exclusions

  experimental: {
    // Limit workers to avoid database connection exhaustion
    // With max 10 DB connections, use at most 5 workers to leave headroom
    cpus: 5,
  },
};

export default nextConfig;
