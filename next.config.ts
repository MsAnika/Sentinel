import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a minimal, self-contained server bundle
  // (only the files actually needed at runtime) -- required for a lean
  // Docker image that doesn't drag the whole node_modules tree along.
  output: "standalone",
};

export default nextConfig;
