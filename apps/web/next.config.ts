import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  trailingSlash: true, // SEO: canonical URLs always end in /
  skipTrailingSlashRedirect: true, // Let middleware handle /api exclusions
  webpack: (config) => {
    // Fix for Tailwind CSS with Next.js - ensure CSS is only processed server-side
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        'tailwindcss': 'tailwindcss',
      });
    }
    return config;
  },
};

export default nextConfig;
