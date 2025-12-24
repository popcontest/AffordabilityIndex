import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  trailingSlash: true, // SEO: canonical URLs always end in /
  skipTrailingSlashRedirect: true, // Let middleware handle /api exclusions
};

export default nextConfig;
