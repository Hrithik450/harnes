import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/**/*': ['./src/lib/agent/skills/**/*'],
  },
};

export default nextConfig;
