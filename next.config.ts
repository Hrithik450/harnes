import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    '/api/**': ['./src/lib/agent/skills/**/*'],
    '/api/**/*': ['./src/lib/agent/skills/**/*'],
  },
};

export default nextConfig;
